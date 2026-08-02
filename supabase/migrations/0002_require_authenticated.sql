-- Restrict croissant_entries to authenticated sessions.
--
-- The initial migration (0001) opened the table to the anon key. Now that the
-- app requires a Supabase Auth magic-link sign-in, replace those policies with
-- ones scoped to the `authenticated` role, so a valid session is required to
-- read or write entries. The anon role is left with no policy and is therefore
-- denied by RLS.

drop policy if exists "Anyone can read croissant entries" on public.croissant_entries;
drop policy if exists "Anyone can add croissant entries" on public.croissant_entries;
drop policy if exists "Anyone can update croissant entries" on public.croissant_entries;
drop policy if exists "Anyone can delete croissant entries" on public.croissant_entries;

create policy "Authenticated users can read croissant entries"
  on public.croissant_entries for select
  to authenticated
  using (true);

create policy "Authenticated users can add croissant entries"
  on public.croissant_entries for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update croissant entries"
  on public.croissant_entries for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete croissant entries"
  on public.croissant_entries for delete
  to authenticated
  using (true);
