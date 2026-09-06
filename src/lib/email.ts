import { Resend } from 'resend';
import type { BookingIntent } from '@/types';
import { ROOMS } from '@/lib/rooms';
import {
  renderEmail,
  type EmailPayload,
  type EmailType,
} from '@/lib/email-templates';

export {
  EMAIL_TYPES,
  SAMPLE_EMAIL_PAYLOAD,
  renderEmail,
  type EmailPayload,
  type EmailType,
  type EmailTypeMeta,
} from '@/lib/email-templates';

const OTA_CHANNELS = new Set(['airbnb', 'booking.com', 'hostelworld', 'expedia']);

export function isOtaChannel(channel?: string | null): boolean {
  if (!channel) return false;
  return OTA_CHANNELS.has(channel.toLowerCase());
}

/** Direct = created on this platform (website Paystack/manual or admin). OTAs own their own guest email. */
export function isDirectBooking(intent: BookingIntent | null | undefined, channel?: string | null): boolean {
  if (isOtaChannel(channel)) return false;
  return Boolean(intent?.guest_email);
}

export function payloadFromIntent(intent: BookingIntent, roomName?: string): EmailPayload {
  const nights = Math.max(
    1,
    Math.round(
      (new Date(intent.check_out).getTime() - new Date(intent.check_in).getTime()) / 86400000
    )
  );
  return {
    guestName: intent.guest_name,
    guestEmail: intent.guest_email,
    roomName: roomName ?? ROOMS.find((r) => r.id === intent.room_id)?.name ?? 'your room',
    checkIn: intent.check_in,
    checkOut: intent.check_out,
    adults: intent.adults,
    children: intent.children,
    reference: intent.reference,
    amountGHS: intent.amount_pesewas / 100,
    nights,
  };
}

function configured(): { resend: Resend; from: string; replyTo?: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY or EMAIL_FROM not set — skipping send');
    return null;
  }
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  return { resend: new Resend(apiKey), from, replyTo: replyTo || undefined };
}

/**
 * Fire-and-forget guest email. Never throws — booking flows must not fail because mail failed.
 * No-ops for OTA bookings and when credentials are missing.
 */
export function sendDirectGuestEmail(
  type: EmailType,
  intent: BookingIntent | null | undefined,
  opts?: { channel?: string | null; roomName?: string }
): void {
  void sendDirectGuestEmailAsync(type, intent, opts);
}

async function sendDirectGuestEmailAsync(
  type: EmailType,
  intent: BookingIntent | null | undefined,
  opts?: { channel?: string | null; roomName?: string }
): Promise<void> {
  try {
    if (!isDirectBooking(intent, opts?.channel)) return;
    if (!intent?.guest_email) return;

    const cfg = configured();
    if (!cfg) return;

    const payload = payloadFromIntent(intent, opts?.roomName);
    const { subject, html } = renderEmail(type, payload);

    const { error } = await cfg.resend.emails.send({
      from: cfg.from,
      to: payload.guestEmail,
      subject,
      html,
      replyTo: cfg.replyTo,
    });

    if (error) {
      console.error('[email] Resend error', type, intent.reference, error);
    }
  } catch (err) {
    console.error('[email] send failed', type, intent?.reference, err);
  }
}
