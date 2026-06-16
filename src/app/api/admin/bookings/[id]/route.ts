import { NextRequest, NextResponse } from 'next/server';
import { updateBookingStatus } from '@/lib/beds24';
import { getIntentByBeds24Id, updateIntentStatus } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const beds24Id = Number(id);
  if (!beds24Id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { action } = await req.json().catch(() => ({}));
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const intent = await getIntentByBeds24Id(beds24Id);

  if (action === 'cancel') {
    await updateBookingStatus(beds24Id, 'cancelled');
    if (intent) await updateIntentStatus(intent.reference, 'CANCELLED');
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm') {
    await updateBookingStatus(beds24Id, 'confirmed');
    if (intent) await updateIntentStatus(intent.reference, 'CONFIRMED');
    return NextResponse.json({ ok: true });
  }

  if (action === 'mark_paid') {
    await updateBookingStatus(beds24Id, 'confirmed');
    if (intent) {
      await updateIntentStatus(intent.reference, 'CONFIRMED', {
        paystack_status: 'manual',
        paystack_raw: { source: 'admin_mark_paid' },
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
