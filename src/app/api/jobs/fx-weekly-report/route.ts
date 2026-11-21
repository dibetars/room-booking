import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { maybeSendWeeklyFxReport } from '@/lib/exchange-rate';
import { sendFxWeeklyReportEmail } from '@/lib/email';

function isValidCronSecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/** Weekly FX fluctuation email to ADMIN_EMAIL. Idempotent per ISO week. */
export async function GET(req: NextRequest) {
  if (!isValidCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get('force') === '1';
  if (force) {
    // force path: send without week-key gate (still records the week after success)
    const { getFxWeeklySnapshot, FX_WEEKLY_REPORT_KEY } = await import('@/lib/exchange-rate');
    const { setSetting } = await import('@/lib/supabase');
    const snapshot = await getFxWeeklySnapshot();
    const ok = await sendFxWeeklyReportEmail(snapshot);
    if (ok) {
      await setSetting(FX_WEEKLY_REPORT_KEY, {
        weekKey: snapshot.weekKey,
        sentAt: new Date().toISOString(),
        snapshot,
        forced: true,
      });
    }
    return NextResponse.json({ sent: ok, weekKey: snapshot.weekKey, forced: true });
  }

  const result = await maybeSendWeeklyFxReport(sendFxWeeklyReportEmail);
  return NextResponse.json(result);
}
