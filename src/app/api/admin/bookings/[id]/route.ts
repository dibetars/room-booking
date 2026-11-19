import { NextRequest, NextResponse } from 'next/server';
import { getAllBookingIntentsInWindow, getIntentByBeds24Id, getIntentByRef, updateIntentStatus } from '@/lib/supabase';
import { invalidate } from '@/lib/server-cache';
import { sendDirectGuestEmail } from '@/lib/email';

// Drop cached bookings + analytics so the dashboard's refetch after an
// action reflects the change immediately instead of serving stale data.
function invalidateCaches() {
  invalidate('bookings:');
  invalidate('analytics:');
}

function stableNumericId(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  const { action, reference } = await req.json().catch(() => ({}));
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  let intent = reference
    ? await getIntentByRef(String(reference))
    : numericId
      ? await getIntentByBeds24Id(numericId)
      : null;

  if (!intent && numericId) {
    const allIntents = await getAllBookingIntentsInWindow();
    intent = allIntents.find((i) => stableNumericId(i.reference) === numericId) ?? null;
  }

  if (!intent) {
    return NextResponse.json({ error: 'Booking not found in local store' }, { status: 404 });
  }

  if (action === 'cancel') {
    await updateIntentStatus(intent.reference, 'CANCELLED');
    sendDirectGuestEmail('booking_cancelled', intent);
    invalidateCaches();
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm') {
    await updateIntentStatus(intent.reference, 'CONFIRMED');
    sendDirectGuestEmail('booking_confirmed', intent);
    invalidateCaches();
    return NextResponse.json({ ok: true });
  }

  if (action === 'mark_paid') {
    await updateIntentStatus(intent.reference, 'CONFIRMED', {
      paystack_status: 'manual',
      paystack_raw: { source: 'admin_mark_paid' },
    });
    sendDirectGuestEmail('booking_confirmed', intent);
    sendDirectGuestEmail('payment_received', intent);
    invalidateCaches();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
