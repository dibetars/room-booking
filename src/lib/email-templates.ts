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

function greet(pData: EmailPayload): string {
  const first = escapeHtml(pData.guestName.trim().split(/\s+/)[0] || 'there');
  return p(`Hi ${first},`);
}

export function renderEmail(type: EmailType, data: EmailPayload): { subject: string; html: string } {
  switch (type) {
    case 'booking_confirmed':
      return {
        subject: `Your stay at BokoBoko is confirmed — ${data.roomName}`,
        html: layout(
          `Your booking ${data.reference} is confirmed.`,
          'Your booking is confirmed',
          `${greet(data)}
           ${p('We look forward to welcoming you to BokoBoko in Busua. Your room is reserved — here are the details:')}
           ${stayCard(data)}
           ${p('Check-in is from 2:00&nbsp;pm. If you have questions before you arrive, just reply to this email.')}`
        ),
      };
    case 'booking_cancelled':
      return {
        subject: `Booking cancelled — ${data.reference}`,
        html: layout(
          `Your booking ${data.reference} has been cancelled.`,
          'Your booking has been cancelled',
          `${greet(data)}
           ${p('This reservation is no longer active. The dates have been released.')}
           ${stayCard(data)}
           ${p('If this was unexpected, reply to this email and we will help.')}`
        ),
      };
    case 'booking_reminder':
      return {
        subject: `See you in 3 days — ${data.roomName} at BokoBoko`,
        html: layout(
          `Your stay in ${data.roomName} starts soon.`,
          'Your stay is in 3 days',
          `${greet(data)}
           ${p('Just a reminder that your Busua getaway is almost here. Pack light, bring swimwear, and we will take care of the rest.')}
           ${stayCard(data)}
           ${p('Check-in from 2:00&nbsp;pm. We are on the beachfront in Busua — look for BokoBoko / Obrobibini Peace Complex.')}`
        ),
      };
    case 'payment_received':
      return {
        subject: `Payment received — ${data.reference}`,
        html: layout(
          `We received your payment of ${amountLine(data)}.`,
          'Payment received',
          `${greet(data)}
           ${p('Thank you. This is your receipt for the stay below.')}
           ${stayCard(data)}
           ${p(`Amount paid: <strong>${escapeHtml(amountLine(data))}</strong>. Keep this email for your records.`)}`
        ),
      };
    case 'booking_request':
      return {
        subject: `We received your booking request — ${data.reference}`,
        html: layout(
          `Request ${data.reference} is in. We will confirm shortly.`,
          'Booking request received',
          `${greet(data)}
           ${p('Thanks for requesting a stay at BokoBoko. Your dates are held while we arrange payment with you. We will email again once everything is confirmed.')}
           ${stayCard(data)}
           ${p('No further action is needed right now unless we get in touch about payment.')}`
        ),
      };
    case 'check_in_instructions':
      return {
        subject: `Check-in details for ${data.roomName}`,
        html: layout(
          'How to find us and when to arrive.',
          'Check-in instructions',
          `${greet(data)}
           ${p('Here is everything you need for arrival at BokoBoko Guesthouse in Busua.')}
           ${stayCard(data)}
           ${p('<strong>When:</strong> Check-in from 2:00&nbsp;pm · Check-out by 11:00&nbsp;am.')}
           ${p('<strong>Where:</strong> Busua, Western Region, Ghana (Obrobibini Peace Complex). If you are coming by trotro or taxi from Takoradi / Agona, ask for Busua beach / BokoBoko.')}
           ${p('<strong>On arrival:</strong> Come to the main house and we will show you to your room. Parking is available on site.')}
           ${p('Need a late check-in or help with directions? Reply to this email or call +233 59 864 1683.')}`
        ),
      };
    case 'payment_pending':
      return {
        subject: `Complete payment to keep ${data.roomName} — ${data.reference}`,
        html: layout(
          'Your dates are held pending payment.',
          'Payment still needed',
          `${greet(data)}
           ${p('Your room is held, but the stay is not fully confirmed until payment is received. Please complete payment so we can lock in your dates.')}
           ${stayCard(data)}
           ${p('If you have already paid, you can ignore this note — a confirmation will follow shortly.')}`
        ),
      };
  }
}
