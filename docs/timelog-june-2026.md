# Work Log — BokoBoko Room Booking Platform
**Developer:** Krontiva
**Billing Period:** May – July 2026
**Total Hours:** 50.5

---

## May 2026 — 16.0 hrs

| Date | Description | Hrs | Notes / Blockers |
|------|-------------|-----|------------------|
| 08 May | Project Audit & Setup | 2.0 | Audited repo structure, mapped Next.js 16 App Router conventions, component boundaries, and API surface. Identified env var split between build-time (`NEXT_PUBLIC_*`) and server-only runtime vars. | 
| 09 May | Booking Widget UI | 2.5 | Built search form (date pickers, guest selectors), available rooms results panel with per-room pricing and photos. Wired `GET /api/availability` and typed `RoomResult` interface. |
| 13 May | Beds24 API Integration | 2.5 | Integrated Beds24 V2 REST API — `getAccessToken()` with 23hr token cache, `checkAvailability()` and `getRoomOffers()`. Beds24 V2 docs sparse; required trial-and-error to identify correct param names and response shapes. |
| 19 May | Supabase Data Layer | 2.0 | Designed `booking_intents` table with full status lifecycle (`HELD → PAYMENT_PENDING → CONFIRMED / CANCELLED / EXPIRED`). Implemented typed helpers: `createIntent`, `getIntentByRef`, `updateIntentStatus`, `getExpiredHeldIntents`. |
| 21 May | Paystack Integration | 2.5 | Integrated Paystack inline popup with card and mobile money support. Built `POST /api/webhooks/paystack` with raw-body HMAC-SHA512 verification. Raw body required manual handling — standard body parsing strips it. |
| 27 May | Rooms Config & Availability API | 2.0 | Extracted room definitions into `src/lib/rooms.ts`. Built `GET /api/availability` with Zod validation, Beds24 availability check, and GHS price calculation. |
| 28 May | Checkout & Hold Timer | 2.5 | Built `/checkout` with 30-minute countdown that auto-redirects on expiry. Implemented `POST /api/jobs/expire-holds` and `GET /api/bookings/[ref]` for post-payment confirmation polling. |

**May subtotal: 16.0 hrs**

---

## June 2026 — 30.0 hrs

| Date | Description | Hrs | Notes / Blockers |
|------|-------------|-----|------------------|
| 04 Jun | Build Pipeline Debugging | 3.5 | Resolved Coolify build failures: Next.js/Vite toolchain conflict, dead Vite source tree causing TS errors, `Window.PaystackPop` interface collision, invalid Pages Router config in App Router webhook handler. Multiple sequential errors across 6 deployments. |
| 10 Jun | VPS Deployment Fix | 3.0 | Refactored Supabase client to lazy singleton to prevent build-time crash. Added `nixpacks.toml` with explicit `npm run start` to fix Coolify returning 404 in <1ms. Root cause was Caddy serving without Next.js — identifiable only from the sub-millisecond response time. |
| 11 Jun | Admin Auth & Bookings API | 3.5 | Edge-runtime admin auth middleware with httpOnly cookie. Built `/api/admin/login` POST/DELETE. Built `GET /api/admin/bookings` cross-referencing Beds24 bookings with Supabase intents. Built `POST /api/admin/bookings` to create confirmed bookings in both systems simultaneously. |
| 13 Jun | Admin Dashboard UI & CRUD | 3.0 | Built `PUT /api/admin/bookings/[id]` (cancel / confirm / mark_paid). Admin dashboard with stats row, filter tabs, bookings table with status badges, inline actions, and arrival/departure highlights. |
| 16 Jun | USD Pricing & Bug Fixes | 3.0 | Migrated all user-facing prices from GHS to USD. Fixed double-conversion inflation bug ($63 showing instead of $45). Fixed admin `Secure` cookie silently blocked on Coolify HTTP domain — switched to `x-forwarded-proto` detection. |
| 22 Jun | Channel Badges, Booking Detail Modal & CSV Export | 2.0 | OTA channel badges from Beds24 `referer` (Booking.com, Airbnb, Hostelworld, Expedia, Direct). Click-through booking detail modal with full guest info and inline actions. CSV export of visible bookings table. |
| 23 Jun | Revenue & Analytics Module | 2.5 | Built `GET /api/admin/analytics` aggregating 180-day history into monthly revenue, channel breakdown, and room performance. Revenue page with stat cards, monthly bar chart, channel share table, and avg length-of-stay breakdown. |
| 24 Jun | Room Performance Module & Room Editing | 2.5 | Room Performance page with bookings/revenue/nights/avg-stay per room. Room edit modal backed by Supabase `room_overrides` table — name, description, rack rate, max occupancy editable at runtime. Graceful fallback to static config if table absent. |
| 25 Jun | Admin Sidebar Layout & Bookings Lookback Selector | 4.0 | Replaced top nav with a left sidebar layout via Next.js `layout.tsx` — dark green brand sidebar with icons and active indicator. Bookings lookback extended with 30d / 90d / 180d / 1y selector (default raised from 7 to 30 days). Messaging tab stubbed as coming soon. |
| 26 Jun | New Booking Page Redesign & API Caching | 3.0 | New Booking form redesigned as two-column layout with live summary card. Server-side in-memory cache added to all three admin API routes (bookings 2-min, analytics 5-min, rooms 10-min TTL) with write-through invalidation on booking creation and room edits. |

**June subtotal: 30.0 hrs**

---

## July 2026 — 4.5 hrs

| Date | Description | Hrs | Notes / Blockers |
|------|-------------|-----|------------------|
| 22 Jul | HostelWorld OTA Setup | 1.0 | Added property rooms to HostelWorld listing and established API connection to sync inventory and availability with Beds24. API credentials required manual retrieval from partner portal. |
| 23 Jul | Website UI Updates | 2.0 | Active section highlighting on navbar via IntersectionObserver. All "Book Now" buttons converted to modal overlay. Facebook and Instagram links updated in footer; TripAdvisor link removed. Admin button added to navbar as outlined pill. |
| 24 Jul | VPS Disk Usage Analysis | 1.5 | Root cause: untagged Docker image layers from iterative Nixpacks build failures accumulating in `/var/lib/docker` (~200–400 MB each). Documented fix: `docker image prune -f` and `docker builder prune -f` as periodic maintenance, or enable Coolify's built-in image cleanup. |

**July subtotal: 4.5 hrs**

---

## Total

| Month | Hours |
|-------|------:|
| May 2026 | 16.0 |
| June 2026 | 30.0 |
| July 2026 | 4.5 |
| **Total** | **50.5** |
