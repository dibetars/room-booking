# Work Log — BokoBoko Room Booking Platform
**Developer:** Krontiva
**Billing Period:** May – July 2026
**Total Hours:** 36.5

---

## May 2026 — 16.0 hrs

| Date | Description | Time Spent (hrs) | Task Description | Notes / Blockers |
|------|-------------|-----------------|------------------|-----------------|
| 08 May | Project Audit & Setup | 2.0 | Audited full repository structure; mapped Next.js 16 App Router routing conventions, component boundaries, and existing API surface. Identified environment variable split between build-time (`NEXT_PUBLIC_*`) and server-only runtime vars. | No blockers. Dependency mapping took longer than expected due to mixed Vite/Next.js config files present in repo. |
| 09 May | Booking Widget UI | 2.5 | Built booking search form (check-in/out date pickers, guest count selectors) and available rooms results panel with per-room pricing, occupancy, and photo display. Wired `GET /api/availability` call and typed the `RoomResult` response interface. | None. |
| 13 May | Beds24 API Integration | 2.5 | Integrated Beds24 V2 REST API — implemented `getAccessToken()` with 23-hour token caching and auto-refresh on 401. Built `checkAvailability()` and `getRoomOffers()` endpoints, handling Beds24's `{ success, data }` response wrapper. | Beds24 V2 API docs sparse; required trial-and-error to identify correct query param names and response shape for availability and offers endpoints. |
| 19 May | Supabase Data Layer | 2.0 | Designed `booking_intents` table schema in Supabase with full status lifecycle (`HELD → PAYMENT_PENDING → CONFIRMED / CANCELLED / EXPIRED`). Implemented typed helper functions: `createIntent`, `getIntentByRef`, `updateIntentStatus`, `getExpiredHeldIntents`. | None. |
| 21 May | Paystack Integration | 2.5 | Integrated Paystack inline JS popup (`PaystackPop.setup`) with card and mobile money channel support. Built `POST /api/webhooks/paystack` with raw-body HMAC-SHA512 signature verification; handler updates intent status on `charge.success`. | Paystack webhook requires raw request body for HMAC verification — standard body parsing middleware strips this; had to handle manually. |
| 27 May | Rooms Config & Availability API | 2.0 | Extracted room definitions (IDs, names, USD rack rates, descriptions, max occupancy, photos) into `src/lib/rooms.ts`. Built `GET /api/availability` route with Zod input validation, Beds24 availability check, and GHS price calculation. | None. |
| 28 May | Checkout & Hold Timer | 2.5 | Built `/checkout` page with 30-minute hold countdown timer (auto-redirects on expiry). Implemented `POST /api/jobs/expire-holds` to release stale `HELD` and `PAYMENT_PENDING` intents. Built `GET /api/bookings/[ref]` for post-payment confirmation polling. | None. |

**May subtotal: 16.0 hrs**

---

## June 2026 — 16.0 hrs

| Date | Description | Time Spent (hrs) | Task Description | Notes / Blockers |
|------|-------------|-----------------|------------------|-----------------|
| 04 Jun | Build Pipeline Debugging | 3.5 | Resolved Coolify build failures: fixed Next.js/Vite toolchain conflict in `package.json`, deleted dead Vite source tree causing cascading TypeScript errors, resolved `Window.PaystackPop` global interface collision, removed invalid Pages Router `export const config` from App Router webhook handler. | Multiple sequential build errors — each fix exposed the next. Required iterating through Coolify build logs across 6 deployments. No local visibility into VPS build environment. |
| 10 Jun | VPS Deployment Fix | 3.0 | Refactored Supabase client to lazy singleton to prevent build-time env var crash. Added `nixpacks.toml` with explicit `npm run start` override to fix Coolify/Caddy not forwarding traffic to Next.js (returning 404 in <1ms). Validated full end-to-end VPS deployment. | Coolify's Nixpacks auto-detection was silently starting Caddy without Next.js. No error in logs — required interpreting 0.0001s 404 response time as a proxy misconfiguration rather than an app error. |
| 11 Jun | Admin Dashboard — Auth & API | 3.5 | Implemented edge-runtime admin auth middleware with httpOnly cookie validation. Built `/api/admin/login` POST/DELETE handlers. Built `GET /api/admin/bookings` cross-referencing Beds24 bookings with Supabase payment intents by `beds24_booking_id`. Built `POST /api/admin/bookings` to create confirmed bookings in both systems simultaneously. | None. |
| 13 Jun | Admin Dashboard — UI & CRUD | 3.0 | Built `PUT /api/admin/bookings/[id]` CRUD route (cancel / confirm / mark_paid). Developed admin dashboard with stats row, filter tabs, booking table with Beds24 + payment status badges, inline action buttons, and arrival/departure row highlights. Built new booking creation form with USD price override. | None. |
| 16 Jun | USD Pricing & Bug Fixes | 3.0 | Migrated all user-facing price display from GHS to USD across booking search panel, checkout modal, `/checkout` page, and static rooms section. Fixed double-conversion price inflation bug (server/client `GHS_PER_USD` mismatch). Fixed admin cookie `Secure` flag blocking login on Coolify's HTTP domain — switched to `x-forwarded-proto` header detection. | Admin login appeared to succeed client-side but silently redirected back to login — root cause was browser refusing to send a `Secure` cookie over HTTP, which only surfaces in production where `NODE_ENV=production` forces the flag on. |

**June subtotal: 16.0 hrs**

---

## July 2026 — 4.5 hrs

| Date | Description | Time Spent (hrs) | Task Description | Notes / Blockers |
|------|-------------|-----------------|------------------|-----------------|
| 22 Jul | HostelWorld OTA Setup | 1.0 | Added property rooms to HostelWorld listing and established API connection to sync room inventory and availability between Beds24 and the HostelWorld channel manager. | API credentials required manual retrieval from HostelWorld partner portal; channel sync validation took additional time to confirm live inventory was reflecting correctly. |
| 23 Jul | Website UI Updates | 2.0 | Implemented active section highlighting on navbar using IntersectionObserver; all "Book Now" buttons converted from anchor scroll links to a modal overlay with the booking search form; updated Facebook and Instagram social links in footer; removed unused third social link; added muted Admin entry point to navbar for property manager access. | None. |
| 24 Jul | VPS Disk Usage Analysis | 1.5 | Investigated high disk usage on Coolify VPS. Root cause: successive Nixpacks build iterations during the deployment debugging phase generated untagged Docker image layers that were not automatically pruned. Each failed build left behind intermediate image layers (~200–400 MB each) accumulating in `/var/lib/docker`. Documented recommended fix: schedule `docker image prune -f` and `docker builder prune -f` as a periodic maintenance task, or enable Coolify's built-in image cleanup setting. | No immediate action taken pending client approval to run prune commands on production host. |

**July subtotal: 4.5 hrs**

---

## Total: 36.5 hours

| Month | Hours |
|-------|-------|
| May 2026 | 16.0 |
| June 2026 | 16.0 |
| July 2026 | 4.5 |
| **Total** | **36.5** |
