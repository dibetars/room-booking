import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createBooking } from '@/lib/beds24';
import { initializeTransaction } from '@/lib/paystack';
import { createIntent, getIntentByRef } from '@/lib/supabase';
import { generateReference } from '@/lib/booking-ref';
import { ROOMS } from '@/lib/rooms';

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
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { roomId, checkIn, checkOut, adults, children, guest } = parsed.data;

  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (adults + children > room.maxOccupancy) {
    return NextResponse.json({ error: `Room capacity is ${room.maxOccupancy} guests` }, { status: 400 });
  }

  // Dedupe: same email+room+dates within 5 minutes
  const dedupeKey = `${guest.email}:${roomId}:${checkIn}:${checkOut}`;
  const lastRequest = recentRequests.get(dedupeKey);
  if (lastRequest && Date.now() - lastRequest < 5 * 60 * 1000) {
    return NextResponse.json({ error: 'Duplicate request — please wait a moment' }, { status: 429 });
  }
  recentRequests.set(dedupeKey, Date.now());
  setTimeout(() => recentRequests.delete(dedupeKey), 5 * 60 * 1000);

  try {
    // Authoritative price from room config (Beds24 rackRate × nights × exchange rate)
    const nights = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    const GHS_PER_USD = Number(process.env.GHS_PER_USD ?? '15.5');
    const priceGHS = room.rackRateUSD * nights * GHS_PER_USD;
    const amountPesewas = Math.round(priceGHS * 100);

    const reference = generateReference();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // 1. Create hold in Beds24 (status=request blocks OTA availability)
    const [firstName, ...rest] = guest.name.split(' ');
    const beds24Result = await createBooking({
      roomId,
      firstNight: checkIn,
      lastNight: new Date(new Date(checkOut).getTime() - 86400000).toISOString().slice(0, 10),
      numAdult: adults,
      numChild: children,
      guestFirstName: firstName,
      guestName: rest.join(' ') || firstName,
      email: guest.email,
      phone: guest.phone,
      status: 'request',
      price: room.rackRateUSD * nights,
      referer: 'BokoBoko Direct',
      info: `Ref: ${reference}`,
    });

    // 2. Persist the intent in Supabase
    await createIntent({
      reference,
      status: 'HELD',
      beds24_booking_id: beds24Result.id,
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
      beds24_raw: beds24Result,
      paystack_raw: null,
    });

    // 3. Initialize Paystack transaction
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://book.bokoboko.org';
    const paystack = await initializeTransaction({
      email: guest.email,
      amountPesewas,
      reference,
      callbackUrl: `${baseUrl}/confirm/${reference}`,
      metadata: {
        beds24_booking_id: beds24Result.id,
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        guest_name: guest.name,
      },
    });

    return NextResponse.json({
      reference,
      authorizationUrl: paystack.authorizationUrl,
      expiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[POST /api/bookings]', { ip, message, err });

    if (message === 'BEDS24_RATE_LIMITED') {
      return NextResponse.json({ error: 'Service busy, please try again shortly' }, { status: 429 });
    }
    if (message.includes('no longer available') || message.includes('409')) {
      return NextResponse.json({ error: 'These dates are no longer available' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Booking failed, please try again' }, { status: 502 });
  }
}
