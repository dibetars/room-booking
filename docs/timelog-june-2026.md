# BokoBoko Room Booking Platform — Work Log

**Developer:** Krontiva
**Period:** May – July 2026
**Total Hours:** 50.5 hrs

---

## May 2026 · 16.0 hrs

**08 May — Project Audit & Setup** · 2.0 hrs
Audited full repository structure; mapped Next.js 16 App Router routing conventions, component boundaries, and existing API surface. Identified environment variable split between build-time (`NEXT_PUBLIC_*`) and server-only runtime vars. Dependency mapping took longer than expected due to mixed Vite/Next.js config files present in repo.

**09 May — Booking Widget UI** · 2.5 hrs
Built booking search form (check-in/out date pickers, guest count selectors) and available rooms results panel with per-room pricing, occupancy, and photo display. Wired `GET /api/availability` and typed the `RoomResult` response interface.

**13 May — Beds24 API Integration** · 2.5 hrs
Integrated Beds24 V2 REST API — implemented `getAccessToken()` with 23-hour token caching and auto-refresh on 401. Built `checkAvailability()` and `getRoomOffers()` endpoints, handling Beds24's `{ success, data }` response wrapper. API docs sparse; required trial-and-error to identify correct query param names and response shapes.

**19 May — Supabase Data Layer** · 2.0 hrs
Designed `booking_intents` table schema with full status lifecycle (`HELD → PAYMENT_PENDING → CONFIRMED / CANCELLED / EXPIRED`). Implemented typed helper functions: `createIntent`, `getIntentByRef`, `updateIntentStatus`, `getExpiredHeldIntents`.

**21 May — Paystack Integration** · 2.5 hrs
Integrated Paystack inline JS popup (`PaystackPop.setup`) with card and mobile money support. Built `POST /api/webhooks/paystack` with raw-body HMAC-SHA512 signature verification. Note: Paystack webhook requires raw request body for HMAC — standard body parsing strips this and had to be handled manually.

**27 May — Rooms Config & Availability API** · 2.0 hrs
Extracted room definitions (IDs, names, USD rack rates, descriptions, max occupancy, photos) into `src/lib/rooms.ts`. Built `GET /api/availability` with Zod input validation, Beds24 availability check, and GHS price calculation.

**28 May — Checkout & Hold Timer** · 2.5 hrs
Built `/checkout` page with 30-minute hold countdown timer that auto-redirects on expiry. Implemented `POST /api/jobs/expire-holds` to release stale intents and `GET /api/bookings/[ref]` for post-payment confirmation polling.

---

## June 2026 · 30.0 hrs

**04 Jun — Build Pipeline Debugging** · 3.5 hrs
Resolved Coolify build failures: fixed Next.js/Vite toolchain conflict, deleted dead Vite source tree causing cascading TypeScript errors, resolved `Window.PaystackPop` global interface collision, removed invalid Pages Router `export const config` from App Router webhook handler. Multiple sequential build errors — each fix exposed the next across 6 deployments.

**10 Jun — VPS Deployment Fix** · 3.0 hrs
Refactored Supabase client to lazy singleton to prevent build-time crash. Added `nixpacks.toml` with explicit `npm run start` override to fix Coolify returning 404 in <1ms (proxy misconfiguration, not app error). Validated full end-to-end VPS deployment.

**11 Jun — Admin Auth & Bookings API** · 3.5 hrs
Implemented edge-runtime admin auth middleware with httpOnly cookie validation. Built `/api/admin/login` POST/DELETE. Built `GET /api/admin/bookings` cross-referencing Beds24 bookings with Supabase payment intents by `beds24_booking_id`. Built `POST /api/admin/bookings` to create confirmed bookings in both systems simultaneously.

**13 Jun — Admin Dashboard UI & CRUD** · 3.0 hrs
Built `PUT /api/admin/bookings/[id]` (cancel / confirm / mark_paid). Developed admin dashboard with stats row, filter tabs, booking table with status badges, inline action buttons, and arrival/departure row highlights. Built new booking creation form with USD price override.

**16 Jun — USD Pricing & Bug Fixes** · 3.0 hrs
Migrated all user-facing prices from GHS to USD across the booking flow. Fixed double-conversion price inflation bug (server/client `GHS_PER_USD` mismatch causing $63 to show instead of $45). Fixed admin cookie `Secure` flag silently blocking login on Coolify's HTTP domain — switched detection to `x-forwarded-proto` header.

**22 Jun — Channel Badges, Booking Detail Modal & CSV Export** · 2.0 hrs
Added OTA channel identification to admin bookings table using Beds24 `referer` field — normalised to display badges (Booking.com, Airbnb, Hostelworld, Expedia, Direct). Built click-through booking detail modal with full guest info, stay, payment status, and inline actions. Added CSV export of the visible bookings table.

**23 Jun — Revenue & Analytics Module** · 2.5 hrs
Built `GET /api/admin/analytics` aggregating 180-day booking history into monthly revenue, channel breakdown, and room performance data. Built Revenue page with 4 stat cards, horizontal monthly bar chart, channel share table with mini progress bars, and avg length-of-stay breakdown by month.

**24 Jun — Room Performance Module & Room Editing** · 2.5 hrs
Built Room Performance page showing bookings, revenue, nights occupied, and avg stay per room with revenue share bars. Added room edit modal backed by a new Supabase `room_overrides` table — name, description, rack rate, and max occupancy editable at runtime without a redeploy. Graceful fallback to static config if table not yet created.

**25 Jun — Admin Sidebar Layout & Bookings Lookback Selector** · 4.0 hrs
Replaced top navigation bar with a standard left sidebar layout — dark green brand sidebar with icons and active indicator, shared across all admin pages via Next.js `layout.tsx`. Sidebar carries Bookings, Messages, Revenue, Rooms tabs with New Booking and Logout pinned at the bottom. Added 30d / 90d / 180d / 1y period selector to bookings (default raised from 7 to 30 days). Stubbed Beds24 messaging tab as coming soon.

**26 Jun — New Booking Page Redesign & API Caching** · 3.0 hrs
Redesigned New Booking form into a two-column layout: stay details and guest fields left, live summary card (room, nights, total) with pricing override and actions right. Added server-side in-memory caching to all three admin API routes — bookings 2-min TTL, analytics 5-min TTL, rooms 10-min TTL — with write-through invalidation on booking creation and room edits.

---

## July 2026 · 4.5 hrs

**22 Jul — HostelWorld OTA Setup** · 1.0 hrs
Added property rooms to HostelWorld listing and established API connection to sync inventory and availability between Beds24 and the HostelWorld channel manager. API credentials required manual retrieval from partner portal; channel sync validation took additional time.

**23 Jul — Website UI Updates** · 2.0 hrs
Implemented active section highlighting on navbar using IntersectionObserver. Converted all "Book Now" buttons from anchor scroll links to a modal overlay with the booking search form. Updated Facebook and Instagram social links in footer; removed unused third social link. Added Admin button to navbar as an outlined pill to the right of Book Now.

**24 Jul — VPS Disk Usage Analysis** · 1.5 hrs
Investigated high disk usage on Coolify VPS. Root cause: successive Nixpacks build iterations left behind untagged Docker image layers (~200–400 MB each) accumulating in `/var/lib/docker`. Documented fix: `docker image prune -f` and `docker builder prune -f` as a periodic maintenance task, or enable Coolify's built-in image cleanup setting.

---

## Summary

| Month | Hours |
|-------|------:|
| May 2026 | 16.0 |
| June 2026 | 30.0 |
| July 2026 | 4.5 |
| **Total** | **50.5** |
