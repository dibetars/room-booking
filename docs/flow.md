# BokoBoko Booking Engine — Build Flow

## Foundation (early commits)
Started with a basic HTML/React site and iterated through several rounds of fixing CORS, exchange rates, date pickers, and payment modals — the messy early life of a booking engine. Then made the call to rewrite it properly as a Next.js app.

## Next.js Rebuild
A clean rewrite as a Next.js booking engine with Beds24 API integration, Paystack inline payments, and Supabase for booking intent tracking. Early bugs knocked out quickly: Supabase lazy init to avoid build crashes, Nixpacks config for Coolify deployment, dead Vite files cleaned up.

## Pricing & Auth Fixes
Two real production bugs surfaced:
- **Inflated USD prices** ($63 instead of $45) — a double GHS↔USD conversion. Fixed by passing `rackRateUSD` directly from the server instead of converting back through the exchange rate.
- **Admin login never resolved on live VPS** — the `Secure` cookie was being set on an HTTP domain. Fixed by detecting HTTPS via `x-forwarded-proto` rather than `NODE_ENV`.

## Guest-Facing Improvements
- All "Book Now" buttons open a search modal instead of scrolling to `#search`
- Footer social links updated (Facebook, Instagram), TripAdvisor removed
- Navbar items highlight as you scroll through sections (IntersectionObserver)
- Admin link added to the navbar as an outlined pill button, right of Book Now

## Admin Dashboard — Iterative Build-Up

1. **Bookings view** — basic table with status badges, confirm/cancel actions
2. **Channel badges** — Booking.com / Airbnb / Direct / Hostelworld from Beds24 `referer` field
3. **Booking detail modal** — full guest info, stay, payment status, actions on row click
4. **CSV export** — exports the current visible bookings table
5. **Revenue module** — stat cards, monthly bar chart, channel breakdown with share bars
6. **Room performance module** — bookings/revenue/nights per room, edit modal backed by a Supabase `room_overrides` overlay table
7. **Lookback period selector** — 30d / 90d / 180d / 1y toggle because the 7-day default was too limiting
8. **Messaging module** — stubbed with Beds24 `/messages` API groundwork, marked coming soon
9. **Sidebar layout redesign** — top nav replaced with a fixed left sidebar (dark green brand, icons, active indicator), shared via `layout.tsx`
10. **New Booking page** — redesigned as a 2-column form: stay + guest details left, live summary card + actions right
11. **In-memory caching** — `server-cache.ts` wraps all three admin API routes (bookings: 2min, analytics: 5min, rooms: 10min) with write-through invalidation so navigating between sections is instant

## The Through-Line
Start with what works, ship it live, fix what breaks in production, then systematically add operator tooling on top of the guest-facing engine.
