import { NextRequest, NextResponse } from 'next/server';
import { updateBookingStatus } from '@/lib/beds24';
import { getAllBookingIntentsInWindow, getIntentByBeds24Id, getIntentByRef, updateIntentStatus } from '@/lib/supabase';
import { getChannelMode } from '@/lib/ical';
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

  const mode = await getChannelMode();
  let intent = reference
    ? await getIntentByRef(String(reference))
    : numericId
      ? await getIntentByBeds24Id(numericId)
      : null;

  if (!intent && numericId) {
    const allIntents = await getAllBookingIntentsInWindow();
    intent = allIntents.find((i) => stableNumericId(i.reference) === numericId) ?? null;
  }

  const hasBeds24Booking = Boolean(intent?.beds24_booking_id ?? (mode === 'beds24' && numericId));
  const beds24Id = intent?.beds24_booking_id ?? numericId;

  if (action === 'cancel') {
    if (hasBeds24Booking && mode === 'beds24' && beds24Id) {
      await updateBookingStatus(beds24Id, 'cancelled');
    }
    if (intent) await updateIntentStatus(intent.reference, 'CANCELLED');
    sendDirectGuestEmail('booking_cancelled', intent);
    invalidateCaches();
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm') {
    if (hasBeds24Booking && mode === 'beds24' && beds24Id) {
      await updateBookingStatus(beds24Id, 'confirmed');
    }
    if (intent) await updateIntentStatus(intent.reference, 'CONFIRMED');
    sendDirectGuestEmail('booking_confirmed', intent);
    invalidateCaches();
    return NextResponse.json({ ok: true });
  }

  if (action === 'mark_paid') {
    if (hasBeds24Booking && mode === 'beds24' && beds24Id) {
      await updateBookingStatus(beds24Id, 'confirmed');
    }
    if (intent) {
      await updateIntentStatus(intent.reference, 'CONFIRMED', {
        paystack_status: 'manual',
        paystack_raw: { source: 'admin_mark_paid' },
      });
    }
    sendDirectGuestEmail('booking_confirmed', intent);
    sendDirectGuestEmail('payment_received', intent);
    invalidateCaches();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
