import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/supabase';

// Public, read-only: lets the booking UI know whether to run the Paystack
// payment flow or fall back to manual (request-to-book) mode.
export async function GET() {
  const paymentsEnabled = await getSetting<boolean>('payments_enabled', false);
  return NextResponse.json({ paymentsEnabled });
}
