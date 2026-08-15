-- Croissant Tracker — profiles carry an email, and are created automatically
--
-- Migration 0003 assumed every signed-in user already had a `public.profiles`
-- row. Nothing creates one, which broke three things:
--
--   1. `team_members.profile_id` references `public.profiles (id)`, so the
--      `on_team_created` trigger hit a foreign key violation and team creation
--      failed outright for anyone without a profile.
--   2. `add_team_member_by_email` inner-joins profiles, so it reported
--      "No profile found" for people who genuinely have an account.
--   3. `list_team_members` inner-joins profiles, silently dropping those members.
--
-- This migration creates a profile the moment a magic link is requested, gives
-- profiles an `email` column, and backfills everyone who already exists. With
-- email on the profile, the two RPCs no longer need to detour through
-- `auth.users` to resolve an address.
--
-- BEFORE APPLYING: check that a bare `(id, email)` insert into your profiles
-- table can succeed —
--
--   select column_name, is_nullable, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles';
--
-- A trigger on `auth.users` that raises aborts the insert that fired it, which
-- means a failing profile insert breaks magic-link sign-in itself. If any column
-- besides `id` is NOT NULL without a default, give it a default or add it to the
-- insert in sync_profile_from_auth_user() below first.


alter table public.profiles add column if not exists email text;

-- auth.users.email is unique case-insensitively; mirror that so the lookup in
-- add_team_member_by_email can never match two rows. Multiple NULLs are fine.
create unique index if not exists profiles_email_lower_key
  on public.profiles (lower(email));


-- Keep public.profiles.email in step with auth.users.email.
--
-- Deliberately not named `handle_new_user`: the project may already have a
-- Supabase quickstart trigger by that name populating username/full_name, and
-- `create or replace` would silently clobber it. This function only owns the
-- email column, so the two coexist.

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email
  where public.profiles.email is distinct from excluded.email;

  return new;
end;
$$;

-- `signInWithOtp` inserts the auth.users row when the magic link is *requested*
-- (shouldCreateUser defaults to true), not when it's clicked — so an after-insert
-- trigger is what makes the profile available immediately. A user who requests a
-- link but never clicks it still gets a profile, which doubles as a lightweight
-- invite: an owner can add them to a team before their first sign-in.
drop trigger if exists on_auth_user_created_sync_profile on auth.users;
create trigger on_auth_user_created_sync_profile
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth_user();

-- Keep the profile correct if the address later changes.
drop trigger if exists on_auth_user_email_changed_sync_profile on auth.users;
create trigger on_auth_user_email_changed_sync_profile
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_from_auth_user();


-- Backfill: creates the rows that were missing (unbreaking team creation for
-- existing users) and fills email on profiles that already existed.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
on conflict (id) do update
  set email = excluded.email
where public.profiles.email is distinct from excluded.email;


-- Now that profiles hold email addresses, reads have to be narrowed: the table
-- would otherwise be a directory of everyone's email.

-- `security definer` for the same reason as is_team_member — a policy on
-- profiles that reads team_members would otherwise be evaluated under the
-- caller's own RLS.
create or replace function public.shares_team_with(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.profile_id = auth.uid()
      and theirs.profile_id = p_profile_id
  );
$$;

revoke execute on function public.shares_team_with(uuid) from anon, public;
grant execute on function public.shares_team_with(uuid) to authenticated;

alter table public.profiles enable row level security;

-- The Supabase quickstart ships `for select using (true)`, which would publish
-- every email now that the column exists.
--
-- ⚠️ The name below is the quickstart default. Confirm what your project
-- actually has and drop that instead — if the name doesn't match, this drop
-- silently does nothing and emails stay world-readable:
--
--   select policyname, cmd, qual from pg_policies
--   where schemaname = 'public' and tablename = 'profiles';
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can read teammate profiles" on public.profiles;
create policy "Users can read teammate profiles"
  on public.profiles for select
  to authenticated
  using (public.shares_team_with(id));

-- Any existing insert/update policies are left alone; this only narrows reads.


-- Replace the 0003 functions that had to reach into auth.users for an email.

create or replace function public.create_team(p_name text)
returns public.teams
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a team';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'A team needs a name';
  end if;

  -- Defensive: guarantee the caller has a profile row before the team_members
  -- FK needs it. The auth.users trigger covers anyone created after this
  -- migration; this covers rows that predate it.
  insert into public.profiles (id, email)
  select u.id, u.email
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  insert into public.teams (name, created_by)
  values (trim(p_name), auth.uid())
  returning * into v_team;

  -- on_team_created already added the owner row; this is a no-op safety net.
  insert into public.team_members (team_id, profile_id, role)
  values (v_team.id, auth.uid(), 'owner')
  on conflict do nothing;

  return v_team;
end;
$$;

create or replace function public.add_team_member_by_email(p_team_id uuid, p_email text)
returns public.team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_row        public.team_members;
begin
  if not public.is_team_owner(p_team_id) then
    raise exception 'Only team owners can add members';
  end if;

  -- Straight off profiles now: it tracks auth.users 1:1, so a missing row here
  -- genuinely means nobody has ever signed in with that address.
  select p.id
  into v_profile_id
  from public.profiles p
  where lower(p.email) = lower(trim(p_email));

  if v_profile_id is null then
    raise exception 'No account found for % — they need to sign in once first', p_email;
  end if;

  insert into public.team_members (team_id, profile_id)
  values (p_team_id, v_profile_id)
  on conflict (team_id, profile_id) do nothing
  returning * into v_row;

  if v_row is null then
    raise exception '% is already on this team', p_email;
  end if;

  return v_row;
end;
$$;

create or replace function public.list_team_members(p_team_id uuid)
returns table (
  profile_id uuid,
  email      text,
  username   text,
  full_name  text,
  avatar_url text,
  role       text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.username,
    p.full_name,
    p.avatar_url,
    tm.role,
    tm.created_at
  from public.team_members tm
  join public.profiles p on p.id = tm.profile_id
  where tm.team_id = p_team_id
    and public.is_team_member(p_team_id)
  order by tm.role, coalesce(p.full_name, p.username, p.email);
$$;

revoke execute on function public.create_team(text) from anon, public;
revoke execute on function public.add_team_member_by_email(uuid, text) from anon, public;
revoke execute on function public.list_team_members(uuid) from anon, public;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.add_team_member_by_email(uuid, text) to authenticated;
grant execute on function public.list_team_members(uuid) to authenticated;
