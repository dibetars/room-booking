create type intent_status as enum (
  'DRAFT', 'HELD', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED',
  'EXPIRED', 'PAYMENT_FAILED', 'RECONCILE_NEEDED', 'CANCELLED'
);

create table booking_intents (
  id                uuid primary key default gen_random_uuid(),
  reference         text unique not null,
  status            intent_status not null default 'DRAFT',
  beds24_booking_id bigint,
  room_id           integer not null,
  check_in          date not null,
  check_out         date not null,
  adults            int not null default 1,
  children          int not null default 0,
  guest_name        text not null,
  guest_email       text not null,
  guest_phone       text,
  amount_pesewas    integer not null,
  currency          text not null default 'GHS',
  paystack_status   text,
  expires_at        timestamptz,
  beds24_raw        jsonb,
  paystack_raw      jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index on booking_intents (status, expires_at);
create index on booking_intents (guest_email);

alter table booking_intents enable row level security;
-- Service role key bypasses RLS; no public access needed.
