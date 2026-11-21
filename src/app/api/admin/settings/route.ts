import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { maskEmail } from '@/lib/email-otp';
import {
  getExchangeRateInfo,
  setAdminFxOverride,
} from '@/lib/exchange-rate';
import { getSetting, setSetting } from '@/lib/supabase';

// Protected by admin middleware (matcher: /api/admin/:path*).

export async function GET() {
  const [paymentsEnabled, augustWeekendDiscount, exchangeRate] = await Promise.all([
    getSetting<boolean>('payments_enabled', false),
    getSetting<boolean>('august_weekend_discount', true),
    getExchangeRateInfo(),
  ]);
  const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? '';
  return NextResponse.json({
    paymentsEnabled,
    augustWeekendDiscount,
    emailOtpActive: Boolean(adminEmail),
    emailOtpHint: adminEmail ? maskEmail(adminEmail) : '',
    exchangeRate,
  });
}

const schema = z.object({
  paymentsEnabled: z.boolean().optional(),
  augustWeekendDiscount: z.boolean().optional(),
  /** Set a number to override charged FX; null clears override and resumes automation. */
  fxAdminOverrideRate: z.union([z.number().positive().min(1).max(100), z.null()]).optional(),
  fxAdminOverrideNote: z.string().max(200).optional(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updates: Promise<unknown>[] = [];
    if (parsed.data.paymentsEnabled !== undefined) {
      updates.push(setSetting('payments_enabled', parsed.data.paymentsEnabled));
    }
    if (parsed.data.augustWeekendDiscount !== undefined) {
      updates.push(setSetting('august_weekend_discount', parsed.data.augustWeekendDiscount));
    }

    let exchangeRate = undefined;
    if (parsed.data.fxAdminOverrideRate !== undefined) {
      await setAdminFxOverride(
        parsed.data.fxAdminOverrideRate,
        parsed.data.fxAdminOverrideNote
      );
      exchangeRate = await getExchangeRateInfo();
    }

    await Promise.all(updates);
    return NextResponse.json({
      ok: true,
      paymentsEnabled: parsed.data.paymentsEnabled,
      augustWeekendDiscount: parsed.data.augustWeekendDiscount,
      exchangeRate,
    });
  } catch (err) {
    console.error('[admin settings PUT]', err);
    const message = err instanceof Error ? err.message : 'Save failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
