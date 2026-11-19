-- Optional table for archived Beds24 messages (read-only after leaving Beds24).
-- Live project currently stores the same payload in app_settings key
-- 'beds24_archive_messages' so no DDL is required to serve the admin UI.
create table if not exists public.beds24_archive_messages (
  id bigint primary key,
  booking_id bigint,
  room_id integer,
  property_id integer,
  time timestamptz,
  read boolean,
  message text,
  source text,
  author_owner_id bigint,
  raw jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now()
);

create index if not exists beds24_archive_messages_booking_id_idx
  on public.beds24_archive_messages (booking_id);

create index if not exists beds24_archive_messages_time_idx
  on public.beds24_archive_messages (time desc);

alter table public.beds24_archive_messages enable row level security;

-- Manifest / import metadata for the Beds24 archive.
create table if not exists public.beds24_archive_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.beds24_archive_meta enable row level security;
