# BokoBoko Reports Module — Partner ERP Guide

This guide explains how BokoBoko calculates monthly booking and revenue reports so your ERP can pull or compute the exact same figures directly.

Source in this repo: `src/lib/reports.ts` and `src/app/api/admin/reports/route.ts` (plus live rollups in `src/app/api/admin/analytics/route.ts`).

---

## 1. Data Pipeline at a Glance

```
Reservation source (GET /bookings)
        │  filter: arrival ∈ [dateFrom, dateTo]
        ▼
Normalize each booking
  • channel label   (Booking.com, Airbnb, Website, Admin, …)
  • room label      (roomId → room name)
  • status          (confirmed, new, request, cancelled)
  • revenue in GHS  (cancelled → 0; else price_usd × GHS_PER_USD)
        │
        ▼
Aggregate into MonthlyReport
  • KPI totals
  • byChannel[]
  • byRoom[]
  • byStatus[]
        │
        ▼
Persist snapshot (key: report_YYYY-MM in app_settings)
```

Your ERP does **not** need our saved snapshot if it already stores reservations — it can run the same aggregation SQL/query on its own `reservations` table, or pull raw bookings and compute on the fly.

---

## 2. Input Record (Minimum Fields Needed per Booking)

| Field | Type | Notes |
|-------|------|-------|
| `external_id` | number / string | Beds24 booking `id` (or OTA reservation ID) |
| `room_id` | number | Maps to room catalog below |
| `arrival` | `YYYY-MM-DD` | **Reports are keyed by arrival date** (check-in falls in the period) |
| `departure` | `YYYY-MM-DD` | Used for nights / analytics |
| `status` | enum | `confirmed` \| `new` \| `request` \| `cancelled` |
| `price_usd` | number | Total booking price (not per-night) |
| `channel` | string? | OTA channel if present (`airbnb`, `booking.com`, …) |
| `referer` | string? | Fallback source string (`BokoBoko Direct`, `BokoBoko Admin`, …) |

### Room Catalog (`room_id` → label)

| room_id | Name | Standard Rack Rate (USD) |
|---------|------|--------------------------|
| 691857 | Patience | $45 / night |
| 691859 | Regeneration | $45 / night |
| 691860 | Humility | $40 / night |
| 691861 | Wisdom | $40 / night |
| 691862 | Truth & Honesty | $50 / night |
| 691863 | Love | $40 / night |
| 691864 | Generosity | $50 / night |

---

## 3. Business Rules (Exact Parity with BokoBoko)

### A. Date Window
A booking belongs to a report for `[dateFrom, dateTo]` if:

```text
arrival >= dateFrom AND arrival <= dateTo
```

Monthly periods use `period = 'YYYY-MM'`, `dateFrom = YYYY-MM-01`, `dateTo = last day of month`.

### B. Currency & Revenue Rule (Actual vs. Projected Distinction)
- Upstream booking `price` is **total stay price in USD**.
- `GHS_PER_USD` default is **`15.5`** (configurable via env).
- In `src/lib/reports.ts`, `totalRevenueGHS` sums all non-cancelled bookings (`status !== 'cancelled'`) in the date window, and breaks them down in `byStatus`.
- **For ERP accounting, separate Actual vs. Projected revenue using `status` and `arrival` date:**

| Revenue Bucket | Status Condition | Date Condition | Meaning |
|----------------|------------------|----------------|---------|
| **Actual (Realized) Revenue** | `status IN ('confirmed', 'new')` | `arrival <= CURRENT_DATE` *(or `departure <= CURRENT_DATE` on completion basis)* | Paid direct bookings + confirmed OTA stays that have checked in / completed. |
| **Projected (On-the-Books) Revenue** | `status IN ('confirmed', 'new')` | `arrival > CURRENT_DATE` | Confirmed future stays not yet checked in (matches `upcomingRevenue` in `/api/admin/analytics`). |
| **Unpaid Pipeline (Pending Hold)** | `status = 'request'` | Any | Unpaid website holds awaiting payment — **do not book as Actual Revenue** until status becomes `confirmed`. |
| **Cancelled** | `status = 'cancelled'` | Any | Always `GH₵ 0`. |

*(Note: OTA bookings from Booking.com and Airbnb land in Beds24 with `status = 'new'`, which represents a confirmed OTA reservation, whereas website unpaid holds use `status = 'request'`.)*

### C. Channel Normalization (`resolveChannel`)

Evaluate in this order:

1. If `channel` is set (case-insensitive):
   - `booking.com` → **Booking.com**
   - `airbnb` → **Airbnb**
   - `hostelworld` → **Hostelworld**
   - `expedia` → **Expedia**
   - `bokoboko admin` → **Admin**
   - `bokoboko direct` → **Website**
   - anything else → raw `channel`
2. Else if `referer` is set (case-insensitive):
   - exact match in map above, else:
   - contains `admin` → **Admin**
   - contains `bokoboko` or `direct` → **Website**
3. Else → **Website**

### D. Grouping (`byChannel`, `byRoom`, `byStatus`)
Each breakdown is an array of:

```ts
interface ReportEntry {
  label: string;   // channel name, room name, or status
  count: number;   // number of bookings in bucket
  revenue: number; // sum of revenue_ghs in bucket
}
```

Sorted by **`count` descending**.

---

## 4. Output Schema (`MonthlyReport`)

```ts
interface MonthlyReport {
  period: string;            // "YYYY-MM"
  dateFrom: string;          // "YYYY-MM-DD"
  dateTo: string;            // "YYYY-MM-DD"
  generatedAt: string;       // ISO timestamp
  totalBookings: number;
  confirmedBookings: number; // status === 'confirmed'
  cancelledBookings: number; // status === 'cancelled'
  totalRevenueGHS: number;
  byChannel: ReportEntry[];
  byRoom: ReportEntry[];
  byStatus: ReportEntry[];
}
```

Derived metrics shown in UI / text export:

```text
newOrPending = totalBookings - confirmedBookings - cancelledBookings
sharePct     = round((entry.count / totalBookings) * 100)
```

---

## 5. Recommended ERP Database Schema

If the ERP is storing reservations natively, one table is enough:

```sql
create table erp_reservations (
  id              bigserial primary key,
  external_source text not null,          -- 'beds24' | 'direct' | 'airbnb' | 'booking_com'
  external_id     text not null,
  booking_ref     text,                   -- e.g. BKB-20261104-ABC123 when direct
  room_id         integer not null,
  room_name       text not null,
  guest_name      text,
  guest_email     text,
  arrival         date not null,
  departure       date not null,
  nights          integer generated always as (departure - arrival) stored,
  adults          integer default 1,
  children        integer default 0,
  status          text not null,          -- confirmed | new | request | cancelled
  channel_label   text not null,          -- Website | Admin | Booking.com | Airbnb | ...
  price_usd       numeric(12,2) default 0,
  fx_ghs_per_usd  numeric(10,4) default 15.5,
  revenue_ghs     numeric(14,2) generated always as (
                    case when status = 'cancelled' then 0
                         else round(price_usd * fx_ghs_per_usd, 2)
                    end
                  ) stored,
  raw_payload     jsonb,
  updated_at      timestamptz default now(),
  unique (external_source, external_id)
);

create index on erp_reservations (arrival);
create index on erp_reservations (channel_label);
create index on erp_reservations (room_id);
```

With that table, any monthly or custom report is three `GROUP BY` queries (`channel_label`, `room_name`, `status`) over `WHERE arrival BETWEEN :dateFrom AND :dateTo`.

---

## 6. Two Ways the ERP Can Pull Data

| Option | How | Best when |
|--------|-----|-----------|
| **A. Pull raw bookings (`GET /bookings` or `GET /api/admin/bookings`)** | ERP runs the normalization + SQL above itself | ERP wants full reservation-level drill-down |
| **B. Pull pre-built reports from BokoBoko (`/api/admin/reports`)** | `GET /api/admin/reports?period=YYYY-MM` or `POST /api/admin/reports` with `{ dateFrom, dateTo }` | ERP only wants monthly summary numbers |
