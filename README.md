# What is the Croissant Tracker? 🥐
Croissant Tracker is a fun and delicious way to encourage punctuality in your team, office, or friend group. Based on the popular European tradition where latecomers bring pastries for everyone, this app helps you keep track of who owes croissants and ensures no debt goes unforgotten!

## ⚙️ How It Works

### 1️⃣ Someone's Late
When someone arrives late to a meeting, event, or work, add their name to the tracker.

### 2️⃣ Croissant Debt Created
The system automatically tracks that they owe croissants to the group.

### 3️⃣ Croissants Delivered
When they bring the promised croissants, mark the debt as delivered!


## 🇫🇷 The Tradition
The tradition of bringing pastries when you're late is common in many European workplaces, particularly in France, Germany, and other countries. It's a lighthearted way to acknowledge lateness while treating your colleagues to something delicious.

While croissants are the classic choice, the tradition can include any pastries, donuts, or treats that bring joy to the team. It's not about punishment—it's about building camaraderie and encouraging punctuality in a fun way!

## 🗄️ Data Storage (Supabase)

Croissant entries are stored in a [Supabase](https://supabase.com/) Postgres
database via the official [`@nuxtjs/supabase`](https://supabase.nuxtjs.org/)
module, so the tracker is shared across everyone who opens the app.

### Setup

1. Create a Supabase project.
2. Run the SQL migrations in [`supabase/migrations/`](supabase/migrations) in
   order (e.g. paste each into the SQL Editor):
   [`0001_croissant_entries.sql`](supabase/migrations/0001_croissant_entries.sql)
   creates the `croissant_entries` table,
   [`0002_require_authenticated.sql`](supabase/migrations/0002_require_authenticated.sql)
   restricts it to signed-in users (see auth setup below),
   [`0003_teams.sql`](supabase/migrations/0003_teams.sql) adds teams and team
   membership, and
   [`0004_team_scoped_entries.sql`](supabase/migrations/0004_team_scoped_entries.sql)
   ties each entry to a team, and
   [`0005_profiles_email.sql`](supabase/migrations/0005_profiles_email.sql) adds
   an `email` column to `public.profiles` and creates profile rows automatically.
   [`0006_prune_profiles_without_email.sql`](supabase/migrations/0006_prune_profiles_without_email.sql)
   is optional housekeeping: it re-runs the backfill and deletes profiles that
   still have no usable email.

   > ⚠️ `0004` **deletes all existing croissant entries.** They predate teams, so
   > there's no way to tell which team each one belonged to.

   These migrations expect a `public.profiles` table keyed on the `auth.users` id
   (the standard Supabase profile table). After `0005`, a profile is created
   automatically the first time someone requests a magic link, and existing users
   are backfilled — so there's nothing to do by hand.

   > ⚠️ `0006` **deletes data**: removing a profile cascades to its team
   > memberships, and any team whose owners are *all* being pruned is deleted
   > along with its croissant entries. Its header has two dry-run queries — run
   > them first and check what comes back. Skip this migration entirely if you
   > have no email-less profiles to clean up.

   > ⚠️ Read the header of `0005` before applying it. It installs a trigger on
   > `auth.users`, and a trigger that fails aborts the insert that fired it — so
   > if your `profiles` table has a `NOT NULL` column without a default, sign-in
   > itself breaks. The header has a one-line query to check. It also drops the
   > quickstart "public profiles are viewable by everyone" policy, since profiles
   > now hold email addresses; verify the policy name in your project matches.
3. Copy `.env.example` to `.env` and fill in your project's API URL and
   **anon** public key (Project Settings → API):

   ```bash
   cp .env.example .env
   ```

   ```dotenv
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your-anon-public-key
   ```

4. `pnpm install && pnpm dev`.

## 👥 Teams

Croissant debts belong to a **team**, not to everyone with an account. Head to
**/teams** to:

- **Create a team** — whoever creates it becomes its owner.
- **Add members by email** — enter the email address on their Croissant Tracker
  account. A profile is created as soon as someone requests a magic link, so they
  need to have hit the sign-in page once; they don't have to have clicked the link
  yet, which makes this a rough-and-ready invite.
- **Remove members / delete a team** — owners can remove anyone and delete the
  team (which deletes its entries too). Anyone can leave a team themselves, and a
  team always keeps at least one owner.

You can be on as many teams as you like; the tracker page has a selector to
choose which team's debts you're looking at.

This is enforced in the database, not just the UI: row-level security in
[`0004_team_scoped_entries.sql`](supabase/migrations/0004_team_scoped_entries.sql)
means a signed-in user simply cannot read or write entries for a team they're not
a member of. Email lookup happens in a `security definer` Postgres function
rather than in the browser, and `profiles` rows are readable only to yourself and
people you share a team with — so the app never exposes a queryable directory of
everyone's email address.

## 🔐 Signing In (Magic Link)

The app is gated behind **Supabase Auth** using passwordless **magic links**.
Visitors are redirected to `/login`, enter their email, and receive a link that
signs them in via `/confirm`. Only the `/about` page is public.

To enable this in your Supabase project:

1. **Authentication → Providers → Email**: make sure email sign-in is enabled.
   (Magic links work with just an email — no password needed.)
2. **Authentication → URL Configuration**: set the **Site URL** and add the
   app's confirm URL to **Redirect URLs**, for both local and production, e.g.:

   - `http://localhost:3000/confirm`
   - `https://<your-username>.github.io/croissant-tracker/confirm`

3. (Optional) Restrict who can sign in by disabling public sign-ups and
   inviting users under **Authentication → Users**.

> Note: migration `0002_require_authenticated.sql` restricts the
> `croissant_entries` table to the `authenticated` role, so only signed-in
> users can read or write entries — the anon key alone is denied by RLS.
