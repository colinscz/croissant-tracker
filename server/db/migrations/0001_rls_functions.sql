-- Croissant Tracker — access rules, in plain PostgreSQL
--
-- This is the self-hosted port of the old Supabase migrations 0002–0007
-- (still in git history under supabase/migrations/). The rules are the same;
-- only the Supabase-specific plumbing changed:
--
--   Supabase                      Here
--   ----------------------------  -----------------------------------------------
--   auth.uid()                    app.current_user_id() — reads the transaction-
--                                 local setting `app.user_id`, which the Nitro
--                                 server sets from the verified Hanko JWT
--                                 (server/utils/db.ts → withUser)
--   role `authenticated`          role `croissant_app` — the login the Nuxt server
--                                 uses. NOBYPASSRLS and not the table owner, so
--                                 every policy below applies to it.
--   auth.users trigger → profile  app.sync_own_profile(email), called by the
--                                 server on each signed-in API request
--
-- This file runs as `croissant_owner` (DATABASE_OWNER_URL), which owns every
-- table and function. Owners bypass RLS, which is exactly what the
-- `security definer` helpers rely on to avoid recursive policy checks.
--
-- Both roles are created by docker/postgres/init/01-roles.sh. The role name
-- `croissant_app` is fixed here; change it in both places if you must.


-- ---------------------------------------------------------------------------
-- Request identity
-- ---------------------------------------------------------------------------

create schema if not exists app;

-- Null when the server didn't set a user — every policy then evaluates to false.
-- `current_setting(..., true)` returns null instead of erroring when unset, and
-- '' once a transaction that set it has ended on this pooled connection.
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;


-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- `security definer` on purpose: an RLS policy on `team_members` that selects
-- from `team_members` would recurse infinitely. Running the check with the
-- owner's rights bypasses RLS and breaks the cycle.
-- ---------------------------------------------------------------------------

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and profile_id = app.current_user_id()
  );
$$;

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and profile_id = app.current_user_id()
      and role = 'owner'
  );
$$;

create or replace function public.shares_team_with(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, app
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.profile_id = app.current_user_id()
      and theirs.profile_id = p_profile_id
  );
$$;


-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- Create or refresh the caller's own profile from the email in their Hanko
-- session. Replaces Supabase's `sync_profile_from_auth_user` trigger: there is
-- no auth.users table in this database to hang a trigger on.
--
-- If another profile still holds this address (its Hanko account was deleted
-- and the person signed up again), that stale row gives the email up — the
-- address belongs to whoever can currently prove they own it.
create or replace function app.sync_own_profile(p_email text)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_uid   uuid := app.current_user_id();
  v_email text := nullif(trim(p_email), '');
begin
  if v_uid is null then
    raise exception 'You must be signed in';
  end if;

  if v_email is not null then
    update public.profiles
    set email = null
    where lower(email) = lower(v_email)
      and id <> v_uid;
  end if;

  insert into public.profiles (id, email)
  values (v_uid, v_email)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email)
  where excluded.email is not null
    and public.profiles.email is distinct from excluded.email;
end;
$$;


-- ---------------------------------------------------------------------------
-- Team lifecycle
-- ---------------------------------------------------------------------------

-- Whoever creates a team becomes its first owner.
create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, profile_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();


-- A team must always keep at least one owner, otherwise nobody can manage it.
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role <> 'owner' then
    return old;
  end if;

  -- Deleting the team itself cascades to its members; that's not an orphan.
  if not exists (select 1 from public.teams where id = old.team_id) then
    return old;
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = old.team_id
      and role = 'owner'
      and profile_id <> old.profile_id
  ) then
    raise exception 'A team must have at least one owner';
  end if;

  return old;
end;
$$;

create trigger on_team_member_removed
  before delete on public.team_members
  for each row execute function public.prevent_last_owner_removal();


-- Create a team and return it.
--
-- Not a plain insert: `insert ... returning` checks the teams SELECT policy
-- before the on_team_created AFTER trigger has added the creator's membership
-- row, so the returning clause would be rejected by RLS.
create or replace function public.create_team(p_name text)
returns public.teams
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_team public.teams;
begin
  if app.current_user_id() is null then
    raise exception 'You must be signed in to create a team';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'A team needs a name';
  end if;

  insert into public.teams (name, created_by)
  values (trim(p_name), app.current_user_id())
  returning * into v_team;

  -- on_team_created already added the owner row; this is a no-op safety net.
  insert into public.team_members (team_id, profile_id, role)
  values (v_team.id, app.current_user_id(), 'owner')
  on conflict do nothing;

  return v_team;
end;
$$;


-- Assign an existing profile to a team by the email on their account.
-- `security definer` so it can look past the profiles RLS (you can't read the
-- profile of someone who isn't on a team with you yet).
create or replace function public.add_team_member_by_email(p_team_id uuid, p_email text)
returns public.team_members
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_profile_id uuid;
  v_row        public.team_members;
begin
  if not public.is_team_owner(p_team_id) then
    raise exception 'Only team owners can add members';
  end if;

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


-- Team members with their account email, for the member list on /teams.
-- Restricted to members of the team, so this is not a global email directory.
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
set search_path = public, app
as $$
  select
    p.id,
    coalesce(p.email, ''),
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


-- ---------------------------------------------------------------------------
-- The rule: you can't resolve your own croissant debt.
--
-- A trigger rather than a tighter RLS policy, because the rule is about one
-- column changing, not about who may touch the row: the debtor can still fix
-- their entry's date or reason, and the refusal arrives as a readable message
-- (the server maps `raise exception` to a 400 the UI shows in a UAlert) instead
-- of a silent zero-row update.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_self_delivery()
returns trigger
language plpgsql
set search_path = public, app
as $$
begin
  if tg_op = 'INSERT' then
    if new.delivered and app.current_user_id() = new.debtor_profile_id then
      raise exception 'You can''t log your own croissant debt as already delivered — a teammate has to confirm it.';
    end if;
  elsif new.delivered is distinct from old.delivered
    and app.current_user_id() = old.debtor_profile_id then
    if new.delivered then
      raise exception 'You can''t mark your own croissant debt as delivered — a teammate has to confirm it.';
    else
      raise exception 'You can''t reopen your own croissant debt — only a teammate can change whether it''s delivered.';
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_self_delivery
  before insert or update on public.croissant_entries
  for each row execute function public.prevent_self_delivery();


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.croissant_entries enable row level security;

-- Profiles hold email addresses: you see your own row and your teammates'.
create policy "Users can read their own profile"
  on public.profiles for select
  to croissant_app
  using (id = app.current_user_id());

create policy "Users can read teammate profiles"
  on public.profiles for select
  to croissant_app
  using (public.shares_team_with(id));

-- Teams: you only see teams you belong to.
create policy "Members can read their teams"
  on public.teams for select
  to croissant_app
  using (public.is_team_member(id));

create policy "Authenticated users can create teams"
  on public.teams for insert
  to croissant_app
  with check (created_by = app.current_user_id());

create policy "Owners can update their teams"
  on public.teams for update
  to croissant_app
  using (public.is_team_owner(id))
  with check (public.is_team_owner(id));

create policy "Owners can delete their teams"
  on public.teams for delete
  to croissant_app
  using (public.is_team_owner(id));

-- Membership.
create policy "Members can read team membership"
  on public.team_members for select
  to croissant_app
  using (public.is_team_member(team_id));

create policy "Owners can add team members"
  on public.team_members for insert
  to croissant_app
  with check (public.is_team_owner(team_id));

create policy "Owners can update team members"
  on public.team_members for update
  to croissant_app
  using (public.is_team_owner(team_id))
  with check (public.is_team_owner(team_id));

-- Owners can remove anyone; anyone can leave a team they're on.
create policy "Owners can remove members and members can leave"
  on public.team_members for delete
  to croissant_app
  using (public.is_team_owner(team_id) or profile_id = app.current_user_id());

-- Entries: only the team's members can see or change them.
create policy "Team members can read croissant entries"
  on public.croissant_entries for select
  to croissant_app
  using (public.is_team_member(team_id));

create policy "Team members can add croissant entries"
  on public.croissant_entries for insert
  to croissant_app
  with check (public.is_team_member(team_id));

create policy "Team members can update croissant entries"
  on public.croissant_entries for update
  to croissant_app
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

create policy "Team members can delete croissant entries"
  on public.croissant_entries for delete
  to croissant_app
  using (public.is_team_member(team_id));


-- ---------------------------------------------------------------------------
-- Grants
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default; take that
-- away so only the app role can call them.
-- ---------------------------------------------------------------------------

revoke all on schema app from public;
grant usage on schema app to croissant_app;
grant usage on schema public to croissant_app;

grant select, insert, update, delete
  on public.profiles, public.teams, public.team_members, public.croissant_entries
  to croissant_app;
grant usage on sequence public.croissant_entries_id_seq to croissant_app;

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema app from public;
grant execute on all functions in schema public to croissant_app;
grant execute on all functions in schema app to croissant_app;
