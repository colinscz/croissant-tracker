-- Croissant Tracker — teams
--
-- Adds teams and team membership so croissant debts can be scoped to a group
-- instead of being shared by every signed-in user. A profile can belong to many
-- teams, and a team can have many members.
--
-- Membership references `public.profiles` (the standard Supabase profile table,
-- whose `id` is the `auth.users` id). Members are added by the email address on
-- their Supabase account — but `profiles` has no email column and `auth.users`
-- is not readable from the browser, so the lookup happens in the
-- `add_team_member_by_email` security-definer function below rather than in the
-- client. That keeps the app from exposing a queryable directory of everyone's
-- email address to any signed-in user.

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null check (length(trim(name)) > 0),
  created_by uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id    uuid        not null references public.teams (id) on delete cascade,
  profile_id uuid        not null references public.profiles (id) on delete cascade,
  role       text        not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

-- "Which teams am I on?" is the hot path for every page load.
create index if not exists team_members_profile_id_idx on public.team_members (profile_id);


-- Membership helpers.
--
-- These are `security definer` on purpose: an RLS policy on `team_members` that
-- selects from `team_members` would recurse infinitely. Running the check with
-- the function owner's rights bypasses RLS and breaks the cycle.

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and profile_id = auth.uid()
  );
$$;

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and profile_id = auth.uid()
      and role = 'owner'
  );
$$;

revoke execute on function public.is_team_member(uuid) from anon, public;
revoke execute on function public.is_team_owner(uuid) from anon, public;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;


-- Whoever creates a team becomes its first owner.
--
-- This has to be a trigger rather than a client-side insert: at the moment the
-- team row lands it has no members, so `is_team_owner()` is false and the
-- team_members insert policy below would reject the very first owner row.

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

drop trigger if exists on_team_created on public.teams;
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

drop trigger if exists on_team_member_removed on public.team_members;
create trigger on_team_member_removed
  before delete on public.team_members
  for each row execute function public.prevent_last_owner_removal();


-- Row Level Security: you can only see teams you belong to.

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "Members can read their teams"
  on public.teams for select
  to authenticated
  using (public.is_team_member(id));

create policy "Authenticated users can create teams"
  on public.teams for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Owners can update their teams"
  on public.teams for update
  to authenticated
  using (public.is_team_owner(id))
  with check (public.is_team_owner(id));

create policy "Owners can delete their teams"
  on public.teams for delete
  to authenticated
  using (public.is_team_owner(id));

create policy "Members can read team membership"
  on public.team_members for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "Owners can add team members"
  on public.team_members for insert
  to authenticated
  with check (public.is_team_owner(team_id));

create policy "Owners can update team members"
  on public.team_members for update
  to authenticated
  using (public.is_team_owner(team_id))
  with check (public.is_team_owner(team_id));

-- Owners can remove anyone; anyone can leave a team they're on.
create policy "Owners can remove members and members can leave"
  on public.team_members for delete
  to authenticated
  using (public.is_team_owner(team_id) or profile_id = auth.uid());


-- Create a team and return it.
--
-- This can't be a plain client-side insert: `insert ... returning` enforces the
-- teams SELECT policy while the statement runs, which is before the
-- on_team_created AFTER trigger has added the creator's membership row — so the
-- returning clause would be rejected by RLS. Doing both writes inside one
-- `security definer` function sidesteps the ordering entirely.

create or replace function public.create_team(p_name text)
returns public.teams
language plpgsql
security definer
set search_path = public
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

revoke execute on function public.create_team(text) from anon, public;
grant execute on function public.create_team(text) to authenticated;


-- Assign an existing profile to a team by the email on their account.
--
-- `security definer` so it can read `auth.users`, which the anon key cannot.
-- The owner check is done inside the function, not by RLS, because the function
-- runs with elevated rights.

create or replace function public.add_team_member_by_email(p_team_id uuid, p_email text)
returns public.team_members
language plpgsql
security definer
set search_path = public, auth
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
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email));

  if v_profile_id is null then
    raise exception 'No profile found for %', p_email;
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
set search_path = public, auth
as $$
  select
    p.id,
    u.email::text,
    p.username,
    p.full_name,
    p.avatar_url,
    tm.role,
    tm.created_at
  from public.team_members tm
  join public.profiles p on p.id = tm.profile_id
  join auth.users u on u.id = p.id
  where tm.team_id = p_team_id
    and public.is_team_member(p_team_id)
  order by tm.role, coalesce(p.full_name, p.username, u.email::text);
$$;

revoke execute on function public.add_team_member_by_email(uuid, text) from anon, public;
revoke execute on function public.list_team_members(uuid) from anon, public;
grant execute on function public.add_team_member_by_email(uuid, text) to authenticated;
grant execute on function public.list_team_members(uuid) to authenticated;


-- Every signed-in user needs a `public.profiles` row to be added to a team.
-- The standard Supabase setup creates one from a trigger on `auth.users`; if
-- your project doesn't, uncomment this backfill (and add a trigger of your own).
-- It's left commented because your `profiles` columns may have NOT NULL
-- constraints that a bare id insert would violate.
--
-- insert into public.profiles (id)
-- select id from auth.users
-- on conflict (id) do nothing;
