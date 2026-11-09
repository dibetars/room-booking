# BokoBoko booking API — data structures for ERP

Base URL (production): `https://book.bokoboko.org`

Auth:

| Surface | Auth |
|--------|------|
| Public (`/api/availability`, `/api/bookings`, `/api/settings`, `/api/promo-slides`, `/api/bookings/[ref]`) | None |
| Admin (`/api/admin/*` except `/api/admin/login`) | Session cookie `admin_token` after login |
| Webhooks / jobs | Provider signatures or `CRON_SECRET` — not for ERP pull |

Dates are `YYYY-MM-DD` unless noted. Money: **Beds24 / analytics revenue is USD**; **intent amounts and reports use GHS** (pesewas = GHS × 100). FX: `GHS_PER_USD` env (default `15.5`).

---

## 1. Core entities

### 1.1 Room

```ts
interface Room {
  id: number;              // Beds24 room id
  name: string;
  description: string;
  maxOccupancy: number;
  rackRateUSD: number;     // nightly rack rate (USD)
  photos: string[];        // site-relative paths, e.g. "/images/rooms/..."
}
```

Fixed catalog (property Beds24 `334193`):

| id | name |
|----|------|
| 691857 | Patience |
| 691859 | Regeneration |
| 691860 | Humility |
| 691861 | Wisdom |
| 691862 | Truth & Honesty |
| 691863 | Love |
| 691864 | Generosity |

### 1.2 Beds24 booking (channel source of truth)

Returned by admin bookings list (plus optional `intent`).

```ts
interface Beds24Booking {
  id?: number;
  propId?: number;
  roomId: number;
  arrival: string;           // YYYY-MM-DD
  departure: string;         // YYYY-MM-DD
  numAdult: number;
  numChild: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'confirmed' | 'request' | 'new' | 'cancelled';
  price?: number;            // total booking price in USD (Beds24)
  commission?: number;
  referer?: string;          // e.g. "BokoBoko Direct", "Booking.com", "BokoBoko Admin"
  info?: string;             // free text; often includes booking reference
  channel?: string;          // OTA channel from Beds24 GET (airbnb, booking.com, …)
}
```

**Status meaning (practical):**

| status | Typical meaning |
|--------|-----------------|
| `confirmed` | Confirmed stay (paid direct / admin / some OTA) |
| `new` | Often OTA bookings as they land |
| `request` | Hold / unpaid direct hold |
| `cancelled` | Cancelled |

### 1.3 Booking intent (direct / website / admin — Supabase)

Only exists for bookings created through this app (not pure OTA-only rows). Joined onto admin bookings when `beds24_booking_id` matches.

```ts
type IntentStatus =
  | 'DRAFT'
  | 'HELD'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'PAYMENT_FAILED'
  | 'RECONCILE_NEEDED'
  | 'CANCELLED';

interface BookingIntent {
  id: string;                       // UUID
  reference: string;                // e.g. "BKB-20261104-ABC123"
  status: IntentStatus;
  beds24_booking_id: number | null;
  room_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  amount_pesewas: number;           // GHS × 100
  currency: string;                 // "GHS"
  paystack_status: string | null;   // e.g. "manual", Paystack status, null while unpaid hold
  expires_at: string | null;        // ISO datetime for holds
  beds24_raw: unknown;
  paystack_raw: unknown;
  created_at: string;               // ISO
  updated_at: string;               // ISO
}
```

### 1.4 Discount (when applied)

```ts
interface DiscountResult {
  discountPct: number;   // e.g. 15
  label: string;         // "August Weekend — 15% off"
  code: string;          // "AUGUST_WEEKEND"
}
```

### 1.5 Guest message (Beds24 inbox)

```ts
interface Beds24Message {
  id: number;
  bookingId: number;
  roomId?: number;
  propertyId?: number;
  time: string;                 // ISO-ish timestamp from Beds24
  read?: boolean;
  message: string;
  source: 'guest' | 'host';
  authorOwnerId?: number | null;
}
```

---

## 2. Public pull / read endpoints

### `GET /api/availability`

**Query:** `checkIn`, `checkOut` (`YYYY-MM-DD`), `adults` (1–20), `children` (0–10)

```ts
interface AvailabilityResponse {
  rooms: Array<{
    roomId: number;
    name: string;
    description: string;
    maxOccupancy: number;
    photos: string[];
    available: boolean;
    unavailableReason?: 'occupancy_full' | 'dates_unavailable';
    totalPriceGHS: number;   // 0 if unavailable
    perNight: number;        // GHS
    rackRateUSD: number;
  }>;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
}
```

### `GET /api/bookings/[ref]`

**Path:** `ref` like `BKB-20261104-ABC123`

```ts
interface BookingByRefResponse {
  status: IntentStatus;
  checkIn: string;
  checkOut: string;
  roomName: string;
  amountGHS: number;
  expiresAt: string | null;
}
```

### `GET /api/settings`

```ts
{ paymentsEnabled: boolean }
```

### `GET /api/promo-slides`

```ts
{
  slides: Array<{
    id: string;
    enabled: boolean;
    accentColor: string;
    badge: string;
    title: string;
    body: string;
    bullets: string[];
    ctaLabel: string;
    ctaHref: string;
    imageUrl: string;
    openBooking?: boolean;
  }>
}
```

---

## 3. Admin pull endpoints (ERP-relevant)

Require logged-in admin session.

### `GET /api/admin/bookings` — **primary booking feed**

**Query:**

| param | default | notes |
|-------|---------|--------|
| `from` / `to` | derived from daysBack/daysAhead | `YYYY-MM-DD` |
| `daysBack` | `30` | used if `from` omitted |
| `daysAhead` | `60` | used if `to` omitted |
| `dateType` | `staying` | `staying` \| `checkin` \| `checkout` |

```ts
interface AdminBookingsResponse {
  bookings: Array<Beds24Booking & {
    intent: BookingIntent | null;   // null for pure OTA / no local intent
  }>;
  from: string;
  to: string;
  dateType: 'staying' | 'checkin' | 'checkout';
}
```

**ERP mapping tips:**

- Use `id` as Beds24 booking id (external key).
- Prefer `intent.reference` when present for website/admin bookings.
- Guest: `firstName` + `lastName`, `email`, `phone`.
- Stay: `arrival` / `departure`, `roomId`, `numAdult` / `numChild`.
- Revenue USD: `price`. Local GHS amount when intent exists: `intent.amount_pesewas / 100`.
- Channel: `channel` or parse `referer`.

### `GET /api/admin/rooms`

```ts
{ rooms: Room[] }
```

### `GET /api/admin/analytics`

Rolling window ~180 days back / 90 ahead. Revenue figures are **USD** (from Beds24 `price`).

```ts
interface AnalyticsResponse {
  totalRevenue: number;
  thisMonthRevenue: number;
  upcomingRevenue: number;
  avgBookingValue: number;
  totalConfirmed: number;
  monthlyRevenue: Array<{
    month: string;      // YYYY-MM
    label: string;      // e.g. "Nov '26"
    revenue: number;
    bookings: number;
    avgStay: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    revenue: number;
    bookings: number;
    share: number;      // percent 0–100
  }>;
  roomPerformance: Array<{
    roomId: number;
    name: string;
    revenue: number;
    bookings: number;
    totalNights: number;
    avgStay: number;
  }>;
}
```

### `GET /api/admin/reports`

| Call | Response |
|------|----------|
| (no query) | `{ reports: ReportSummary[] }` |
| `?period=YYYY-MM` | `{ report: MonthlyReport }` |
| `?check=prev` | `{ generated: boolean, period, report }` |

```ts
interface ReportSummary {
  period: string;
  generatedAt: string;
  totalBookings: number;
  totalRevenueGHS: number;
}

interface ReportEntry {
  label: string;
  count: number;
  revenue: number;   // GHS
}

interface MonthlyReport {
  period: string;            // YYYY-MM
  dateFrom: string;
  dateTo: string;
  generatedAt: string;       // ISO
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenueGHS: number;
  byChannel: ReportEntry[];
  byRoom: ReportEntry[];
  byStatus: ReportEntry[];
}
```

### `GET /api/admin/messages`

**Query:** optional `bookingId`, `daysBack` (default `90`)

```ts
interface MessagesResponse {
  conversations: Array<{
    bookingId: number;
    guestName: string;
    room: string;            // roomId as string when known
    arrival: string;
    referer?: string;
    messages: Beds24Message[];
    lastTime: string;
    unread: number;
  }>;
  messages: Beds24Message[]; // flat list
}
```

### `GET /api/admin/settings`

```ts
{
  paymentsEnabled: boolean;
  augustWeekendDiscount: boolean;
  emailOtpActive: boolean;
  emailOtpHint: string;      // masked, e.g. "yo***@example.com"
}
```

---

## 4. Write endpoints (for awareness; ERP usually pulls)

### `POST /api/bookings` (public create)

**Body:**

```ts
{
  roomId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: { name: string; email: string; phone?: string };
}
```

**Response (manual / Paystack off):** `{ reference, manual: true, discount? }`  
**Response (online payments on):** `{ reference, amountPesewas, expiresAt, discount? }`

### `POST /api/admin/bookings` (admin create)

**Body:** `roomId`, `checkIn`, `checkOut`, `adults`, `children`, `guestFirstName`, `guestLastName?`, `email?`, `phone?`, `notes?`, `priceGHS?`  
**Response:** `{ reference, beds24Id, discount? }`

### `PUT /api/admin/bookings/[id]`

**Body:** `{ action: 'cancel' | 'confirm' | 'mark_paid' }` → `{ ok: true }`  
`id` = Beds24 booking id.

---

## 5. Suggested ERP sync set

| ERP object | Best source | Keys |
|------------|-------------|------|
| Properties / rooms | `GET /api/admin/rooms` | `id` |
| Reservations | `GET /api/admin/bookings` | Beds24 `id`; optional `intent.reference` |
| Guests | fields on booking / intent | email (+ name) |
| Revenue (USD ops) | booking `price` or analytics | — |
| Revenue (GHS finance) | `intent.amount_pesewas` or monthly reports | — |
| Channels | `channel` / `referer` / report `byChannel` | — |

**Polling recommendation:** `GET /api/admin/bookings?from=…&to=…&dateType=staying` on a schedule; widen the window as needed. List responses are cached ~2 minutes server-side.

---

## 6. Out of scope for typical ERP pull

- `/api/admin/login`, email OTP, `/api/admin/emails` (template editor)
- `/api/admin/totp-setup` (legacy)
- `/api/webhooks/paystack`, `/api/webhooks/calendly`
- `/api/jobs/expire-holds`
- `/api/zoho/lead` (inbound CRM lead create)

---

## 7. Shared TypeScript source of truth

Canonical types live in the repo:

- `src/types/index.ts` — `BookingIntent`, `Beds24Booking`, availability/booking request types
- `src/lib/rooms.ts` — `RoomConfig` / room catalog
- `src/lib/reports.ts` — `MonthlyReport`
- `src/lib/beds24.ts` — `Beds24Message`
- `src/lib/discounts.ts` — `DiscountResult`
