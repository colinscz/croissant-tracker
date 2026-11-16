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

## 🏗️ Architecture

Everything is self-hosted with Docker. There are no third-party backend services
apart from an SMTP provider for sign-in emails.

| Piece | What it does |
|---|---|
| **Nuxt 4** app (Nitro `node-server`) | Serves the client-rendered UI and a small JSON API under `/api` |
| **PostgreSQL 17** | Stores teams, members, profiles and croissant entries. Row-level security enforces who can see and change what |
| **[Hanko](https://www.hanko.io/)** (self-hosted) | Passwordless sign-in: a one-time code by email, plus optional passkeys. Integrated via [`@nuxtjs/hanko`](https://github.com/nuxt-modules/hanko) |
| **Caddy** | HTTPS with automatic Let's Encrypt certificates (production only) |

Database access uses [Drizzle ORM](https://orm.drizzle.team/) with the
[`postgres`](https://github.com/porsager/postgres) driver. Migrations live in
[`server/db/migrations`](server/db/migrations): `0000_init.sql` is generated
from [`server/db/schema.ts`](server/db/schema.ts), and
[`0001_rls_functions.sql`](server/db/migrations/0001_rls_functions.sql) holds
the hand-written RLS policies, functions and triggers.

### How a request is authorised

1. The browser signs in with Hanko, and `hanko-elements` stores the session JWT
   as the `hanko` cookie.
2. For each `/api` call, the Nitro server verifies that JWT against Hanko's
   public keys (`server/utils/auth.ts`).
3. It opens a transaction **as the `croissant_app` role**, which is subject to
   RLS, and runs `set_config('app.user_id', <hanko user id>, true)`
   (`server/utils/db.ts`).
4. Every policy and trigger reads `app.current_user_id()`. A query from a user
   who isn't on a team simply returns nothing.

## 🚀 Running It

### Production (Hetzner or any Docker host)

See **[docs/self-hosting-hetzner.md](docs/self-hosting-hetzner.md)**. In short:

```bash
cp .env.example .env   # set domains, passwords, SMTP
docker compose up -d --build
```

### Local development

Requirements: Docker, Node 24 and pnpm.

```bash
cp .env.example .env   # the defaults work for local development
```

Run the backing services: Postgres, Hanko, migrations, and Mailpit to catch
sign-in emails at <http://localhost:8025>:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres hanko app-migrate mailpit
```

Then run Nuxt with hot reload on the host:

```bash
pnpm install && pnpm dev
```

`pnpm dev` reads `NUXT_DATABASE_URL` and `NUXT_PUBLIC_HANKO_API_URL` from `.env`.
To run the full stack in containers instead, including the app on
<http://localhost:3000>:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Database changes

1. Edit `server/db/schema.ts`.
2. Run `pnpm db:generate` to write a new SQL migration. For policies, functions
   or triggers, run `pnpm drizzle-kit generate --custom --name <name>` and write
   the SQL by hand.
3. Run `pnpm db:migrate` to apply it locally (uses `DATABASE_OWNER_URL`). In
   Docker, the `app-migrate` service applies it on the next `up`.

## 👥 Teams

Croissant debts belong to a **team**, not to everyone with an account. Head to
**/teams** to:

- **Create a team** — whoever creates it becomes its owner.
- **Add members by email**: enter the email address on their Croissant Tracker
  account. Their profile is created the first time they sign in, so they need to
  have signed in once before you can add them.
- **Remove members / delete a team** — owners can remove anyone and delete the
  team (which deletes its entries too). Anyone can leave a team themselves, and a
  team always keeps at least one owner.

You can be on as many teams as you like; the tracker page has a selector to
choose which team's debts you're looking at.

This is enforced in the database, not just the UI: row-level security in
[`0001_rls_functions.sql`](server/db/migrations/0001_rls_functions.sql) means a
signed-in user simply cannot read or write entries for a team they're not a
member of. Email lookup happens in a `security definer` Postgres function rather
than in the browser, and `profiles` rows are readable only to yourself and
people you share a team with. So the app never exposes a queryable directory of
everyone's email address.

## 🔐 Signing In

Sign-in is handled by a self-hosted **Hanko** instance. Visitors are redirected
to `/login`, enter their email and type the one-time code Hanko emails them. New
emails are registered on the spot. After that they can add a **passkey** and
skip the email step. Only the `/about` page is public.

Your profile is created the first time you use the app after signing in, which
is when teammates can start adding you to teams by email.

Each entry names the teammate who owes the croissants, and **that person can't
mark their own debt as delivered**. Somebody else has to confirm it. A Postgres
trigger (`prevent_self_delivery`) enforces this, not just the UI.
