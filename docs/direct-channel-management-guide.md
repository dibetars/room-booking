# Managing Booking.com & Airbnb Directly (Without Beds24)

This guide explains what Beds24 currently does for BokoBoko, why it is optional, and the practical ways to manage **Airbnb**, **Booking.com**, and **Website** bookings directly without an intermediary.

---

## 1. What Beds24 Does Today (and Why It’s Optional)

- **Website bookings (`book.bokoboko.org`) are already 100% ours.**  
  They are stored in our own Supabase database (`booking_intents`), paid via Paystack or manual transfer, and emailed via Resend. They do not need Beds24.
- **Beds24 only acts as a calendar switchboard** between our Website, Airbnb, Booking.com, and Hostelworld so the same room isn’t booked twice for the same dates.

If we drop Beds24, we only need to replace two things:
1. **Calendar blocking** across Airbnb, Booking.com, and our Website.
2. **Getting OTA guest names & payout amounts** into the ERP for financial reports.

---

## 2. Option 1 — Direct Two-Way iCal Sync + Email/CSV Ingestion (Recommended No-Middleman Setup)

Both **Airbnb** and **Booking.com** provide free, built-in `.ics` (iCal) calendar import and export links for every room. No partner approval or monthly subscription is required.

### How Calendar Blocking Works (Two-Way iCal)
1. **Outbound (BokoBoko → Airbnb & Booking.com):**  
   BokoBoko / ERP exposes 7 `.ics` URLs (one per room, e.g. `https://book.bokoboko.org/api/ical/room/691857.ics`) containing blocked dates from direct bookings and other channels. You paste those URLs into Airbnb and Booking.com’s calendar import settings.
2. **Inbound (Airbnb & Booking.com → BokoBoko / ERP):**  
   You copy the `.ics` export URLs from Airbnb and Booking.com into BokoBoko. A background job polls them every 10–15 minutes and blocks those dates on the website and in the ERP.

### How Guest Names & Prices Reach the ERP
Because `.ics` calendar feeds only share **booked dates** (not payout amounts or full guest details), we pair iCal with one of these two lightweight feeds for ERP reporting:

- **Automated Email Parser:** Forward Airbnb and Booking.com booking confirmation emails to an ERP webhook/inbox that automatically extracts guest name, room, check-in/out dates, and payout amount.
- **Monthly CSV Upload:** Export the monthly reservations/earnings CSV from the Airbnb and Booking.com extranets and upload it into the ERP.

### Pros & Cons
- **Pros:** $0/month; no Beds24; no OTA certification gate; 3–5 days of engineering.
- **Cons:**
  - **15–30 minute sync delay** (small double-booking risk only if two guests book the exact same room within that 15-minute window).
  - Room nightly rates are edited in each extranet (Website, Airbnb, Booking.com) separately.

---

## 3. Option 2 — Official Direct OTA Connectivity APIs (Real-Time)

To get instant push reservations, full guest details, and central rate management **without** a channel manager, you must connect to each OTA’s partner API:

| Channel | API Family | Reality for a Single Resort |
|---------|------------|-----------------------------|
| **Booking.com** | Booking.com Connectivity APIs (OTA XML / JSON) | Requires applying as a certified **Connectivity Provider**, passing a security/PCI audit, and completing certification tests. Built for multi-property software vendors. |
| **Airbnb** | Airbnb Homes API | **Invite / partner-gated.** Airbnb generally does not grant direct API keys to individual properties unless you are an approved PMS/channel-manager partner. |

**Bottom line:** Building and certifying direct official APIs to Airbnb and Booking.com for a single property takes months and is usually blocked by Airbnb’s partner gate.

---

## 4. Side-by-Side Comparison

| Criteria | Keep Beds24 (Current) | Direct iCal + Email/CSV (No Beds24) | Direct Official OTA APIs |
|----------|-----------------------|-------------------------------------|--------------------------|
| **Monthly Subscription** | Small monthly Beds24 fee | **$0 / month** | $0 subscription, high compliance cost |
| **Calendar Sync Speed** | **Instant** (seconds) | **Every 15–30 minutes** | **Instant** |
| **Double-Booking Risk** | Virtually zero | Low (only within ~15 min window) | Virtually zero |
| **Where Prices Are Edited** | One place | Separately on Website, Airbnb, Booking.com | One place |
| **Full Guest & Price Data in ERP** | Automatic via API | **Yes** — via email parser or CSV import | Automatic |
| **Setup Effort** | **0 days** (already live) | **3–5 days** of dev work | Months + partner approval blocker |

---

## 5. Recommended 3-Step Cutover Plan (If Leaving Beds24)

1. **Step 1 — Make Supabase / ERP the Master Calendar:**  
   Store all direct bookings and room availability blocks natively in Supabase / ERP instead of querying Beds24.
2. **Step 2 — Enable Two-Way iCal & Email/CSV Parser (3–5 days build):**  
   Publish the 7 room `.ics` feeds, add the 15-minute `.ics` poller, and add the OTA email parser / CSV importer for the ERP.
3. **Step 3 — Switch Over & Cancel Beds24:**  
   Connect the `.ics` links in Airbnb and Booking.com, verify a test date block both ways, and turn off Beds24.
