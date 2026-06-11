import { NextRequest, NextResponse } from 'next/server';
import { getExpiredHeldIntents, updateIntentStatus } from '@/lib/supabase';
import { updateBookingStatus, refreshTokenForCron } from '@/lib/beds24';

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
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
