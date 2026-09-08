export type EmailType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'payment_received'
  | 'booking_request'
  | 'check_in_instructions'
  | 'payment_pending';

export interface EmailPayload {
  guestName: string;
  guestEmail: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  reference: string;
  amountGHS?: number;
  nights?: number;
}

export interface EmailTypeMeta {
  id: EmailType;
  label: string;
  description: string;
  autoSent: boolean;
  autoSentWhen: string;
}

export const EMAIL_TYPES: EmailTypeMeta[] = [
  {
    id: 'booking_confirmed',
    label: 'Booking confirmed',
    description: 'Sent to the guest when a website/admin booking is confirmed.',
    autoSent: true,
    autoSentWhen: 'After Paystack success, admin Confirm / Mark paid, or admin-created booking',
  },
  {
    id: 'booking_cancelled',
    label: 'Booking cancelled',
    description: 'Sent when a direct booking is cancelled in admin.',
    autoSent: true,
    autoSentWhen: 'Admin Cancel on a website or admin booking',
  },
  {
    id: 'booking_reminder',
    label: 'Arrival reminder',
    description: 'Friendly reminder 3 days before check-in. Preview only until a reminder job is added.',
    autoSent: false,
    autoSentWhen: 'Not auto-sent yet — suggested 3 days before arrival',
  },
  {
    id: 'payment_received',
    label: 'Payment received',
    description: 'Receipt after a successful Paystack payment.',
    autoSent: true,
    autoSentWhen: 'Paystack charge.success, or admin Mark paid',
  },
  {
    id: 'booking_request',
    label: 'Booking request received',
    description: 'Acknowledges a request when online payments are disabled.',
    autoSent: true,
    autoSentWhen: 'Guest submits a booking while Paystack is off',
  },
  {
    id: 'check_in_instructions',
    label: 'Check-in instructions',
    description: 'Arrival details for Busua: times, address, and host contact.',
    autoSent: false,
    autoSentWhen: 'Not auto-sent yet — suggested the day before arrival',
  },
  {
    id: 'payment_pending',
    label: 'Payment pending',
    description: 'Reminds the guest that dates are held pending payment.',
    autoSent: false,
    autoSentWhen: 'Not auto-sent yet — suggested for unpaid holds / manual requests',
  },
];

export const SAMPLE_EMAIL_PAYLOAD: EmailPayload = {
  guestName: 'Ama Mensah',
  guestEmail: 'ama@example.com',
  roomName: 'Patience',
  checkIn: '2026-09-12',
  checkOut: '2026-09-15',
  adults: 2,
  children: 0,
  reference: 'BKB-20260912-ABC123',
  amountGHS: 2092.5,
  nights: 3,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function guestLine(p: EmailPayload): string {
  const adults = `${p.adults} adult${p.adults !== 1 ? 's' : ''}`;
  const children = p.children > 0 ? `, ${p.children} child${p.children !== 1 ? 'ren' : ''}` : '';
  return `${adults}${children}`;
}

function nightsLine(p: EmailPayload): string {
  const n = p.nights ?? Math.max(1, Math.round(
    (new Date(`${p.checkOut}T12:00:00`).getTime() - new Date(`${p.checkIn}T12:00:00`).getTime()) / 86400000
  ));
  return `${n} night${n !== 1 ? 's' : ''}`;
}

function amountLine(p: EmailPayload): string {
  if (p.amountGHS == null) return '—';
  return `GHS ${p.amountGHS.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function layout(preheader: string, heading: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#2d5a27;padding:22px 28px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">BokoBoko</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;font-family:Arial,Helvetica,sans-serif;">Guesthouse · Busua, Ghana</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a3518;">${escapeHtml(heading)}</h1>
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#8a7a68;font-family:Arial,Helvetica,sans-serif;">
                BokoBoko Guesthouse · Busua, Western Region, Ghana<br />
                info@bokoboko.org · +233 59 864 1683
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function stayCard(p: EmailPayload): string {
  const rows: [string, string][] = [
    ['Room', p.roomName],
    ['Check-in', fmtDate(p.checkIn)],
    ['Check-out', fmtDate(p.checkOut)],
    ['Stay', nightsLine(p)],
    ['Guests', guestLine(p)],
    ['Reference', p.reference],
  ];
  if (p.amountGHS != null) rows.push(['Total', amountLine(p)]);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;border-radius:12px;margin:18px 0;">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="padding:10px 16px;font-size:12px;color:#8a7a68;font-family:Arial,Helvetica,sans-serif;width:38%;">${escapeHtml(label)}</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a3518;font-family:Arial,Helvetica,sans-serif;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`).join('')}
  </table>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;font-family:Arial,Helvetica,sans-serif;">${text}</p>`;
}

export interface EmailTemplateCopy {
  subject: string;
  heading: string;
  preheader: string;
  body: string;
}

export function templateSettingKey(type: EmailType): string {
  return `email_template_${type}`;
}

export const DEFAULT_TEMPLATES: Record<EmailType, EmailTemplateCopy> = {
  booking_confirmed: {
    subject: 'Your stay at BokoBoko is confirmed — {{roomName}}',
    heading: 'Your booking is confirmed',
    preheader: 'Your booking {{reference}} is confirmed.',
    body: `Hi {{firstName}},

We look forward to welcoming you to BokoBoko in Busua. Your room is reserved — here are the details:

{{stayCard}}

Check-in is from 12:00 pm. If you have questions before you arrive, just reply to this email.`,
  },
  booking_cancelled: {
    subject: 'Booking cancelled — {{reference}}',
    heading: 'Your booking has been cancelled',
    preheader: 'Your booking {{reference}} has been cancelled.',
    body: `Hi {{firstName}},

This reservation is no longer active. The dates have been released.

{{stayCard}}

If this was unexpected, reply to this email and we will help.`,
  },
  booking_reminder: {
    subject: 'See you in 3 days — {{roomName}} at BokoBoko',
    heading: 'Your stay is in 3 days',
    preheader: 'Your stay in {{roomName}} starts soon.',
    body: `Hi {{firstName}},

Just a reminder that your Busua getaway is almost here. Pack light, bring swimwear, and we will take care of the rest.

{{stayCard}}

Check-in is from 12:00 pm. We are on the beachfront in Busua — look for BokoBoko / Obrobibini Peace Complex.`,
  },
  payment_received: {
    subject: 'Payment received — {{reference}}',
    heading: 'Payment received',
    preheader: 'We received your payment of {{amount}}.',
    body: `Hi {{firstName}},

Thank you. This is your receipt for the stay below.

{{stayCard}}

Amount paid: {{amount}}. Keep this email for your records.`,
  },
  booking_request: {
    subject: 'We received your booking request — {{reference}}',
    heading: 'Booking request received',
    preheader: 'Request {{reference}} is in. We will confirm shortly.',
    body: `Hi {{firstName}},

Thanks for requesting a stay at BokoBoko. Your dates are held while we arrange payment with you. We will email again once everything is confirmed.

{{stayCard}}

No further action is needed right now unless we get in touch about payment.`,
  },
  check_in_instructions: {
    subject: 'Check-in details for {{roomName}}',
    heading: 'Check-in instructions',
    preheader: 'How to find us and when to arrive.',
    body: `Hi {{firstName}},

Here is everything you need for arrival at BokoBoko Guesthouse in Busua.

{{stayCard}}

When: Check-in from 12:00 pm · Check-out by 11:00 am.

Where: Busua, Western Region, Ghana (Obrobibini Peace Complex). If you are coming by trotro or taxi from Takoradi / Agona, ask for Busua beach / BokoBoko.

On arrival: Come to the main house and we will show you to your room. Parking is available on site.

Need a late check-in or help with directions? Reply to this email or call +233 59 864 1683.`,
  },
  payment_pending: {
    subject: 'Complete payment to keep {{roomName}} — {{reference}}',
    heading: 'Payment still needed',
    preheader: 'Your dates are held pending payment.',
    body: `Hi {{firstName}},

Your room is held, but the stay is not fully confirmed until payment is received. Please complete payment so we can lock in your dates.

{{stayCard}}

If you have already paid, you can ignore this note — a confirmation will follow shortly.`,
  },
};

export const TEMPLATE_PLACEHOLDERS = [
  '{{firstName}}', '{{guestName}}', '{{guestEmail}}', '{{roomName}}',
  '{{checkIn}}', '{{checkOut}}', '{{nights}}', '{{guests}}',
  '{{reference}}', '{{amount}}', '{{stayCard}}',
];

function varsFor(data: EmailPayload): Record<string, string> {
  const first = data.guestName.trim().split(/\s+/)[0] || 'there';
  return {
    firstName: first,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    roomName: data.roomName,
    checkIn: fmtDate(data.checkIn),
    checkOut: fmtDate(data.checkOut),
    nights: nightsLine(data),
    guests: guestLine(data),
    reference: data.reference,
    amount: amountLine(data),
  };
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function bodyToHtml(body: string, data: EmailPayload, vars: Record<string, string>): string {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^\{\{stayCard\}\}$/.test(trimmed)) return stayCard(data);
    return p(escapeHtml(interpolate(trimmed, vars)).replace(/\n/g, '<br />'));
  }).join('');
}

function mergeCopy(type: EmailType, override?: Partial<EmailTemplateCopy> | null): EmailTemplateCopy {
  const base = DEFAULT_TEMPLATES[type];
  if (!override) return base;
  return {
    subject: override.subject?.trim() || base.subject,
    heading: override.heading?.trim() || base.heading,
    preheader: override.preheader?.trim() || base.preheader,
    body: override.body?.trim() || base.body,
  };
}

export function renderEmail(
  type: EmailType,
  data: EmailPayload,
  override?: Partial<EmailTemplateCopy> | null,
): { subject: string; html: string } {
  const copy = mergeCopy(type, override);
  const vars = varsFor(data);
  return {
    subject: interpolate(copy.subject, vars),
    html: layout(
      interpolate(copy.preheader, vars),
      interpolate(copy.heading, vars),
      bodyToHtml(copy.body, data, vars),
    ),
  };
}
