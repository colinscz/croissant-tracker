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
   ties each entry to a team.

   > ⚠️ `0004` **deletes all existing croissant entries.** They predate teams, so
   > there's no way to tell which team each one belonged to.

   `0003` expects a `public.profiles` table keyed on the `auth.users` id (the
   standard Supabase profile table). Every signed-in user needs a row in it to be
   assignable to a team — see the commented backfill at the bottom of `0003` if
   your project doesn't create profiles automatically.
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
  account. They must already have a profile; there's no invite flow, so have them
  sign in once first.
- **Remove members / delete a team** — owners can remove anyone and delete the
  team (which deletes its entries too). Anyone can leave a team themselves, and a
  team always keeps at least one owner.

You can be on as many teams as you like; the tracker page has a selector to
choose which team's debts you're looking at.

This is enforced in the database, not just the UI: row-level security in
[`0004_team_scoped_entries.sql`](supabase/migrations/0004_team_scoped_entries.sql)
means a signed-in user simply cannot read or write entries for a team they're not
a member of. Email lookup happens in a `security definer` Postgres function
rather than in the browser, so the app never exposes a queryable directory of
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
