# BokoBoko Booking Platform — Handoff Document

> A direct booking engine + admin dashboard for BokoBoko Guesthouse, an
> eco-friendly beachfront accommodation in Busua, Western Region, Ghana.
> Live at https://book.bokoboko.org

---

## 1. Project Goal & Current Status

**Goal:** A self-hosted direct-booking website that lets guests check
availability and book rooms without OTA commission, integrated with the
property's Beds24 channel manager, plus an admin dashboard for the property
manager to view/manage bookings, revenue, and rooms across all channels
(direct, Booking.com, Airbnb, etc.).

**Status: LIVE in production.** Deployed on **Vercel** (auto-detects Next.js).
A prior Coolify/Nixpacks deployment exists in config but Vercel is now primary.

**Important current operational state:**
- **Online payments are OFF (manual mode).** Paystack is having issues, so the
  site is running in "Request to Book" mode: guests submit requests, dates are
  held in Beds24, and the property arranges payment offline. Toggle back on via
  **Admin → Settings** when Paystack is fixed.
- The `app_settings` Supabase table **has been created** (migration run), so the
  payments toggle persists.

---

## 2. Architecture / Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16.2.9** (App Router, Turbopack, React 19.2) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS (utility classes inline; brand greens `#2d5a27`/`#1a3518`, terracotta `#BE6A45`, cream `#f5f0e8`) |
| Channel manager | **Beds24 V2 REST API** (`/bookings`, `/inventory/rooms/*`, `/messages`) |
| Payments | **Paystack** inline popup (GHS), HMAC-SHA512 webhooks |
| Database | **Supabase** (Postgres) via `@supabase/supabase-js`, service-role key, server-only |
| Validation | **Zod** at all API boundaries |
| CRM (secondary) | **Zoho** via Calendly webhook + lead form (a separate `/demo` funnel) |
| Hosting | Vercel |

**Data flow (booking):** Guest searches → `/api/availability` (Beds24 live
check) → selects room → `/api/bookings` → creates Beds24 booking + Supabase
`booking_intents` record → (pay mode) Paystack popup → webhook confirms; (manual
mode) "request received" message.

**Auth:** Admin area gated by edge **middleware**. Login compares a password,
issues an HMAC-signed expiring session token cookie. No user accounts — single
shared admin password.

---

## 3. File / Module Map

### Config (root)
| File | Purpose |
|------|---------|
| `next.config.ts` | Security headers (CSP, HSTS, X-Frame-Options, etc.). CSP allows Paystack/Calendly/Google Fonts; `'unsafe-eval'` only in dev. |
| `nixpacks.toml` | Legacy Coolify build config (`npm run start`). Dead weight now on Vercel. |
| `.env.example` | Env var template (see §6). |
| `public/robots.txt` | Disallows `/admin` from indexing; references `/sitemap.xml` (not yet created). |

### `src/lib/` (server logic)
| File | Purpose |
|------|---------|
| `beds24.ts` | Beds24 V2 client. Token caching (23h, refresh on 401), `checkAvailability`, `getRoomOffers`, `createBooking`, `updateBookingStatus`, `getBookings`, `getMessages`/`sendMessage`, `refreshTokenForCron`. |
| `paystack.ts` | `initializeTransaction`, `verifyTransaction`, `verifyWebhookSignature` (HMAC-SHA512, length-guarded `timingSafeEqual`). |
| `supabase.ts` | Lazy singleton client. `booking_intents` CRUD, `room_overrides`, `app_settings` (`getSetting`/`setSetting`), `getExpiredHeldIntents`. |
| `rooms.ts` | Static `ROOMS` config (7 rooms, IDs from Beds24 property 334193, names, USD rack rates $40–$50, occupancy, photos). |
| `admin-session.ts` | HMAC-signed expiring session tokens via Web Crypto (works in edge + node). `createSessionToken`/`verifySessionToken`. |
| `rate-limit.ts` | In-memory fixed-window limiter, `getClientIp`. |
| `server-cache.ts` | In-memory TTL cache `withCache(key, ttl, fn)` + `invalidate(prefix)`. |
| `structured-data.ts` | `lodgingBusinessSchema()` → schema.org JSON-LD for SEO/AI search. |
| `booking-ref.ts` | `generateReference()` for booking references. |
| `zoho.ts` | Zoho CRM helpers (`createLead`, `createContact`, `createMeeting`) — secondary funnel. |

### `src/app/api/` (routes)
| Route | Purpose |
|------|---------|
| `availability/route.ts` | Public GET. Beds24 availability + USD pricing. Rate limited 20/min/IP. |
| `bookings/route.ts` | Public POST. **Branches on payments toggle** (manual vs Paystack). Rate limited 8/10min/IP + dedupe. |
| `bookings/[ref]/route.ts` | Public GET. Booking status polling (for `/confirm`). |
| `settings/route.ts` | Public GET `{ paymentsEnabled }` — tells UI which booking flow to render. |
| `webhooks/paystack/route.ts` | Paystack webhook: signature verify → re-verify txn → amount/currency guard → idempotent confirm in Beds24 with retry. |
| `webhooks/calendly/route.ts` | Calendly webhook → Zoho. **Fails closed** if signing key unset. |
| `zoho/lead/route.ts` | Public lead form POST. Rate limited 10/10min/IP. |
| `jobs/expire-holds/route.ts` | Cron (header `x-cron-secret`, constant-time check). Releases expired holds, keeps Beds24 token warm. |
| `admin/login/route.ts` | POST (password → session cookie, rate limited 6/15min/IP), DELETE (logout). |
| `admin/bookings/route.ts` | GET (Beds24 + intents merged, cached 2min), POST (manual booking by admin). |
| `admin/bookings/[id]/route.ts` | PUT confirm/cancel/mark_paid. **Invalidates bookings + analytics caches.** |
| `admin/analytics/route.ts` | GET aggregated revenue/channel/room data (cached 5min). Counts `confirmed`+`new`. |
| `admin/rooms/route.ts` | GET (ROOMS + overrides, cached 10min), PUT (upsert override). |
| `admin/messages/route.ts` | GET/POST Beds24 messages (UI is stubbed). |
| `admin/settings/route.ts` | GET/PUT payments toggle (auth-protected). |

### `src/app/` (pages)
| Page | Purpose |
|------|---------|
| `page.tsx` | Homepage. Hero search, room results, **checkout modal (pay vs manual flow)**, about/amenities/contact, footer. |
| `checkout/page.tsx`, `rooms/page.tsx` | Legacy alt booking path (not linked from main nav). |
| `confirm/[ref]/page.tsx` | Post-payment confirmation, polls status. |
| `demo/page.tsx` | Calendly/Zoho lead funnel (separate feature). |
| `layout.tsx` | Root metadata (tagline, OG/Twitter), injects JSON-LD in `<head>`. |
| `admin/layout.tsx` | Sidebar shell (excludes `/admin/login`). |
| `admin/_components/AdminNav.tsx` | Left sidebar: Bookings/Messages/Revenue/Rooms/Settings + New Booking/Logout. |
| `admin/page.tsx` | Bookings dashboard: stats, filters, lookback selector (30/90/180/365d), channel badges, detail modal, CSV export. |
| `admin/revenue/page.tsx` | Stat cards, monthly bar chart, channel breakdown, avg-stay table. |
| `admin/rooms/page.tsx` | Room performance + edit modal (`room_overrides`). |
| `admin/new-booking/page.tsx` | 2-col manual booking form with live summary card. |
| `admin/settings/page.tsx` | Payments on/off toggle. |
| `admin/messages/page.tsx` | "Coming soon" placeholder. |
| `admin/login/page.tsx` | Password login. |

### `src/middleware.ts`
Edge middleware. Allowlists `/admin/login` + `/api/admin/login`; else requires a
valid signed session cookie (async `verifySessionToken`). Matcher:
`['/admin/:path*', '/api/admin/:path*']`.

### `src/types/index.ts`
`IntentStatus` union, `BookingIntent`, `RoomAvailability`, `Beds24Booking`, etc.

---

## 4. Key Code Snippets (current working state)

### Payments toggle — booking flow branch (`src/app/api/bookings/route.ts`)
```typescript
const reference = generateReference();
const paymentsEnabled = await getSetting<boolean>('payments_enabled', false);
const [firstName, ...rest] = guest.name.split(' ');

if (!paymentsEnabled) {
  // Manual mode: real Beds24 booking, property collects payment offline
  const beds24Result = await createBooking({
    roomId, arrival: checkIn, departure: checkOut,
    numAdult: adults, numChild: children,
    guestFirstName: firstName, guestLastName: rest.join(' ') || firstName,
    email: guest.email, phone: guest.phone,
    status: 'new', // blocks dates, shown in admin to confirm
    price: room.rackRateUSD * nights,
    referer: 'BokoBoko Direct',
    info: `Ref: ${reference} — manual payment (Paystack disabled)`,
  });
  await createIntent({
    reference, status: 'PAYMENT_PENDING',  // expires_at=null keeps cron away
    beds24_booking_id: beds24Result.id, /* ...guest, amount... */
    paystack_status: 'manual', expires_at: null,
    paystack_raw: { source: 'manual_mode' },
  });
  return NextResponse.json({ reference, manual: true });
}
// else: Paystack hold flow (status 'request', intent 'HELD', 30-min expiry)
```

### Signed admin session (`src/lib/admin-session.ts`)
```typescript
// Token = `${expiresAt}.${HMAC-SHA256(expiresAt, ADMIN_SECRET)}`
export async function createSessionToken(secret: string, ttlMs = 7*24*60*60*1000) {
  const expiresAt = Date.now() + ttlMs;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(String(expiresAt)));
  return `${expiresAt}.${toHex(sig)}`;
}
export async function verifySessionToken(token: string, secret: string) {
  const [expiresAtStr, sig] = token.split('.');
  if (!expiresAtStr || !sig) return false;
  if (!Number(expiresAtStr) || Date.now() > Number(expiresAtStr)) return false;
  const expected = await crypto.subtle.sign('HMAC', await getKey(secret),
    encoder.encode(expiresAtStr));
  return timingSafeEqualHex(toHex(expected), sig); // constant-time
}
```

### Server cache + invalidation (`src/lib/server-cache.ts`)
```typescript
export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>) {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.data as T;
  const data = await fn();
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}
export function invalidate(prefix: string) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
// TTLs: bookings 2min, analytics 5min, rooms 10min.
// Invalidated on: new booking, room edit, confirm/cancel/mark_paid action.
```

### Analytics revenue filter — counts OTA bookings (`src/app/api/admin/analytics/route.ts`)
```typescript
// OTA bookings (Booking.com/Airbnb) arrive as 'new'; direct paid as 'confirmed'.
const confirmed = all.filter((b) => b.status === 'confirmed' || b.status === 'new');
```

### Beds24 token caching (`src/lib/beds24.ts`)
```typescript
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const res = await fetch(`${BASE_URL}/authentication/token`, {
    headers: { refreshToken: process.env.BEDS24_REFRESH_TOKEN! },
  });
  const json = await res.json();
  cachedToken = json.token;
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken!;
}
```

### Paystack webhook safety (`src/app/api/webhooks/paystack/route.ts`)
Signature verify → re-verify with Paystack API → **guard amount/currency match**
→ mark PAID → confirm Beds24 with 5× retry → CONFIRMED (else RECONCILE_NEEDED).
Idempotent (skips if already CONFIRMED).

---

## 5. Open Issues / TODOs / Pending Decisions

| Item | Notes |
|------|-------|
| 🔴 **Rotate Paystack secret key** | A live `sk_live_…` key was committed to git history (now removed from files but recoverable in history). Rotate in Paystack dashboard, update Vercel env. |
| 🔴 **Rotate legacy Smoobu key** | Also exposed in history; Smoobu integration removed but key still live if account exists. |
| 🟠 **Re-enable payments** | Once Paystack is fixed: switch test→live keys, update webhook URL to `https://book.bokoboko.org/api/webhooks/paystack`, flip Admin → Settings toggle ON. |
| 🟠 **`ADMIN_PASSWORD` / `ADMIN_SECRET` missing from `.env.example`** | Both are required (used in login route, session, middleware) but not documented in the template. Add them. |
| 🟡 **No `sitemap.xml`** | `robots.txt` references it but it doesn't exist. Add a Next.js `sitemap.ts`. |
| 🟡 **Messages module stubbed** | Beds24 `/messages` API client exists; inbox UI is "coming soon" pending channel-support validation. |
| 🟡 **Validate JSON-LD** | Run Google Rich Results Test against live domain post-deploy. |
| 🟢 **Legacy code** | `checkout/`, `rooms/` pages + `nixpacks.toml` are unused on Vercel — candidates for removal. |
| 🟢 **`middleware.ts` deprecation** | Next 16 warns to rename `middleware` → `proxy`. Warning only, not failing. |

**Required Supabase tables** (migrations):
```sql
CREATE TABLE IF NOT EXISTS booking_intents (...);  -- core, exists
CREATE TABLE IF NOT EXISTS room_overrides (
  room_id INTEGER PRIMARY KEY, name TEXT, description TEXT,
  max_occupancy INTEGER, rack_rate_usd NUMERIC(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY, value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW());  -- created
```

---

## 6. Conventions, Constraints & Patterns

**Security (hard constraints):**
- NEVER commit `.env*` or any secrets. `.env`/`server/.env` were untracked.
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never `NEXT_PUBLIC_`.
- Webhook verification uses **raw body** for HMAC, not parsed JSON.
- Secret/signature comparisons use length-guarded `timingSafeEqual`.

**Pricing:** Beds24 `price` field is in property base currency (**USD**). Display
prices are USD everywhere (no GHS shown to guests). Paystack charges in GHS
pesewas via `GHS_PER_USD`. The display path uses `rackRateUSD` **directly** —
never round-trip through GHS (that caused an inflation bug).

**Patterns:**
- Supabase client is a **lazy singleton** (avoids build-time crash when env unset).
- New optional data (room overrides, settings) uses Supabase tables with
  **graceful fallback** to defaults if the table is absent.
- Server-side aggregation for analytics (never send raw booking arrays to client).
- API routes validate input with **Zod**; rate-limit public endpoints per-IP.
- In-memory caches reset on redeploy (acceptable).

**Beds24 booking statuses:** `request` = unpaid direct hold (cron-expirable),
`new` = OTA/manual booking (counts as revenue, needs confirm), `confirmed` =
paid/confirmed, `cancelled`. `referer` field identifies channel.

**Naming/UI:** Brand colors greens `#2d5a27`/`#1a3518`, terracotta `#BE6A45`,
cream `#f5f0e8`. Admin uses left-sidebar + main-content layout. Docs go in
`/docs` (never root). Git: feature commits, push only when asked, co-author
trailer on commits.

**Environment variables** (`.env.example` + the two undocumented admin vars):
```
BEDS24_REFRESH_TOKEN=
PAYSTACK_SECRET_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
ADMIN_PASSWORD=          # required — NOT in .env.example
ADMIN_SECRET=            # required — NOT in .env.example
NEXT_PUBLIC_BASE_URL=https://book.bokoboko.org
GHS_PER_USD=15.5
NEXT_PUBLIC_GHS_PER_USD=15.5
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
ZOHO_CLIENT_ID=  ZOHO_CLIENT_SECRET=  ZOHO_REFRESH_TOKEN=
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
ZOHO_API_URL=https://www.zohoapis.com/crm/v2
NEXT_PUBLIC_CALENDLY_URL=
CALENDLY_WEBHOOK_SIGNING_KEY=
```

**Repo:** `github.com/dibetars/room-booking`, default branch `main`.
Key docs: `docs/flow.md` (build history), `docs/updates-2026-06.md` (changelog),
`docs/timelog-june-2026.md` (billing log), `docs/HANDOFF.md` (this file).
