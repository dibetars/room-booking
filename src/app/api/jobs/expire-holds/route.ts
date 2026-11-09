import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getExpiredHeldIntents, updateIntentStatus } from '@/lib/supabase';
import { updateBookingStatus, refreshTokenForCron } from '@/lib/beds24';
import { getChannelMode, syncAllRoomIcalFeeds } from '@/lib/ical';
import { getExchangeRateInfo } from '@/lib/exchange-rate';

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

  const mode = await getChannelMode();

  // Keep Beds24 refresh token warm when in beds24 mode
  if (mode === 'beds24') {
    await refreshTokenForCron().catch((err) =>
      console.error('[cron] token refresh failed', err)
    );
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

  const expired = await getExpiredHeldIntents();
  let cancelled = 0;

  for (const intent of expired) {
    try {
      if (intent.beds24_booking_id && mode === 'beds24') {
        await updateBookingStatus(intent.beds24_booking_id, 'cancelled');
      }
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
  });
}
