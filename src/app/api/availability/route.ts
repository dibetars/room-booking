import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAvailability } from '@/lib/beds24';
import { ROOMS } from '@/lib/rooms';

const schema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(10),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const parsed = schema.safeParse({
    checkIn: searchParams.get('checkIn'),
    checkOut: searchParams.get('checkOut'),
    adults: searchParams.get('adults') ?? '1',
    children: searchParams.get('children') ?? '0',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.flatten() }, { status: 400 });
  }

  const { checkIn, checkOut, adults, children } = parsed.data;

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkInDate < today) {
    return NextResponse.json({ error: 'Check-in date cannot be in the past' }, { status: 400 });
  }

  const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86400000);
  if (nights < 1 || nights > 30) {
    return NextResponse.json({ error: 'Stay must be between 1 and 30 nights' }, { status: 400 });
  }

  try {
    const roomIds = ROOMS.map((r) => r.id);
    const availability = await checkAvailability(roomIds, checkIn, checkOut);

    const GHS_PER_USD = Number(process.env.GHS_PER_USD ?? '15.5');

    const rooms = ROOMS.map((room) => {
      const avail = availability.find((a) => a.roomId === room.id);
      if (!avail?.available) {
        return { roomId: room.id, name: room.name, description: room.description, maxOccupancy: room.maxOccupancy, photos: room.photos, available: false, totalPriceGHS: 0, perNight: 0 };
      }
      const perNightGHS = Math.round(room.rackRateUSD * GHS_PER_USD);
      const totalPriceGHS = perNightGHS * nights;
      return {
        roomId: room.id,
        name: room.name,
        description: room.description,
        maxOccupancy: room.maxOccupancy,
        photos: room.photos,
        available: true,
        totalPriceGHS,
        perNight: perNightGHS,
      };
    });

    return NextResponse.json({ rooms, checkIn, checkOut, nights, adults, children });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'BEDS24_RATE_LIMITED') {
      return NextResponse.json({ error: 'Service busy, please try again shortly' }, { status: 429 });
    }
    console.error('[availability]', err);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 502 });
  }
}
