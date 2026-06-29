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
2. Run the SQL in [`supabase/migrations/0001_croissant_entries.sql`](supabase/migrations/0001_croissant_entries.sql)
   (e.g. paste it into the SQL Editor) to create the `croissant_entries` table
   and its row-level-security policies.
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

> The app uses no authentication: the table's RLS policies allow the anon key
> to read and write entries. Add Supabase Auth and tighten the policies if you
> need access control.
