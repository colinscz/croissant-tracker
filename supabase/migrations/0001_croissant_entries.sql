-- Croissant Tracker — entries table
--
-- Stores every logged late arrival. The app has no auth, so the table is
-- exposed to the anon/public role through permissive RLS policies. If you
-- later add Supabase Auth, tighten these policies accordingly.

create table if not exists public.croissant_entries (
  id             bigint generated always as identity primary key,
  name           text        not null,
  date           date        not null,
  reason         text        not null default '',
  delivered      boolean     not null default false,
  delivered_date date,
  created_at     timestamptz not null default now()
);

-- Newest-first history queries and leaderboard scans benefit from these.
create index if not exists croissant_entries_date_idx on public.croissant_entries (date);
create index if not exists croissant_entries_delivered_idx on public.croissant_entries (delivered);

-- Row Level Security: enabled, with open policies for the anon key.
alter table public.croissant_entries enable row level security;

create policy "Anyone can read croissant entries"
  on public.croissant_entries for select
  using (true);

create policy "Anyone can add croissant entries"
  on public.croissant_entries for insert
  with check (true);

create policy "Anyone can update croissant entries"
  on public.croissant_entries for update
  using (true)
  with check (true);

create policy "Anyone can delete croissant entries"
  on public.croissant_entries for delete
  using (true);
