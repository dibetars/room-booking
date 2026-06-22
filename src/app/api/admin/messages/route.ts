import { NextRequest, NextResponse } from 'next/server';
import { getMessages, sendMessage, getBookings } from '@/lib/beds24';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const bookingId = searchParams.get('bookingId');
  const daysBack = Number(searchParams.get('daysBack') ?? '90');

  const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  try {
    const [messages, bookings] = await Promise.all([
      getMessages(bookingId
        ? { bookingId: Number(bookingId) }
        : { startDate, endDate }),
      bookingId ? Promise.resolve([]) : getBookings({ startArrival: startDate, endArrival: endDate }),
    ]);

    // Build a lookup map for booking info
    const bookingMap = new Map(bookings.map((b) => [b.id, b]));

    // Group messages into conversations keyed by bookingId
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

      if (!existing) {
        convMap.set(bId, {
          bookingId: bId,
          guestName: booking
            ? `${booking.guestFirstName} ${booking.guestLastName}`.trim()
            : `Booking #${bId}`,
          room: booking ? String(booking.roomId) : '',
          arrival: booking?.arrival ?? '',
          referer: booking?.referer,
          messages: [m],
          lastTime: m.time,
          unread: m.type === 'guest' ? 1 : 0,
        });
      } else {
        existing.messages.push(m);
        if (m.time > existing.lastTime) existing.lastTime = m.time;
        if (m.type === 'guest') existing.unread++;
      }
    }

    const conversations = Array.from(convMap.values())
      .sort((a, b) => b.lastTime.localeCompare(a.lastTime));

    return NextResponse.json({ conversations, messages });
  } catch (err) {
    console.error('[messages GET]', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.bookingId || !body?.message) {
    return NextResponse.json({ error: 'bookingId and message required' }, { status: 400 });
  }

  try {
    await sendMessage(Number(body.bookingId), String(body.message));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[messages POST]', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 502 });
  }
}
