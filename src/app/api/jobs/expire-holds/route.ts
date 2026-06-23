import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getExpiredHeldIntents, updateIntentStatus } from '@/lib/supabase';
import { updateBookingStatus, refreshTokenForCron } from '@/lib/beds24';

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

  // Keep Beds24 refresh token warm
  await refreshTokenForCron().catch((err) =>
    console.error('[cron] token refresh failed', err)
  );

  const expired = await getExpiredHeldIntents();
  let cancelled = 0;

  for (const intent of expired) {
    try {
      if (intent.beds24_booking_id) {
        await updateBookingStatus(intent.beds24_booking_id, 'cancelled');
      }
      await updateIntentStatus(intent.reference, 'EXPIRED');
      cancelled++;
    } catch (err) {
      console.error('[cron] failed to expire intent', intent.reference, err);
    }
  }

  return NextResponse.json({ cancelled, checked: expired.length });
}
