-- Scope croissant entries to a team.
--
-- Migration 0002 restricted `croissant_entries` to the `authenticated` role but
-- left every policy at `using (true)`, so any signed-in user could read and edit
-- every row. Now that teams exist (0003), each entry belongs to exactly one team
-- and only that team's members can see or change it.
--
-- NOTE: this deletes all existing entries. They predate teams and there is no
-- way to tell which team each one belonged to, so there is nothing to backfill.

delete from public.croissant_entries;

alter table public.croissant_entries
  add column if not exists team_id uuid not null
  references public.teams (id) on delete cascade;

create index if not exists croissant_entries_team_id_idx on public.croissant_entries (team_id);

-- Replace the 0002 policies (same drop-then-create pattern 0002 used on 0001).
drop policy if exists "Authenticated users can read croissant entries" on public.croissant_entries;
drop policy if exists "Authenticated users can add croissant entries" on public.croissant_entries;
drop policy if exists "Authenticated users can update croissant entries" on public.croissant_entries;
drop policy if exists "Authenticated users can delete croissant entries" on public.croissant_entries;

create policy "Team members can read croissant entries"
  on public.croissant_entries for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "Team members can add croissant entries"
  on public.croissant_entries for insert
  to authenticated
  with check (public.is_team_member(team_id));

create policy "Team members can update croissant entries"
  on public.croissant_entries for update
  to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

create policy "Team members can delete croissant entries"
  on public.croissant_entries for delete
  to authenticated
  using (public.is_team_member(team_id));
