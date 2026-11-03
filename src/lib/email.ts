import { getSetting } from '@/lib/supabase';
import { Resend } from 'resend';
import type { BookingIntent } from '@/types';
import { ROOMS } from '@/lib/rooms';
import {
  renderEmail,
  templateSettingKey,
  type EmailPayload,
  type EmailTemplateCopy,
  type EmailType,
} from '@/lib/email-templates';

export {
  DEFAULT_TEMPLATES,
  EMAIL_TYPES,
  SAMPLE_EMAIL_PAYLOAD,
  TEMPLATE_PLACEHOLDERS,
  renderEmail,
  templateSettingKey,
  type EmailPayload,
  type EmailTemplateCopy,
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
    const override = await getSetting<EmailTemplateCopy | null>(templateSettingKey(type), null);
    const { subject, html } = renderEmail(type, payload, override);

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

/** Send a one-time admin login code. Returns false if Resend is not configured or send fails. */
export async function sendAdminOtpEmail(to: string, code: string): Promise<boolean> {
  const cfg = configured();
  if (!cfg) return false;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; color: #333;">
      <p style="font-size: 16px;">Your BokoBoko admin login code is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.35em; font-family: ui-monospace, monospace; margin: 24px 0;">${code}</p>
      <p style="font-size: 14px; color: #666;">This code expires in 10 minutes. If you did not try to sign in, you can ignore this email.</p>
    </div>
  `.trim();

  try {
    const { error } = await cfg.resend.emails.send({
      from: cfg.from,
      to,
      subject: `${code} is your BokoBoko admin code`,
      html,
    });
    if (error) {
      console.error('[email] admin OTP Resend error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] admin OTP send failed', err);
    return false;
  }
}
