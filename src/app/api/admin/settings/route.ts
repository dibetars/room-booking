import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSetting, setSetting } from '@/lib/supabase';

// Protected by admin middleware (matcher: /api/admin/:path*).

export async function GET() {
  const paymentsEnabled = await getSetting<boolean>('payments_enabled', false);
  return NextResponse.json({ paymentsEnabled });
}

const schema = z.object({
  paymentsEnabled: z.boolean(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    await setSetting('payments_enabled', parsed.data.paymentsEnabled);
    return NextResponse.json({ ok: true, paymentsEnabled: parsed.data.paymentsEnabled });
  } catch (err) {
    console.error('[admin settings PUT]', err);
    return NextResponse.json({ error: 'Save failed — ensure the app_settings table exists in Supabase.' }, { status: 500 });
  }
}
