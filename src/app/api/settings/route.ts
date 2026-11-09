import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/supabase';
import { getExchangeRateInfo } from '@/lib/exchange-rate';

// Public, read-only: lets the booking UI know whether to run the Paystack
// payment flow or fall back to manual (request-to-book) mode, plus live FX rate.
export async function GET() {
  const [paymentsEnabled, exchangeRate] = await Promise.all([
    getSetting<boolean>('payments_enabled', false),
    getExchangeRateInfo(),
  ]);
  return NextResponse.json({ paymentsEnabled, exchangeRate });
}
