import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createIntent, getSetting } from '@/lib/supabase';
import { generateReference } from '@/lib/booking-ref';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { getDiscount, applyDiscount } from '@/lib/discounts';
import { assertRoomBookable, BookingBlockedError } from '@/lib/occupancy';
import { sendDirectGuestEmail } from '@/lib/email';
import { getEffectiveExchangeRate } from '@/lib/exchange-rate';

const schema = z.object({
  roomId: z.number().int().positive(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(10),
  guest: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
});

// Simple in-memory deduplication: (email+roomId+checkIn) within 5 min
const recentRequests = new Map<string, number>();

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Cap holds per IP — prevents an attacker from spamming fake "request"
  // bookings to lock out room availability for real guests.
  if (!rateLimit(`bookings:${ip}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { roomId, checkIn, checkOut, adults, children, guest } = parsed.data;

  // Dedupe: same email+room+dates within 5 minutes
  const dedupeKey = `${guest.email}:${roomId}:${checkIn}:${checkOut}`;
  const lastRequest = recentRequests.get(dedupeKey);
  if (lastRequest && Date.now() - lastRequest < 5 * 60 * 1000) {
    return NextResponse.json({ error: 'Duplicate request — please wait a moment' }, { status: 429 });
  }
  recentRequests.set(dedupeKey, Date.now());
  setTimeout(() => recentRequests.delete(dedupeKey), 5 * 60 * 1000);

  try {
    const room = await assertRoomBookable({ roomId, checkIn, checkOut, adults, children });

    const nights = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );

    const reference = generateReference();
    const [paymentsEnabled, augustWeekendEnabled, GHS_PER_USD] = await Promise.all([
      getSetting<boolean>('payments_enabled', false),
      getSetting<boolean>('august_weekend_discount', true),
      getEffectiveExchangeRate(),
    ]);

    const discount = getDiscount(checkIn, checkOut, { augustWeekendEnabled });
    const priceUSD = applyDiscount(room.rackRateUSD * nights, discount);
    const priceGHS = priceUSD * GHS_PER_USD;
    const amountPesewas = Math.round(priceGHS * 100);
    const discountInfo = discount ? ` [${discount.code} -${discount.discountPct}%]` : '';

    if (!paymentsEnabled) {
      const intent = await createIntent({
        reference,
        status: 'PAYMENT_PENDING',
        beds24_booking_id: null,
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        guest_name: guest.name,
        guest_email: guest.email,
        guest_phone: guest.phone ?? null,
        amount_pesewas: amountPesewas,
        currency: 'GHS',
        paystack_status: 'manual',
        expires_at: null,
        beds24_raw: { mode: 'direct', note: `manual payment (Paystack disabled)${discountInfo}` },
        paystack_raw: { source: 'manual_mode' },
      });

      sendDirectGuestEmail('booking_request', intent, { roomName: room.name });

      return NextResponse.json({ reference, manual: true, discount: discount ?? undefined });
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await createIntent({
      reference,
      status: 'HELD',
      beds24_booking_id: null,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      guest_name: guest.name,
      guest_email: guest.email,
      guest_phone: guest.phone ?? null,
      amount_pesewas: amountPesewas,
      currency: 'GHS',
      paystack_status: null,
      expires_at: expiresAt,
      beds24_raw: { mode: 'direct', note: discountInfo || null },
      paystack_raw: null,
    });

    return NextResponse.json({ reference, amountPesewas, expiresAt, discount: discount ?? undefined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[POST /api/bookings]', { ip, message, err });

    if (err instanceof BookingBlockedError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 409 });
    }
    if (message.includes('no longer available') || message.includes('409')) {
      return NextResponse.json({ error: 'These dates are no longer available' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Booking failed, please try again' }, { status: 502 });
  }
}
