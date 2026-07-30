import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSetting, setSetting } from '@/lib/supabase';

// Protected by admin middleware (matcher: /api/admin/:path*).

export async function GET() {
  const [paymentsEnabled, augustWeekendDiscount] = await Promise.all([
    getSetting<boolean>('payments_enabled', false),
    getSetting<boolean>('august_weekend_discount', true),
  ]);
  return NextResponse.json({ paymentsEnabled, augustWeekendDiscount });
}

const schema = z.object({
  paymentsEnabled: z.boolean().optional(),
  augustWeekendDiscount: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const updates: Promise<void>[] = [];
    if (parsed.data.paymentsEnabled !== undefined) {
      updates.push(setSetting('payments_enabled', parsed.data.paymentsEnabled));
    }
    if (parsed.data.augustWeekendDiscount !== undefined) {
      updates.push(setSetting('august_weekend_discount', parsed.data.augustWeekendDiscount));
    }
    await Promise.all(updates);
    return NextResponse.json({ ok: true, ...parsed.data });
  } catch (err) {
    console.error('[admin settings PUT]', err);
    return NextResponse.json({ error: 'Save failed — ensure the app_settings table exists in Supabase.' }, { status: 500 });
  }
}
