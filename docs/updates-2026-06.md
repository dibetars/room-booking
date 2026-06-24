# Platform Updates — June 2026

A summary of the work completed for the BokoBoko booking platform's admin
dashboard, security hardening, deployment fixes, and SEO. All changes are live.

---

## Admin Dashboard

### Sidebar layout redesign
Replaced the top navigation bar with a standard left sidebar + main-content
layout, shared across all admin pages via a Next.js `layout.tsx`.
- Dark green brand sidebar with icons and an active-state indicator
- Nav: **Bookings · Messages · Revenue · Rooms**
- **New Booking** and **Logout** pinned to the bottom
- The login page is excluded from the sidebar shell

### Bookings
- **Channel badges** — each booking shows where it came from (Booking.com,
  Airbnb, Hostelworld, Expedia, or Direct), derived from the Beds24 `referer`.
- **Booking detail modal** — click any row to see full guest info, stay
  details, payment status, price, and reference, with inline Confirm / Cancel /
  Mark Paid actions.
- **CSV export** — download the current visible bookings as a spreadsheet.
- **History lookback selector** — view bookings 30 / 90 / 180 days or 1 year
  back (default raised from 7 to 30 days); switching re-fetches automatically.

### Revenue & analytics
- Stat cards: total revenue (6mo), this month, upcoming (90d), avg booking value
- Monthly revenue bar chart
- Revenue-by-channel breakdown with share bars
- Average length-of-stay by month
- **Fix:** OTA bookings (Booking.com / Airbnb arrive in Beds24 as status `new`)
  are now counted toward revenue — previously only `confirmed` direct bookings
  were, so channel revenue showed $0 despite real bookings.

### Rooms
- Room performance table: bookings, revenue, nights occupied, avg stay, and
  revenue-share bars per room
- Average length-of-stay trend chart
- **Edit room** modal — name, description, rack rate, and max occupancy editable
  at runtime (stored in a Supabase `room_overrides` table, with graceful
  fallback to static config if the table doesn't exist yet)

### New Booking page
Redesigned as a two-column form: stay details and guest fields on the left, a
live booking summary card (room, nights, auto-calculated total) with pricing
override, notes, and actions on the right.

### Messages
Stubbed with a "coming soon" placeholder. The Beds24 messaging API groundwork
(`GET`/`POST /messages`) exists but the inbox UI is pending channel validation.

### Performance
In-memory server-side caching on the admin API routes so navigating between
sections is instant on repeat visits:
- Bookings — 2-minute TTL
- Analytics — 5-minute TTL
- Rooms — 10-minute TTL

Cache is invalidated on writes (new booking, room edit) so data stays correct.

---

## Security Hardening

Completed ahead of going live:

- **Signed session tokens** — the admin cookie is now an HMAC-signed, expiring
  token instead of the raw `ADMIN_SECRET`. A leaked cookie can no longer be
  replayed indefinitely or used to recover the secret.
- **Rate limiting** (per IP):
  - `/api/admin/login` — 6 attempts / 15 min (brute-force protection)
  - `/api/bookings` — 8 / 10 min (stops hold-spam against room availability)
  - `/api/availability` — 20 / min (protects Beds24 API quota)
  - `/api/zoho/lead` — 10 / 10 min (CRM spam protection)
- **Fail-closed webhooks** — the Calendly webhook now rejects requests when its
  signing key is unset, instead of skipping verification. Paystack and Calendly
  signature checks guard against length mismatches before comparison.
- **Constant-time comparisons** — cron secret and webhook signatures use
  `timingSafeEqual` to remove timing side-channels.
- **Security headers** (via `next.config.ts`): Content-Security-Policy,
  X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, HSTS, and
  Permissions-Policy. The CSP allows only Paystack, Calendly, and Google Fonts.
- **Secret cleanup** — removed a hardcoded live Paystack key from
  `PROJECT_SUMMARY.md` and untracked `.env` / `server/.env` from git.
  > **Action required:** rotate the exposed Paystack (and legacy Smoobu) keys in
  > their dashboards, since they remain recoverable in git history.
- **robots.txt** — added, disallowing `/admin` from search indexing.

---

## Cleanup & Deployment

- **Removed the legacy Express/Smoobu server** — the `server/` directory (an old
  Smoobu proxy, no longer used) and its committed `node_modules` were deleted.
- **Untracked `node_modules`** from git (~18k files committed before
  `.gitignore` existed); files remain on disk, repo/clone size much reduced.
- **Fixed the Vercel build** — removed leftover Vite/Express artifacts
  (`vite.config.ts`, root `index.html`, `public/vite.svg`, and a stale
  `vercel.json` that routed `/api` to the deleted server). Vercel now
  auto-detects Next.js correctly.

---

## SEO & Discoverability

- **Site tagline in metadata** — "Eco-Friendly Accommodation Built with
  Sustainable Comfort in Mind" now drives the page title, description, and Open
  Graph / Twitter cards (shown in browser tabs and link/social previews).
- **LodgingBusiness structured data (JSON-LD)** — schema.org markup rendered
  server-side so search engines and AI assistants can index BokoBoko as a
  bookable accommodation. Includes location (Busua, Western Region) with geo
  coordinates, contact, social profiles, amenities, price range, and all 7 rooms
  as `HotelRoom` offers.

### Suggested next steps
- Validate the structured data with Google's Rich Results Test against the live
  domain.
- Add a `sitemap.xml` (already referenced by `robots.txt`, but not yet present)
  — Next.js can generate one via a small `sitemap.ts`.

---

## Website (guest-facing)

- All "Book Now" buttons open a booking search modal (shared state with the
  hero search widget).
- Navbar sections highlight as you scroll (IntersectionObserver).
- Admin entry point added to the navbar as a subtle outlined pill button.
- Footer social links updated (Facebook, Instagram); unused third link removed.
