import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBookings, createBooking } from '@/lib/beds24';
import { getIntentsByBeds24Ids, createIntent } from '@/lib/supabase';
import { generateReference } from '@/lib/booking-ref';
import { ROOMS } from '@/lib/rooms';
import { withCache, invalidate } from '@/lib/server-cache';

const BOOKINGS_TTL = 2 * 60 * 1000; // 2 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const daysBack = Number(searchParams.get('daysBack') ?? '7');
  const daysAhead = Number(searchParams.get('daysAhead') ?? '60');

  const from = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const cacheKey = `bookings:${daysBack}:${daysAhead}`;

  const bookings = await withCache(cacheKey, BOOKINGS_TTL, async () => {
    const beds24Bookings = await getBookings({ startArrival: from, endArrival: to });
    const ids = beds24Bookings.map((b) => b.id).filter((id): id is number => !!id);
    const intents = await getIntentsByBeds24Ids(ids);
    const intentMap = new Map(intents.map((i) => [i.beds24_booking_id, i]));
    return beds24Bookings.map((b) => ({
      ...b,
      intent: b.id ? (intentMap.get(b.id) ?? null) : null,
    }));
  });

  return NextResponse.json({ bookings });
}

const createSchema = z.object({
  roomId: z.number().int().positive(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(10),
  guestFirstName: z.string().min(1),
  guestLastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  priceGHS: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { roomId, checkIn, checkOut, adults, children, guestFirstName, guestLastName, email, phone, notes, priceGHS } = parsed.data;

  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  const GHS_PER_USD = Number(process.env.GHS_PER_USD ?? '15.5');
  const finalPriceGHS = priceGHS ?? room.rackRateUSD * nights * GHS_PER_USD;
  const amountPesewas = Math.round(finalPriceGHS * 100);
  const reference = generateReference();

  const beds24Result = await createBooking({
    roomId,
    arrival: checkIn,
    departure: checkOut,
    numAdult: adults,
    numChild: children,
    guestFirstName,
    guestLastName,
    email,
    phone,
    status: 'confirmed',
    price: room.rackRateUSD * nights,
    referer: 'BokoBoko Admin',
    info: notes ? `${reference} — ${notes}` : reference,
  });

  await createIntent({
    reference,
    status: 'CONFIRMED',
    beds24_booking_id: beds24Result.id,
    room_id: roomId,
    check_in: checkIn,
    check_out: checkOut,
    adults,
    children,
    guest_name: `${guestFirstName} ${guestLastName}`,
    guest_email: email,
    guest_phone: phone ?? null,
    amount_pesewas: amountPesewas,
    currency: 'GHS',
    paystack_status: 'manual',
    expires_at: null,
    beds24_raw: beds24Result,
    paystack_raw: { source: 'admin_manual' },
  });

  invalidate('bookings:');
  invalidate('analytics:');
  return NextResponse.json({ reference, beds24Id: beds24Result.id });
}
