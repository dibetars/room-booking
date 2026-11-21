import { getSetting, setSetting } from '@/lib/supabase';
import { withCache, invalidate } from '@/lib/server-cache';

const FX_CACHE_KEY = 'fx:usd-ghs:v1';
const FX_CACHE_TTL = 60 * 60 * 1000; // 1 hour in-memory cache
const FX_SETTINGS_KEY = 'fx_usd_ghs_history';
export const FX_ADMIN_OVERRIDE_KEY = 'fx_admin_override';
export const FX_WEEKLY_REPORT_KEY = 'fx_weekly_report_last';
const FALLBACK_RATE = Number(process.env.GHS_PER_USD ?? process.env.NEXT_PUBLIC_GHS_PER_USD ?? '11.5');
const MARKUP_WHEN_BELOW_30D = 0.10; // +10% when spot drops below 30-day historical average

// 30-day fixed rate lock (Nov 9, 2026 -> Dec 9, 2026) at 11.5 GHS/USD
const FIXED_OVERRIDE_RATE = 11.5;
const FIXED_OVERRIDE_UNTIL = '2026-12-09';

export interface AdminFxOverride {
  rate: number;
  note?: string;
  updatedAt: string;
}

export interface ExchangeRateInfo {
  base: 'USD';
  quote: 'GHS';
  spotRate: number;
  historical30dAvg: number;
  droppedBelowHistorical: boolean;
  markupPct: number;
  /** Rate actually charged to guests (admin override wins when set). */
  effectiveRate: number;
  /** Automated rate before any admin override (fixed lock / live+markup / fallback). */
  automatedRate: number;
  sampleCount: number;
  updatedAt: string;
  source: 'admin_override' | 'fixed_30d' | 'live' | 'fallback';
  fixedUntil?: string;
  adminOverride: AdminFxOverride | null;
}

interface StoredFxHistory {
  /** YYYY-MM-DD -> USD/GHS rate */
  dailyRates: Record<string, number>;
  lastSpotRate?: number;
  updatedAt?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function ymdDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch current live USD -> GHS spot rate from public FX APIs. */
async function fetchLiveSpotUsdToGhs(): Promise<number | null> {
  // Primary: open.er-api.com
  const primary = (await fetchJsonWithTimeout('https://open.er-api.com/v6/latest/USD')) as
    | { rates?: Record<string, number> }
    | null;
  const r1 = primary?.rates?.GHS;
  if (typeof r1 === 'number' && r1 > 0) return r1;

  // Secondary: jsdelivr currency-api
  const secondary = (await fetchJsonWithTimeout(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
  )) as { usd?: Record<string, number> } | null;
  const r2 = secondary?.usd?.ghs;
  if (typeof r2 === 'number' && r2 > 0) return r2;

  return null;
}

/** Fetch a single historical date's USD -> GHS rate (used to seed 30-day window). */
async function fetchHistoricalUsdToGhs(dateStr: string): Promise<number | null> {
  const data = (await fetchJsonWithTimeout(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`,
    3500
  )) as { usd?: Record<string, number> } | null;
  const rate = data?.usd?.ghs;
  return typeof rate === 'number' && rate > 0 ? rate : null;
}

/**
 * Maintain up to 35 days of daily USD->GHS rates in Supabase `app_settings`.
 * Seeds sample points across the last 30 days if the table has fewer than 6 days stored.
 */
async function loadAndUpdateHistory(spotRate: number): Promise<Record<string, number>> {
  const today = ymdDaysAgo(0);
  const cutoff = ymdDaysAgo(35);

  const stored = await getSetting<StoredFxHistory>(FX_SETTINGS_KEY, { dailyRates: {} });
  const dailyRates: Record<string, number> = { ...(stored?.dailyRates ?? {}) };

  // Prune entries older than 35 days
  for (const d of Object.keys(dailyRates)) {
    if (d < cutoff) delete dailyRates[d];
  }

  // Seed 30-day sample points (every 3 days over the past 30 days) if history is sparse
  const recentKeys = Object.keys(dailyRates).filter((d) => d >= ymdDaysAgo(30));
  if (recentKeys.length < 6) {
    const sampleOffsets = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    const results = await Promise.all(
      sampleOffsets.map(async (offset) => {
        const dateStr = ymdDaysAgo(offset);
        if (dailyRates[dateStr]) return { dateStr, rate: dailyRates[dateStr] };
        const rate = await fetchHistoricalUsdToGhs(dateStr);
        return { dateStr, rate };
      })
    );
    for (const { dateStr, rate } of results) {
      if (typeof rate === 'number' && rate > 0) {
        dailyRates[dateStr] = round2(rate);
      }
    }
  }

  const prevToday = dailyRates[today];
  dailyRates[today] = round2(spotRate);

  // Save back to Supabase if today's entry is new or changed
  if (prevToday !== dailyRates[today] || recentKeys.length < 6) {
    try {
      await setSetting(FX_SETTINGS_KEY, {
        dailyRates,
        lastSpotRate: round2(spotRate),
        updatedAt: new Date().toISOString(),
      } satisfies StoredFxHistory);
    } catch {
      // Non-fatal if Supabase app_settings isn't reachable
    }
  }

  return dailyRates;
}

export async function getAdminFxOverride(): Promise<AdminFxOverride | null> {
  const raw = await getSetting<AdminFxOverride | null>(FX_ADMIN_OVERRIDE_KEY, null);
  if (!raw || typeof raw !== 'object') return null;
  const rate = Number((raw as AdminFxOverride).rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate: round2(rate),
    note: typeof (raw as AdminFxOverride).note === 'string' ? (raw as AdminFxOverride).note : undefined,
    updatedAt: (raw as AdminFxOverride).updatedAt || new Date().toISOString(),
  };
}

/** Set or clear the admin FX override. Pass null to clear and resume automation. */
export async function setAdminFxOverride(
  rate: number | null,
  note?: string
): Promise<AdminFxOverride | null> {
  if (rate == null) {
    await setSetting(FX_ADMIN_OVERRIDE_KEY, null);
    invalidate('fx:');
    return null;
  }
  if (!Number.isFinite(rate) || rate < 1 || rate > 100) {
    throw new Error('Override rate must be between 1 and 100 GHS per USD');
  }
  const override: AdminFxOverride = {
    rate: round2(rate),
    note: note?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  await setSetting(FX_ADMIN_OVERRIDE_KEY, override);
  invalidate('fx:');
  return override;
}

function applyAdminOverride(
  base: Omit<ExchangeRateInfo, 'effectiveRate' | 'source' | 'adminOverride' | 'automatedRate'> & {
    source: Exclude<ExchangeRateInfo['source'], 'admin_override'>;
    automatedRate: number;
  },
  adminOverride: AdminFxOverride | null
): ExchangeRateInfo {
  if (adminOverride) {
    return {
      ...base,
      automatedRate: base.automatedRate,
      effectiveRate: adminOverride.rate,
      source: 'admin_override',
      adminOverride,
    };
  }
  return {
    ...base,
    effectiveRate: base.automatedRate,
    adminOverride: null,
  };
}

/**
 * Returns full exchange rate details.
 * Live FX history is always updated. Effective charged rate priority:
 * 1. Admin override (if set)
 * 2. Fixed 30-day lock (while active)
 * 3. Live spot + optional +10% when below 30-day average
 */
export async function getExchangeRateInfo(): Promise<ExchangeRateInfo> {
  return withCache(FX_CACHE_KEY, FX_CACHE_TTL, async () => {
    const today = ymdDaysAgo(0);
    const isFixedWindowActive = today <= FIXED_OVERRIDE_UNTIL;
    const [liveSpot, adminOverride] = await Promise.all([
      fetchLiveSpotUsdToGhs(),
      getAdminFxOverride(),
    ]);

    if (!liveSpot) {
      const automatedRate = isFixedWindowActive ? FIXED_OVERRIDE_RATE : round2(FALLBACK_RATE);
      return applyAdminOverride(
        {
          base: 'USD',
          quote: 'GHS',
          spotRate: automatedRate,
          historical30dAvg: automatedRate,
          droppedBelowHistorical: false,
          markupPct: 0,
          automatedRate,
          sampleCount: 0,
          updatedAt: new Date().toISOString(),
          source: isFixedWindowActive ? 'fixed_30d' : 'fallback',
          fixedUntil: isFixedWindowActive ? FIXED_OVERRIDE_UNTIL : undefined,
        },
        adminOverride
      );
    }

    const dailyRates = await loadAndUpdateHistory(liveSpot);
    const start30d = ymdDaysAgo(30);

    const priorEntries = Object.entries(dailyRates)
      .filter(([d, v]) => d >= start30d && d < today && typeof v === 'number' && v > 0)
      .map(([, v]) => v);

    const historicalValues = priorEntries.length > 0 ? priorEntries : [liveSpot];
    const historical30dAvg =
      historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;

    const spotRounded = round2(liveSpot);
    const avgRounded = round2(historical30dAvg);

    if (isFixedWindowActive) {
      return applyAdminOverride(
        {
          base: 'USD',
          quote: 'GHS',
          spotRate: spotRounded,
          historical30dAvg: avgRounded,
          droppedBelowHistorical: false,
          markupPct: 0,
          automatedRate: FIXED_OVERRIDE_RATE,
          sampleCount: historicalValues.length,
          updatedAt: new Date().toISOString(),
          source: 'fixed_30d',
          fixedUntil: FIXED_OVERRIDE_UNTIL,
        },
        adminOverride
      );
    }

    const droppedBelowHistorical = spotRounded < avgRounded;
    const markupPct = droppedBelowHistorical ? 10 : 0;
    const automatedRate = droppedBelowHistorical
      ? round2(liveSpot * (1 + MARKUP_WHEN_BELOW_30D))
      : spotRounded;

    return applyAdminOverride(
      {
        base: 'USD',
        quote: 'GHS',
        spotRate: spotRounded,
        historical30dAvg: avgRounded,
        droppedBelowHistorical,
        markupPct,
        automatedRate,
        sampleCount: historicalValues.length,
        updatedAt: new Date().toISOString(),
        source: 'live',
      },
      adminOverride
    );
  });
}

/** Convenience helper returning just the effective GHS-per-USD rate number. */
export async function getEffectiveExchangeRate(): Promise<number> {
  const info = await getExchangeRateInfo();
  return info.effectiveRate;
}

export interface FxWeeklySnapshot {
  weekKey: string;
  periodFrom: string;
  periodTo: string;
  spotRate: number;
  historical30dAvg: number;
  automatedRate: number;
  effectiveRate: number;
  source: ExchangeRateInfo['source'];
  adminOverride: AdminFxOverride | null;
  weekHigh: number | null;
  weekLow: number | null;
  weekAvg: number | null;
  changeVsWeekAgoPct: number | null;
  sampleCount: number;
}

function isoWeekKey(d = new Date()): string {
  // ISO week: Thursday-based year + week number
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Build a weekly FX fluctuation snapshot from stored history + current info. */
export async function getFxWeeklySnapshot(): Promise<FxWeeklySnapshot> {
  const info = await getExchangeRateInfo();
  const stored = await getSetting<StoredFxHistory>(FX_SETTINGS_KEY, { dailyRates: {} });
  const dailyRates = stored?.dailyRates ?? {};

  const periodTo = ymdDaysAgo(0);
  const periodFrom = ymdDaysAgo(6);
  const weekAgo = ymdDaysAgo(7);

  const weekValues = Object.entries(dailyRates)
    .filter(([d, v]) => d >= periodFrom && d <= periodTo && typeof v === 'number' && v > 0)
    .map(([, v]) => v);

  const weekHigh = weekValues.length ? Math.max(...weekValues) : null;
  const weekLow = weekValues.length ? Math.min(...weekValues) : null;
  const weekAvg = weekValues.length
    ? round2(weekValues.reduce((s, v) => s + v, 0) / weekValues.length)
    : null;

  const weekAgoRate = dailyRates[weekAgo];
  const changeVsWeekAgoPct =
    typeof weekAgoRate === 'number' && weekAgoRate > 0
      ? round2(((info.spotRate - weekAgoRate) / weekAgoRate) * 100)
      : null;

  return {
    weekKey: isoWeekKey(),
    periodFrom,
    periodTo,
    spotRate: info.spotRate,
    historical30dAvg: info.historical30dAvg,
    automatedRate: info.automatedRate,
    effectiveRate: info.effectiveRate,
    source: info.source,
    adminOverride: info.adminOverride,
    weekHigh: weekHigh != null ? round2(weekHigh) : null,
    weekLow: weekLow != null ? round2(weekLow) : null,
    weekAvg,
    changeVsWeekAgoPct,
    sampleCount: weekValues.length,
  };
}

/**
 * Send the weekly FX report at most once per ISO week (idempotent).
 * Returns whether an email was sent.
 */
export async function maybeSendWeeklyFxReport(
  sendFn: (snapshot: FxWeeklySnapshot) => Promise<boolean>
): Promise<{ sent: boolean; weekKey: string; reason?: string }> {
  const snapshot = await getFxWeeklySnapshot();
  const last = await getSetting<{ weekKey?: string } | null>(FX_WEEKLY_REPORT_KEY, null);
  if (last?.weekKey === snapshot.weekKey) {
    return { sent: false, weekKey: snapshot.weekKey, reason: 'already_sent' };
  }

  const ok = await sendFn(snapshot);
  if (ok) {
    await setSetting(FX_WEEKLY_REPORT_KEY, {
      weekKey: snapshot.weekKey,
      sentAt: new Date().toISOString(),
      snapshot,
    });
  }
  return { sent: ok, weekKey: snapshot.weekKey, reason: ok ? undefined : 'send_failed' };
}
