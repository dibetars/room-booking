import { NextRequest, NextResponse } from 'next/server';
import { getIntentByRef } from '@/lib/supabase';
import { ROOMS } from '@/lib/rooms';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;

  if (!ref || !/^BKB-\d{8}-[A-Z0-9]{6}$/.test(ref)) {
    return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
  }

  const intent = await getIntentByRef(ref);
  if (!intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const room = ROOMS.find((r) => r.id === intent.room_id);

  return NextResponse.json({
    status: intent.status,
    checkIn: intent.check_in,
    checkOut: intent.check_out,
    roomName: room?.name ?? 'Room',
    amountGHS: intent.amount_pesewas / 100,
    expiresAt: intent.expires_at,
  });
}
