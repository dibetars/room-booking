import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, verifyTransaction } from '@/lib/paystack';
import { getIntentByRef, updateIntentStatus } from '@/lib/supabase';
import { updateBookingStatus } from '@/lib/beds24';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-paystack-signature') ?? '';
  const rawBody = Buffer.from(await req.arrayBuffer());

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody.toString());

  // Acknowledge immediately — process after
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true });
  }

  const reference: string = event.data?.reference;
  if (!reference) return NextResponse.json({ received: true });

  // Process asynchronously — respond 200 first
  handleChargeSuccess(reference, event.data).catch((err) =>
    console.error('[webhook] handleChargeSuccess failed', err)
  );

  return NextResponse.json({ received: true });
}

async function handleChargeSuccess(reference: string, webhookData: unknown) {
  const intent = await getIntentByRef(reference);
  if (!intent) {
    console.error('[webhook] intent not found for', reference);
    return;
  }

  // Idempotency: already confirmed
  if (intent.status === 'CONFIRMED') return;

  // Belt-and-braces: verify with Paystack directly
  let verified;
  try {
    verified = await verifyTransaction(reference);
  } catch (err) {
    console.error('[webhook] verify failed', err);
    await updateIntentStatus(reference, 'RECONCILE_NEEDED', { paystack_raw: webhookData });
    return;
  }

  if (verified.status !== 'success') {
    await updateIntentStatus(reference, 'PAYMENT_FAILED', { paystack_raw: verified, paystack_status: verified.status });
    return;
  }

  // Guard: amount must match what we stored
  if (verified.amount !== intent.amount_pesewas || verified.currency !== intent.currency) {
    console.error('[webhook] amount/currency mismatch', { reference, verified, intent });
    await updateIntentStatus(reference, 'RECONCILE_NEEDED', { paystack_raw: verified, paystack_status: 'amount_mismatch' });
    return;
  }

  // Mark PAID first, then confirm in Beds24
  await updateIntentStatus(reference, 'PAID', { paystack_raw: verified, paystack_status: 'success' });

  if (!intent.beds24_booking_id) {
    await updateIntentStatus(reference, 'RECONCILE_NEEDED');
    return;
  }

  // Confirm in Beds24 with retry
  let confirmed = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await updateBookingStatus(intent.beds24_booking_id, 'confirmed');
      confirmed = true;
      break;
    } catch (err) {
      console.error(`[webhook] Beds24 confirm attempt ${attempt} failed`, err);
      if (attempt < 5) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }

  if (confirmed) {
    await updateIntentStatus(reference, 'CONFIRMED');
  } else {
    await updateIntentStatus(reference, 'RECONCILE_NEEDED');
    console.error('[webhook] RECONCILE_NEEDED — manual action required for', reference);
  }
}
