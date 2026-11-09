import { NextRequest, NextResponse } from 'next/server';
import { generateRoomIcs } from '@/lib/ical';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId: rawRoomId } = await params;
  const cleaned = rawRoomId.replace(/\.ics$/i, '');
  const roomId = Number(cleaned);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return new NextResponse('Invalid room ID', { status: 400 });
  }

  const ics = await generateRoomIcs(roomId);
  if (!ics) {
    return new NextResponse('Room not found', { status: 404 });
  }

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="bokoboko-room-${roomId}.ics"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
