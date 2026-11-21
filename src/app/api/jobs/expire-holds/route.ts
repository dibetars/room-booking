import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getExpiredHeldIntents, updateIntentStatus } from '@/lib/supabase';
import { syncAllRoomIcalFeeds } from '@/lib/ical';
import { getExchangeRateInfo, maybeSendWeeklyFxReport } from '@/lib/exchange-rate';
import { sendFxWeeklyReportEmail } from '@/lib/email';

function isValidCronSecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function GET(req: NextRequest) {
  if (!isValidCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Sync external room iCal feeds (Airbnb / Booking.com) & refresh daily FX rate
  const [icalSync] = await Promise.all([
    syncAllRoomIcalFeeds().catch((err) => {
      console.error('[cron] iCal sync failed', err);
      return null;
    }),
    getExchangeRateInfo().catch((err) => {
      console.error('[cron] exchange rate refresh failed', err);
      return null;
    }),
  ]);

  // Mondays (UTC): send weekly FX fluctuation email once per ISO week
  let fxWeekly: { sent: boolean; weekKey: string; reason?: string } | null = null;
  if (new Date().getUTCDay() === 1) {
    fxWeekly = await maybeSendWeeklyFxReport(sendFxWeeklyReportEmail).catch((err) => {
      console.error('[cron] FX weekly report failed', err);
      return { sent: false, weekKey: '', reason: 'error' };
    });
  }

  const expired = await getExpiredHeldIntents();
  let cancelled = 0;

  for (const intent of expired) {
    try {
      await updateIntentStatus(intent.reference, 'EXPIRED');
      cancelled++;
    } catch (err) {
      console.error('[cron] failed to expire intent', intent.reference, err);
    }
  }

  return NextResponse.json({
    cancelled,
    checked: expired.length,
    icalSyncedEvents: icalSync?.events.length ?? 0,
    fxWeekly,
  });
}
