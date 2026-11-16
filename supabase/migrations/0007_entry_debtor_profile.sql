-- Croissant Tracker — entries name a real debtor, who can't clear their own tab
--
-- Until now the person who owed the croissants was free text
-- (`croissant_entries.name`, migration 0001). Nothing tied that string to an
-- account, so the database had no identity to compare `auth.uid()` against and
-- any team member could mark any debt — including their own — as delivered.
--
-- This migration:
--   1. adds `debtor_profile_id`, a required reference to the profile that owes
--      the croissants, so entries can only be logged against a real teammate;
--   2. keeps `name` as a display snapshot of that profile's label at the time
--      the entry was logged (cheap reads, and history keeps the name it was
--      filed under even if someone later renames their profile);
--   3. installs `prevent_self_delivery`, which rejects any attempt to flip
--      `delivered` on your own debt. Somebody else has to confirm it.
--
-- NOTE: this deletes entries whose `name` can't be resolved to exactly one
-- member of the entry's team. They predate the debtor column and there is no
-- reliable way to guess who they belonged to (same destructive-backfill
-- reasoning as 0004 and 0006). The backfill below rescues every entry whose
-- name unambiguously matches a teammate's name, username, or email.


-- Nullable to begin with, so existing rows survive long enough to be backfilled.
alter table public.croissant_entries
  add column if not exists debtor_profile_id uuid
  references public.profiles (id) on delete cascade;


-- Best-effort backfill: match `name` against the members of the entry's own
-- team, case-insensitively, on full name / username / email / email local part.
-- The `count(*) = 1` guard means an ambiguous name resolves to nothing rather
-- than to the wrong person.
with candidates as (
  select
    e.id as entry_id,
    tm.profile_id
  from public.croissant_entries e
  join public.team_members tm on tm.team_id = e.team_id
  join public.profiles p on p.id = tm.profile_id
  where e.debtor_profile_id is null
    and lower(btrim(e.name)) in (
      lower(btrim(p.full_name)),
      lower(btrim(p.username)),
      lower(btrim(p.email)),
      lower(split_part(btrim(p.email), '@', 1))
    )
),
unambiguous as (
  -- uuid has no min()/max(), and the having clause already guarantees the
  -- array holds exactly one distinct id.
  select entry_id, (array_agg(distinct profile_id))[1] as profile_id
  from candidates
  group by entry_id
  having count(distinct profile_id) = 1
)
update public.croissant_entries e
set debtor_profile_id = u.profile_id
from unambiguous u
where u.entry_id = e.id;

-- Anything left is unattributable; see the NOTE above.
delete from public.croissant_entries where debtor_profile_id is null;

alter table public.croissant_entries
  alter column debtor_profile_id set not null;

create index if not exists croissant_entries_debtor_profile_id_idx
  on public.croissant_entries (debtor_profile_id);


-- The rule: you can't resolve your own croissant debt.
--
-- A trigger rather than a tighter RLS policy, because the rule is about one
-- column changing, not about who may touch the row. Folding it into the
-- "Team members can update croissant entries" policy would also stop the debtor
-- from correcting their own entry's date or reason, and a policy failure
-- surfaces as a silent zero-row update instead of a message the UI can show.
-- `raise exception` reaches the browser as `error.message`, which the page
-- already renders in a UAlert.
--
-- The INSERT branch closes the obvious way around it: logging your own debt
-- pre-delivered.
create or replace function public.prevent_self_delivery()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.delivered and auth.uid() = new.debtor_profile_id then
      raise exception 'You can''t log your own croissant debt as already delivered — a teammate has to confirm it.';
    end if;
  elsif new.delivered is distinct from old.delivered
    and auth.uid() = old.debtor_profile_id then
    if new.delivered then
      raise exception 'You can''t mark your own croissant debt as delivered — a teammate has to confirm it.';
    else
      raise exception 'You can''t reopen your own croissant debt — only a teammate can change whether it''s delivered.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_self_delivery on public.croissant_entries;
create trigger prevent_self_delivery
  before insert or update on public.croissant_entries
  for each row execute function public.prevent_self_delivery();
