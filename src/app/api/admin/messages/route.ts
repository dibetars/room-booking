import { NextRequest, NextResponse } from 'next/server';
import { getArchivedMessages } from '@/lib/beds24-archive';
import { getStoreBookings } from '@/lib/ical';
import { ROOMS } from '@/lib/rooms';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const bookingId = searchParams.get('bookingId');
  const daysBack = Number(searchParams.get('daysBack') ?? '90');

  const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  try {
    const [messages, bookings] = await Promise.all([
      getArchivedMessages(
        bookingId
          ? { bookingId: Number(bookingId) }
          : { startDate, endDate }
      ),
      bookingId ? Promise.resolve([]) : getStoreBookings({ from: startDate, to: endDate }),
    ]);

    const bookingMap = new Map(bookings.map((b) => [b.id, b]));

    const convMap = new Map<number, {
      bookingId: number;
      guestName: string;
      room: string;
      arrival: string;
      referer?: string;
      messages: typeof messages;
      lastTime: string;
      unread: number;
    }>();

    for (const m of messages) {
      const bId = m.bookingId;
      const booking = bookingMap.get(bId);
      const existing = convMap.get(bId);
      const roomName = booking
        ? (ROOMS.find((r) => r.id === booking.roomId)?.name ?? String(booking.roomId))
        : '';

      if (!existing) {
        convMap.set(bId, {
          bookingId: bId,
          guestName: booking
            ? `${booking.firstName} ${booking.lastName}`.trim()
            : `Booking #${bId}`,
          room: roomName,
          arrival: booking?.arrival ?? '',
          referer: booking?.referer,
          messages: [m],
          lastTime: m.time,
          unread: m.source === 'guest' ? 1 : 0,
        });
      } else {
        existing.messages.push(m);
        if (m.time > existing.lastTime) existing.lastTime = m.time;
        if (m.source === 'guest') existing.unread++;
      }
    }

    const conversations = Array.from(convMap.values())
      .sort((a, b) => b.lastTime.localeCompare(a.lastTime));

    return NextResponse.json({ conversations, messages, source: 'archive' });
  } catch (err) {
    console.error('[messages GET]', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 502 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Beds24 messaging is retired. Messages are read-only from the archive. Contact guests by email or the OTA inbox.',
    },
    { status: 410 }
  );
}
