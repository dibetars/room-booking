import { getSetting, setSetting } from '@/lib/supabase';
import { withCache } from '@/lib/server-cache';

const FX_CACHE_KEY = 'fx:usd-ghs:v1';
const FX_CACHE_TTL = 60 * 60 * 1000; // 1 hour in-memory cache
const FX_SETTINGS_KEY = 'fx_usd_ghs_history';
const FALLBACK_RATE = Number(process.env.GHS_PER_USD ?? process.env.NEXT_PUBLIC_GHS_PER_USD ?? '11.5');
const MARKUP_WHEN_BELOW_30D = 0.10; // +10% when spot drops below 30-day historical average

// 30-day fixed rate lock (Nov 9, 2026 -> Dec 9, 2026) at 11.5 GHS/USD
const FIXED_OVERRIDE_RATE = 11.5;
const FIXED_OVERRIDE_UNTIL = '2026-12-09';

export interface ExchangeRateInfo {
  base: 'USD';
  quote: 'GHS';
  spotRate: number;
  historical30dAvg: number;
  droppedBelowHistorical: boolean;
  markupPct: number;
  effectiveRate: number;
  sampleCount: number;
  updatedAt: string;
  source: 'fixed_30d' | 'live' | 'fallback';
  fixedUntil?: string;
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

/**
 * Returns full exchange rate details:
 * - While within the 30-day fixed rate window (through `FIXED_OVERRIDE_UNTIL`),
 *   locks `effectiveRate` to `11.5` while still recording the live 30-day history in the background.
 * - After the 30-day fixed window, uses live USD->GHS spot rate and applies +10% markup
 *   only when `spotRate < historical30dAvg`.
 */
export async function getExchangeRateInfo(): Promise<ExchangeRateInfo> {
  return withCache(FX_CACHE_KEY, FX_CACHE_TTL, async () => {
    const today = ymdDaysAgo(0);
    const isFixedWindowActive = today <= FIXED_OVERRIDE_UNTIL;
    const liveSpot = await fetchLiveSpotUsdToGhs();

    if (!liveSpot) {
      const rate = isFixedWindowActive ? FIXED_OVERRIDE_RATE : round2(FALLBACK_RATE);
      return {
        base: 'USD',
        quote: 'GHS',
        spotRate: rate,
        historical30dAvg: rate,
        droppedBelowHistorical: false,
        markupPct: 0,
        effectiveRate: rate,
        sampleCount: 0,
        updatedAt: new Date().toISOString(),
        source: isFixedWindowActive ? 'fixed_30d' : 'fallback',
        fixedUntil: isFixedWindowActive ? FIXED_OVERRIDE_UNTIL : undefined,
      };
    }

    const dailyRates = await loadAndUpdateHistory(liveSpot);
    const start30d = ymdDaysAgo(30);

    // Compute 30-day historical average from prior days in window (or all if only today exists)
    const priorEntries = Object.entries(dailyRates)
      .filter(([d, v]) => d >= start30d && d < today && typeof v === 'number' && v > 0)
      .map(([, v]) => v);

    const historicalValues = priorEntries.length > 0 ? priorEntries : [liveSpot];
    const historical30dAvg =
      historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;

    const spotRounded = round2(liveSpot);
    const avgRounded = round2(historical30dAvg);

    if (isFixedWindowActive) {
      return {
        base: 'USD',
        quote: 'GHS',
        spotRate: spotRounded,
        historical30dAvg: avgRounded,
        droppedBelowHistorical: false,
        markupPct: 0,
        effectiveRate: FIXED_OVERRIDE_RATE,
        sampleCount: historicalValues.length,
        updatedAt: new Date().toISOString(),
        source: 'fixed_30d',
        fixedUntil: FIXED_OVERRIDE_UNTIL,
      };
    }

    // Only charge 10% more when current spot rate drops below the 30-day historical rate
    const droppedBelowHistorical = spotRounded < avgRounded;
    const markupPct = droppedBelowHistorical ? 10 : 0;
    const effectiveRate = droppedBelowHistorical
      ? round2(liveSpot * (1 + MARKUP_WHEN_BELOW_30D))
      : spotRounded;

    return {
      base: 'USD',
      quote: 'GHS',
      spotRate: spotRounded,
      historical30dAvg: avgRounded,
      droppedBelowHistorical,
      markupPct,
      effectiveRate,
      sampleCount: historicalValues.length,
      updatedAt: new Date().toISOString(),
      source: 'live',
    };
  });
}

/** Convenience helper returning just the effective GHS-per-USD rate number. */
export async function getEffectiveExchangeRate(): Promise<number> {
  const info = await getExchangeRateInfo();
  return info.effectiveRate;
}
