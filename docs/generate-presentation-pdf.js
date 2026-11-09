const fs = require('fs');
const path = require('path');

// 16:9 widescreen slide in points (960 x 540 pt)
const W = 960;
const H = 540;

function esc(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '-');
}

function rgb(hex) {
  const h = hex.replace('#', '');
  const r = (parseInt(h.slice(0, 2), 16) / 255).toFixed(3);
  const g = (parseInt(h.slice(2, 4), 16) / 255).toFixed(3);
  const b = (parseInt(h.slice(4, 6), 16) / 255).toFixed(3);
  return `${r} ${g} ${b}`;
}

function wrapText(text, maxWidth, fontSize, isMono = false) {
  const charW = fontSize * (isMono ? 0.6 : 0.51);
  const maxChars = Math.max(10, Math.floor(maxWidth / charW));
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

class SlideCanvas {
  constructor(footerLabel) {
    this.ops = [];
    this.footerLabel = footerLabel;
  }
  ty(y) {
    return (H - y).toFixed(2);
  }
  rect(x, yTop, w, h, fillHex, strokeHex = null, lineWidth = 1) {
    const yBottom = H - yTop - h;
    this.ops.push('q');
    if (fillHex) this.ops.push(`${rgb(fillHex)} rg`);
    if (strokeHex) this.ops.push(`${rgb(strokeHex)} RG ${lineWidth} w`);
    const mode = fillHex && strokeHex ? 'B' : fillHex ? 'f' : 'S';
    this.ops.push(`${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${mode}`);
    this.ops.push('Q');
  }
  line(x1, y1Top, x2, y2Top, strokeHex = '#e2ddd2', lineWidth = 1) {
    this.ops.push('q');
    this.ops.push(`${rgb(strokeHex)} RG ${lineWidth} w`);
    this.ops.push(`${x1.toFixed(2)} ${this.ty(y1Top)} m ${x2.toFixed(2)} ${this.ty(y2Top)} l S`);
    this.ops.push('Q');
  }
  text(x, yTop, str, { font = 'F1', size = 12, color = '#1f241f' } = {}) {
    this.ops.push('q');
    this.ops.push(`${rgb(color)} rg`);
    this.ops.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${this.ty(yTop)} Td (${esc(str)}) Tj ET`);
    this.ops.push('Q');
  }
  paragraph(x, yTop, text, { width = 400, font = 'F1', size = 12, color = '#4a5248', lineHeight = 1.42 } = {}) {
    const isMono = font === 'F3';
    const lines = wrapText(text, width, size, isMono);
    let cy = yTop;
    for (const line of lines) {
      this.text(x, cy, line, { font, size, color });
      cy += size * lineHeight;
    }
    return cy;
  }
  bullets(x, yTop, items, { width = 380, size = 11.5, color = '#434b41', bulletColor = '#2d5a27', gap = 5 } = {}) {
    let cy = yTop;
    for (const item of items) {
      this.rect(x, cy - size + 4, 5, 5, bulletColor);
      cy = this.paragraph(x + 13, cy, item, { width: width - 14, font: 'F1', size, color, lineHeight: 1.38 });
      cy += gap;
    }
    return cy;
  }
  header(kickerLeft, kickerRight, title, subtitle = null, dark = false) {
    this.rect(0, 0, W, H, dark ? '#23471e' : '#fbf8f2');
    this.rect(0, 0, W, dark ? 8 : 6, dark ? '#BE6A45' : '#2d5a27');
    const kColor = dark ? '#bfd3bc' : '#6c746a';
    this.text(52, 38, kickerLeft.toUpperCase(), { font: 'F2', size: 9.5, color: kColor });
    this.text(W - 52 - kickerRight.length * 5.6, 38, kickerRight.toUpperCase(), { font: 'F2', size: 9.5, color: kColor });
    this.line(52, 48, W - 52, 48, dark ? '#386632' : '#e5dfd3', 0.8);

    if (title) {
      this.text(52, 82, title, { font: 'F2', size: 26, color: dark ? '#ffffff' : '#1b2619' });
    }
    if (subtitle) {
      this.paragraph(52, 106, subtitle, {
        width: W - 104,
        font: 'F1',
        size: 12.5,
        color: dark ? '#dce7da' : '#525b50',
      });
    }
  }
  footer(slideNum, totalSlides, dark = false) {
    const lineC = dark ? '#386632' : '#e5dfd3';
    const txtC = dark ? '#bfd3bc' : '#7b8279';
    this.line(52, H - 40, W - 52, H - 40, lineC, 0.8);
    this.text(52, H - 22, this.footerLabel, { font: 'F1', size: 9.5, color: txtC });
    const pageStr = `Slide ${slideNum} / ${totalSlides}`;
    this.text(W - 52 - pageStr.length * 5.2, H - 22, pageStr, { font: 'F2', size: 9.5, color: txtC });
  }
  card(x, yTop, w, h, { fill = '#ffffff', border = '#e4dfd3', stripe = null } = {}) {
    this.rect(x, yTop, w, h, fill, border, 1);
    if (stripe) {
      this.rect(x, yTop, 5, h, stripe);
    }
  }
  toStream() {
    return this.ops.join('\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DECK 1: ERP REPORTS ARCHITECTURE (5 slides)
// ═══════════════════════════════════════════════════════════════════════════
function buildReportsDeck() {
  const footer = 'BokoBoko Beach Resort  |  Document 1: ERP Reports Architecture Guide';
  const total = 5;
  const slides = [];

  // Slide 1: Cover
  {
    const s = new SlideCanvas(footer);
    s.header('BokoBoko Beach Resort  -  Busua, Ghana', 'Document 1  -  ERP Handover', '', null, true);
    s.rect(52, 130, 195, 24, '#366830');
    s.text(64, 146, 'ERP INTEGRATION GUIDE', { font: 'F2', size: 9.5, color: '#f3e5d7' });

    s.text(52, 200, 'How the BokoBoko Reports', { font: 'F2', size: 35, color: '#ffffff' });
    s.text(52, 242, 'Module Works for Your ERP', { font: 'F2', size: 35, color: '#e8c3ac' });

    s.paragraph(
      52,
      290,
      'A plain-English technical specification showing how BokoBoko turns reservation data into monthly booking, room, and channel revenue reports - so your ERP can pull or compute the exact same numbers directly.',
      { width: 820, font: 'F1', size: 14, color: '#e5efe4' }
    );

    s.card(52, 386, 270, 82, { fill: '#2c5627', border: '#44783e', stripe: '#BE6A45' });
    s.text(70, 412, '1. CALCULATION RULES', { font: 'F2', size: 10.5, color: '#f3e5d7' });
    s.text(70, 434, 'Slide 2', { font: 'F2', size: 14, color: '#ffffff' });
    s.text(70, 452, '4-step pipeline & exact formulas', { font: 'F1', size: 10.5, color: '#cfe0cd' });

    s.card(345, 386, 270, 82, { fill: '#2c5627', border: '#44783e', stripe: '#BE6A45' });
    s.text(363, 412, '2. DATA CONTRACT', { font: 'F2', size: 10.5, color: '#f3e5d7' });
    s.text(363, 434, 'Slides 3 - 4', { font: 'F2', size: 14, color: '#ffffff' });
    s.text(363, 452, 'Booking fields, room IDs & JSON output', { font: 'F1', size: 10.5, color: '#cfe0cd' });

    s.card(638, 386, 270, 82, { fill: '#2c5627', border: '#44783e', stripe: '#BE6A45' });
    s.text(656, 412, '3. ERP DATABASE TABLE', { font: 'F2', size: 10.5, color: '#f3e5d7' });
    s.text(656, 434, 'Slide 5', { font: 'F2', size: 14, color: '#ffffff' });
    s.text(656, 452, 'Ready-to-use SQL schema & GROUP BY', { font: 'F1', size: 10.5, color: '#cfe0cd' });

    s.footer(1, total, true);
    slides.push(s);
  }

  // Slide 2: 4-step pipeline
  {
    const s = new SlideCanvas(footer);
    s.header(
      'Reports Engine',
      'Calculation Pipeline',
      'How BokoBoko Builds a Monthly Report',
      'Every report is built in 4 straightforward steps. Your ERP can either call our report endpoint or run these same 4 rules on its own database.'
    );

    const steps = [
      {
        n: 'STEP 1',
        title: 'Filter by Check-In Date',
        body: 'Pull all bookings where check-in (arrival) falls inside [dateFrom, dateTo]. A stay checking in on Oct 30 belongs to October.',
      },
      {
        n: 'STEP 2',
        title: 'Normalize the Source',
        body: 'Translate channel / referer into clean names: Booking.com, Airbnb, Website, Admin, Hostelworld, or Expedia.',
      },
      {
        n: 'STEP 3',
        title: 'Convert USD to GHS',
        body: 'Multiply total booking price (USD) by GHS_PER_USD (15.5). If status is cancelled, revenue is set to GHS 0.',
      },
      {
        n: 'STEP 4',
        title: 'Group Into 3 Tables',
        body: 'Sum booking count and GHS revenue into 3 breakdowns: By Source, By Room, and By Status (sorted highest count first).',
      },
    ];

    steps.forEach((st, idx) => {
      const x = 52 + idx * 218;
      s.card(x, 148, 202, 185, { stripe: idx % 2 === 0 ? '#2d5a27' : '#BE6A45' });
      s.rect(x + 16, 164, 58, 20, '#e8efe6');
      s.text(x + 24, 178, st.n, { font: 'F2', size: 9.5, color: '#2d5a27' });
      s.text(x + 16, 206, st.title, { font: 'F2', size: 13, color: '#1b2619' });
      s.paragraph(x + 16, 228, st.body, { width: 170, size: 11, color: '#4c544a', lineHeight: 1.45 });
    });

    s.rect(52, 354, W - 104, 122, '#1f2a1d');
    s.text(72, 376, 'ACTUAL VS. PROJECTED REVENUE DISTINCTION FOR THE ERP', { font: 'F2', size: 10.5, color: '#e8c3ac' });
    s.text(72, 398, "1. Actual Revenue    : status IN ('confirmed','new') AND arrival <= TODAY   (earned / checked-in)", { font: 'F3', size: 10.5, color: '#f4f1ea' });
    s.text(72, 418, "2. Projected Revenue : status IN ('confirmed','new') AND arrival >  TODAY   (future on-the-books)", { font: 'F3', size: 10.5, color: '#f4f1ea' });
    s.text(72, 438, "3. Unpaid Pipeline   : status = 'request'                                   (holds; exclude from actual)", { font: 'F3', size: 10.5, color: '#f4f1ea' });
    s.text(72, 458, "4. Cancelled         : status = 'cancelled' -> GHS 0                        (FX: priceUSD * 15.5)", { font: 'F3', size: 10.5, color: '#f4f1ea' });

    s.footer(2, total);
    slides.push(s);
  }

  // Slide 3: Fields & Room Catalog
  {
    const s = new SlideCanvas(footer);
    s.header(
      'Data Contract',
      'Fields & Lookups',
      'Fields the ERP Needs Per Booking',
      'Only 7 fields per reservation are required to reproduce all BokoBoko financial and operational reports.'
    );

    s.card(52, 142, 495, 332);
    s.rect(52, 142, 495, 30, '#2d5a27');
    s.text(66, 161, 'FIELD', { font: 'F2', size: 10, color: '#ffffff' });
    s.text(190, 161, 'TYPE', { font: 'F2', size: 10, color: '#ffffff' });
    s.text(285, 161, 'HOW REPORTS USES IT', { font: 'F2', size: 10, color: '#ffffff' });

    const fieldRows = [
      ['id', 'number / text', 'Unique reservation ID (prevents duplicates)'],
      ['roomId', 'number', 'Maps to the 7 BokoBoko rooms (see table on right)'],
      ['arrival', 'YYYY-MM-DD', 'Primary filter: decides which month owns the stay'],
      ['departure', 'YYYY-MM-DD', 'Used to compute nights (departure - arrival)'],
      ['status', 'text', 'confirmed | new | request | cancelled'],
      ['price', 'number (USD)', 'Total booking price in USD (not nightly)'],
      ['channel / referer', 'text', 'Mapped to Website, Admin, Airbnb, Booking.com...'],
    ];
    fieldRows.forEach((r, i) => {
      const y = 192 + i * 40;
      if (i > 0) s.line(52, y - 16, 547, y - 16, '#eee9df', 0.7);
      s.text(66, y, r[0], { font: 'F3', size: 10.5, color: '#2d5a27' });
      s.text(190, y, r[1], { font: 'F1', size: 10.5, color: '#555d53' });
      s.text(285, y, r[2], { font: 'F1', size: 10.5, color: '#2b3329' });
    });

    s.card(568, 142, 340, 250);
    s.rect(568, 142, 340, 30, '#BE6A45');
    s.text(582, 161, 'ROOM ID', { font: 'F2', size: 10, color: '#ffffff' });
    s.text(668, 161, 'ROOM NAME', { font: 'F2', size: 10, color: '#ffffff' });
    s.text(815, 161, 'RACK USD', { font: 'F2', size: 10, color: '#ffffff' });

    const rooms = [
      ['691857', 'Patience', '$45 / night'],
      ['691859', 'Regeneration', '$45 / night'],
      ['691860', 'Humility', '$40 / night'],
      ['691861', 'Wisdom', '$40 / night'],
      ['691862', 'Truth & Honesty', '$50 / night'],
      ['691863', 'Love', '$40 / night'],
      ['691864', 'Generosity', '$50 / night'],
    ];
    rooms.forEach((rm, i) => {
      const y = 190 + i * 28;
      if (i > 0) s.line(568, y - 13, 908, y - 13, '#eee9df', 0.7);
      s.text(582, y, rm[0], { font: 'F3', size: 10, color: '#2d5a27' });
      s.text(668, y, rm[1], { font: 'F2', size: 10.5, color: '#232b22' });
      s.text(815, y, rm[2], { font: 'F1', size: 10, color: '#555d53' });
    });

    s.card(568, 404, 340, 70, { stripe: '#2d5a27' });
    s.text(584, 424, 'Source Fallback Rule', { font: 'F2', size: 11.5, color: '#1b2619' });
    s.paragraph(
      584,
      441,
      'If channel and referer are blank, the booking came from our website and is labeled "Website".',
      { width: 310, size: 10.5, color: '#4c544a' }
    );

    s.footer(3, total);
    slides.push(s);
  }

  // Slide 4: Report JSON & Pull Endpoints
  {
    const s = new SlideCanvas(footer);
    s.header(
      'Output & Endpoints',
      'ERP Pull Options',
      'Report JSON Shape & How the ERP Pulls Data',
      'Your partner can pull either raw bookings or finished monthly report objects.'
    );

    s.rect(52, 144, 420, 330, '#1f2a1d');
    s.text(68, 168, 'SAMPLE REPORT OBJECT (MonthlyReport)', { font: 'F2', size: 10, color: '#e8c3ac' });
    const jsonLines = [
      '{',
      '  "period": "2026-10",',
      '  "dateFrom": "2026-10-01",',
      '  "dateTo": "2026-10-31",',
      '  "totalBookings": 26,',
      '  "confirmedBookings": 21,',
      '  "cancelledBookings": 2,',
      '  "totalRevenueGHS": 48825,',
      '  "byChannel": [',
      '    { "label": "Website",     "count": 14, "revenue": 26350 },',
      '    { "label": "Booking.com", "count": 8,  "revenue": 15500 },',
      '    { "label": "Airbnb",      "count": 4,  "revenue": 6975 }',
      '  ],',
      '  "byRoom": [',
      '    { "label": "Generosity",  "count": 6,  "revenue": 11625 }',
      '  ],',
      '  "byStatus": [',
      '    { "label": "confirmed",   "count": 21, "revenue": 44000 }',
      '  ]',
      '}',
    ];
    jsonLines.forEach((ln, i) => {
      s.text(68, 190 + i * 13.5, ln, { font: 'F3', size: 9.6, color: '#f4f1ea' });
    });

    s.card(492, 144, 416, 156, { stripe: '#2d5a27' });
    s.text(512, 168, 'Option A: ERP Computes Reports Locally', { font: 'F2', size: 13.5, color: '#1b2619' });
    s.bullets(
      512,
      190,
      [
        'Pull raw bookings from GET /api/admin/bookings (or upstream).',
        'Store rows in erp_reservations (see SQL on Slide 5).',
        'Run 3 GROUP BY queries: by channel_label, room_name, and status.',
        'Best when the ERP needs guest-level drill-down and custom periods.',
      ],
      { width: 380, size: 11 }
    );

    s.card(492, 316, 416, 158, { stripe: '#BE6A45' });
    s.text(512, 340, 'Option B: ERP Pulls Ready-Made Reports', { font: 'F2', size: 13.5, color: '#1b2619' });
    s.bullets(
      512,
      362,
      [
        'GET /api/admin/reports?period=YYYY-MM fetches a saved monthly report.',
        'POST /api/admin/reports with { dateFrom, dateTo } generates any range.',
        'Zero calculation code required inside the ERP.',
      ],
      { width: 380, size: 11, bulletColor: '#BE6A45' }
    );

    s.footer(4, total);
    slides.push(s);
  }

  // Slide 5: Recommended ERP SQL Table & Rollup Queries
  {
    const s = new SlideCanvas(footer);
    s.header(
      'Database Design',
      'SQL Blueprint',
      'Recommended ERP Table & Rollup Queries',
      'One normalized table lets the ERP reproduce every BokoBoko report with simple GROUP BY statements.'
    );

    s.rect(52, 144, 465, 330, '#1f2a1d');
    s.text(68, 166, 'SQL SCHEMA: erp_reservations', { font: 'F2', size: 10, color: '#e8c3ac' });
    const sqlLines = [
      'CREATE TABLE erp_reservations (',
      '  id              BIGSERIAL PRIMARY KEY,',
      '  external_source TEXT NOT NULL, -- direct|airbnb|booking',
      '  external_id     TEXT NOT NULL,',
      '  booking_ref     TEXT,          -- BKB-YYYYMMDD-XXXXXX',
      '  room_id         INTEGER NOT NULL,',
      '  room_name       TEXT NOT NULL,',
      '  guest_name      TEXT,',
      '  arrival         DATE NOT NULL,',
      '  departure       DATE NOT NULL,',
      '  status          TEXT NOT NULL, -- confirmed|new|cancelled',
      '  channel_label   TEXT NOT NULL, -- Website|Airbnb|Booking.com',
      '  price_usd       NUMERIC(12,2) DEFAULT 0,',
      '  fx_ghs_per_usd  NUMERIC(10,4) DEFAULT 15.5,',
      '  revenue_ghs     NUMERIC(14,2) GENERATED ALWAYS AS (',
      "    CASE WHEN status = 'cancelled' THEN 0",
      '         ELSE ROUND(price_usd * fx_ghs_per_usd, 2) END',
      '  ) STORED,',
      '  UNIQUE (external_source, external_id)',
      ');',
    ];
    sqlLines.forEach((ln, i) => {
      s.text(68, 188 + i * 13.5, ln, { font: 'F3', size: 9.3, color: '#f4f1ea' });
    });

    s.card(536, 144, 372, 330, { stripe: '#2d5a27' });
    s.text(556, 170, '3 Queries That Build the Report', { font: 'F2', size: 14, color: '#1b2619' });
    s.paragraph(
      556,
      192,
      'Filter all queries with: WHERE arrival BETWEEN :dateFrom AND :dateTo',
      { width: 335, font: 'F2', size: 10.5, color: '#2d5a27' }
    );
    s.bullets(
      556,
      222,
      [
        'By Source: SELECT channel_label AS label, COUNT(*), SUM(revenue_ghs) FROM erp_reservations GROUP BY channel_label ORDER BY COUNT(*) DESC;',
        'By Room: SELECT room_name AS label, COUNT(*), SUM(revenue_ghs) FROM erp_reservations GROUP BY room_name ORDER BY COUNT(*) DESC;',
        'By Status: SELECT status AS label, COUNT(*), SUM(revenue_ghs) FROM erp_reservations GROUP BY status ORDER BY COUNT(*) DESC;',
      ],
      { width: 332, size: 10.5, gap: 10 }
    );

    s.footer(5, total);
    slides.push(s);
  }

  return slides;
}

// ═══════════════════════════════════════════════════════════════════════════
// DECK 2: DIRECT CHANNEL MANAGEMENT WITHOUT BEDS24 (4 slides)
// ═══════════════════════════════════════════════════════════════════════════
function buildChannelsDeck() {
  const footer = 'BokoBoko Beach Resort  |  Document 2: Managing Booking.com & Airbnb Directly';
  const total = 4;
  const slides = [];

  // Slide 1: Cover
  {
    const s = new SlideCanvas(footer);
    s.header('BokoBoko Beach Resort  -  Busua, Ghana', 'Document 2  -  Channel Strategy', '', null, true);
    s.rect(52, 130, 225, 24, '#366830');
    s.text(64, 146, 'PLAIN-ENGLISH OPERATIONS GUIDE', { font: 'F2', size: 9.5, color: '#f3e5d7' });

    s.text(52, 200, 'Managing Booking.com & Airbnb', { font: 'F2', size: 34, color: '#ffffff' });
    s.text(52, 242, 'Directly Without Beds24', { font: 'F2', size: 34, color: '#e8c3ac' });

    s.paragraph(
      52,
      290,
      'Why Beds24 is optional, how our website bookings already work on their own, and how we can connect Airbnb and Booking.com directly to BokoBoko and our partner ERP.',
      { width: 820, font: 'F1', size: 14, color: '#e5efe4' }
    );

    s.card(52, 386, 270, 82, { fill: '#2c5627', border: '#44783e', stripe: '#BE6A45' });
    s.text(70, 412, '1. WHY BEDS24 IS OPTIONAL', { font: 'F2', size: 10.5, color: '#f3e5d7' });
    s.text(70, 434, 'Slide 2', { font: 'F2', size: 14, color: '#ffffff' });
    s.text(70, 452, 'What is already 100% ours vs OTA sync', { font: 'F1', size: 10.5, color: '#cfe0cd' });

    s.card(345, 386, 270, 82, { fill: '#2c5627', border: '#44783e', stripe: '#BE6A45' });
    s.text(363, 412, '2. DIRECT SETUP (NO BEDS24)', { font: 'F2', size: 10.5, color: '#f3e5d7' });
    s.text(363, 434, 'Slide 3', { font: 'F2', size: 14, color: '#ffffff' });
    s.text(363, 452, 'Two-way iCal + Email/CSV parser', { font: 'F1', size: 10.5, color: '#cfe0cd' });

    s.card(638, 386, 270, 82, { fill: '#2c5627', border: '#44783e', stripe: '#BE6A45' });
    s.text(656, 412, '3. COMPARISON & CUTOVER', { font: 'F2', size: 10.5, color: '#f3e5d7' });
    s.text(656, 434, 'Slide 4', { font: 'F2', size: 14, color: '#ffffff' });
    s.text(656, 452, 'Trade-offs & 3-step rollout plan', { font: 'F1', size: 10.5, color: '#cfe0cd' });

    s.footer(1, total, true);
    slides.push(s);
  }

  // Slide 2: Do we need Beds24?
  {
    const s = new SlideCanvas(footer);
    s.header(
      'The Big Picture',
      'Plain-English Explanation',
      'Why Do We Have Beds24, and Can We Drop It?',
      'Beds24 is just a calendar switchboard. We do NOT need it to take website bookings, and we CAN connect to Airbnb & Booking.com directly.'
    );

    s.card(52, 150, 272, 318, { stripe: '#2d5a27' });
    s.text(72, 178, '1. Website Bookings', { font: 'F2', size: 15, color: '#1b2619' });
    s.text(72, 198, 'Already 100% Independent', { font: 'F2', size: 11, color: '#2d5a27' });
    s.bullets(
      72,
      224,
      [
        'Guests book on book.bokoboko.org.',
        'Saved directly in our own Supabase database (booking_intents).',
        'Paid via Paystack or manual bank/MoMo transfer.',
        'Confirmation emails sent directly via Resend.',
        'Needs zero third-party channel manager.',
      ],
      { width: 236, size: 11 }
    );

    s.card(344, 150, 272, 318, { stripe: '#BE6A45' });
    s.text(364, 178, '2. Airbnb & Booking.com', { font: 'F2', size: 15, color: '#1b2619' });
    s.text(364, 198, 'Why Calendar Sync Matters', { font: 'F2', size: 11, color: '#BE6A45' });
    s.bullets(
      364,
      224,
      [
        'If someone books "Patience" on Airbnb for Dec 10-12, Booking.com and our Website must block Dec 10-12.',
        'Today, Beds24 relays that block.',
        'Without Beds24, our own app can exchange iCal (.ics) calendar links directly with Airbnb & Booking.com for free.',
      ],
      { width: 236, size: 11, bulletColor: '#BE6A45' }
    );

    s.card(636, 150, 272, 318, { stripe: '#6c746a' });
    s.text(656, 178, '3. Why Not Direct APIs?', { font: 'F2', size: 15, color: '#1b2619' });
    s.text(656, 198, 'The Industry Catch', { font: 'F2', size: 11, color: '#555d53' });
    s.bullets(
      656,
      224,
      [
        'Airbnb & Booking.com lock their real-time APIs behind "PMS Partner" certification programs.',
        'They rarely grant direct API keys to a single resort.',
        'However, BOTH platforms give every host free, built-in iCal calendar import/export links.',
      ],
      { width: 236, size: 11, bulletColor: '#6c746a' }
    );

    s.footer(2, total);
    slides.push(s);
  }

  // Slide 3: How Direct Management Works
  {
    const s = new SlideCanvas(footer);
    s.header(
      'Direct Setup Blueprint',
      'No Intermediary',
      'How to Manage Airbnb & Booking.com Directly',
      'We make our own Supabase / ERP database the master calendar and connect Airbnb & Booking.com with two simple mechanisms:'
    );

    s.card(52, 148, 418, 246, { stripe: '#2d5a27' });
    s.text(72, 174, 'Mechanism A: Two-Way iCal Calendar Sync', { font: 'F2', size: 14.5, color: '#1b2619' });
    s.text(72, 193, 'Prevents double bookings across all channels ($0/month)', { font: 'F2', size: 10.5, color: '#2d5a27' });
    s.bullets(
      72,
      218,
      [
        'Outbound (.ics export): BokoBoko publishes 7 calendar URLs (one per room, e.g. /api/ical/691857.ics). Paste them into Airbnb & Booking.com "Import Calendar".',
        'Inbound (.ics import): Copy each room\'s "Export Calendar" link from Airbnb & Booking.com into BokoBoko.',
        'Our server checks those links every 10-15 minutes and blocks booked dates automatically.',
      ],
      { width: 382, size: 11 }
    );

    s.card(490, 148, 418, 246, { stripe: '#BE6A45' });
    s.text(510, 174, 'Mechanism B: OTA Price & Guest Data into ERP', { font: 'F2', size: 14.5, color: '#1b2619' });
    s.text(510, 193, 'Fills in guest name & payout amount for ERP reports', { font: 'F2', size: 10.5, color: '#BE6A45' });
    s.bullets(
      510,
      218,
      [
        'Why needed: iCal links only share blocked dates, not the payout price or guest email.',
        'Automated option: Auto-forward Airbnb & Booking.com confirmation emails to an inbound webhook that parses guest name, room, dates, and payout into the ERP.',
        'Simple option: Upload the monthly earnings CSV from Airbnb & Booking.com into the ERP.',
      ],
      { width: 382, size: 11, bulletColor: '#BE6A45' }
    );

    s.rect(52, 412, W - 104, 62, '#1f2a1d');
    s.text(72, 437, 'DIRECT DATA FLOW (ZERO BEDS24):', { font: 'F2', size: 10, color: '#e8c3ac' });
    s.text(
      72,
      456,
      'Airbnb & Booking.com   <--[ Two-Way .ics Links + Email/CSV Parser ]-->   BokoBoko DB & Partner ERP',
      { font: 'F3', size: 11.2, color: '#ffffff' }
    );

    s.footer(3, total);
    slides.push(s);
  }

  // Slide 4: Comparison & Cutover Plan
  {
    const s = new SlideCanvas(footer);
    s.header(
      'Decision Matrix & Rollout',
      'Trade-Offs & Steps',
      'Comparison & 3-Step Cutover Plan',
      'How keeping Beds24 compares to running directly via iCal + Email/CSV.'
    );

    s.card(52, 142, W - 104, 210);
    s.rect(52, 142, W - 104, 28, '#2d5a27');
    s.text(68, 160, 'CRITERIA', { font: 'F2', size: 9.5, color: '#ffffff' });
    s.text(280, 160, 'KEEP BEDS24 (CURRENT)', { font: 'F2', size: 9.5, color: '#ffffff' });
    s.text(535, 160, 'DIRECT ICAL + EMAIL/CSV (NO BEDS24)', { font: 'F2', size: 9.5, color: '#ffffff' });

    const rows = [
      ['Monthly Fee & Sync Speed', 'Small monthly fee  |  Instant sync', '$0 / month  |  Syncs every 15-30 min'],
      ['Double-Booking Risk', 'Virtually zero', 'Low (only if 2 guests book within ~15 min)'],
      ['Where Room Prices Are Edited', 'One place', 'In Website, Airbnb & Booking.com separately'],
      ['Guest & Revenue Data in ERP', 'Automatic via API', 'Automatic via email parser or CSV import'],
      ['Engineering Time to Launch', '0 days (already live)', '3 - 5 days of build work'],
    ];

    rows.forEach((r, i) => {
      const y = 188 + i * 32;
      if (i > 0) s.line(52, y - 14, W - 52, y - 14, '#eee9df', 0.8);
      s.text(68, y, r[0], { font: 'F2', size: 10, color: '#1b2619' });
      s.text(280, y, r[1], { font: 'F1', size: 10, color: '#3b4339' });
      s.text(535, y, r[2], { font: 'F2', size: 10, color: '#2d5a27' });
    });

    // 3-step cutover bar at bottom
    const steps = [
      ['Step 1: Master Calendar in Supabase/ERP', 'Store direct bookings & date blocks locally first.'],
      ['Step 2: Build iCal + Email/CSV Feed (3-5d)', 'Add 7 room .ics links + 15-min poller + OTA parser.'],
      ['Step 3: Link OTAs & Cancel Beds24', 'Paste .ics URLs into Airbnb & Booking.com, then turn off Beds24.'],
    ];
    steps.forEach((st, idx) => {
      const x = 52 + idx * 292;
      s.card(x, 368, 272, 104, { stripe: idx === 1 ? '#BE6A45' : '#2d5a27' });
      s.text(x + 16, 392, st[0], { font: 'F2', size: 11, color: '#1b2619' });
      s.paragraph(x + 16, 412, st[1], { width: 240, size: 10.5, color: '#4c544a' });
    });

    s.footer(4, total);
    slides.push(s);
  }

  return slides;
}

function writePdf(slides, outPath) {
  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObj('');
  const pagesId = addObj('');
  const fontRegularId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const fontMonoId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');

  const pageIds = [];
  for (const slide of slides) {
    const stream = slide.toStream();
    const contentId = addObj(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  fs.writeFileSync(outPath, Buffer.from(pdf, 'binary'));
}

const pdf1 = path.resolve(__dirname, 'bokoboko-erp-reports-presentation.pdf');
const pdf2 = path.resolve(__dirname, 'bokoboko-direct-channels-presentation.pdf');

writePdf(buildReportsDeck(), pdf1);
writePdf(buildChannelsDeck(), pdf2);

console.log('Wrote:', pdf1);
console.log('Wrote:', pdf2);
