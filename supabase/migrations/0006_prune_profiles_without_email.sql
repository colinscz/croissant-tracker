-- Croissant Tracker — backfill profiles from auth users, then prune email-less ones
--
-- Step 1 restates the backfill from 0005: every Supabase auth user with an email
-- address gets a `public.profiles` row carrying it. It's idempotent, so running
-- it again is harmless, and it has to come first — pruning before backfilling
-- would delete profiles that were about to be populated.
--
-- Step 2 deletes profiles with no usable email. After the backfill those are
-- either auth users with no address at all (phone or anonymous sign-in) or
-- `profiles` rows with no `auth.users` counterpart. Neither can ever be resolved
-- by `add_team_member_by_email`, so they're dead weight.
--
-- ⚠️ THIS DELETES DATA. `team_members.profile_id` is `on delete cascade`, so
-- removing a profile removes its team memberships. Any team whose owners are
-- *all* being pruned is deleted first — and deleting a team cascades to its
-- croissant entries. Teams that keep at least one surviving owner are untouched.
--
-- Deleting those teams first is not optional: `prevent_last_owner_removal`
-- (0003) raises 'A team must have at least one owner' and would abort the whole
-- migration otherwise. That guard returns early once the team itself is gone.
--
-- DRY RUN — run both of these before applying, and check the results.
--
--   -- Profiles that will be deleted:
--   select id, email from public.profiles
--   where email is null or trim(email) = '';
--
--   -- Teams that will be deleted with them, and the entries each one loses:
--   select t.id, t.name, count(e.id) as entries_lost
--   from public.teams t
--   left join public.croissant_entries e on e.team_id = t.id
--   where t.id in (
--     select tm.team_id
--     from public.team_members tm
--     where tm.role = 'owner'
--     group by tm.team_id
--     having bool_and(tm.profile_id in (
--       select id from public.profiles where email is null or trim(email) = ''
--     ))
--   )
--   group by t.id, t.name;


-- Step 1: every auth user with an address has a profile carrying it.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
where u.email is not null
  and trim(u.email) <> ''
on conflict (id) do update
  set email = excluded.email
where public.profiles.email is distinct from excluded.email;


-- Step 2: prune the rest, as one atomic unit that reports what it did.
do $$
declare
  v_teams    integer;
  v_profiles integer;
begin
  -- Teams whose owners are *all* about to be pruned would be left ownerless,
  -- and the last-owner guard would abort the delete. Remove them first.
  with doomed as (
    select id
    from public.profiles
    where email is null or trim(email) = ''
  ),
  ownerless as (
    select tm.team_id
    from public.team_members tm
    where tm.role = 'owner'
    group by tm.team_id
    having bool_and(tm.profile_id in (select id from doomed))
  )
  delete from public.teams t
  using ownerless o
  where t.id = o.team_id;

  get diagnostics v_teams = row_count;

  -- Cascades to team_members. A team keeping another owner survives; the pruned
  -- member's row just goes away.
  delete from public.profiles
  where email is null or trim(email) = '';

  get diagnostics v_profiles = row_count;

  raise notice 'Pruned % profile(s) without an email and % ownerless team(s).',
    v_profiles, v_teams;
end $$;
