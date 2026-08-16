# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Croissant Tracker** — a lighthearted single-page web app for tracking who
owes croissants for being late (a European office tradition). Users log late
arrivals, see who owes pastries, mark debts as delivered, and view a
leaderboard. Entries are persisted in a **Supabase** Postgres database via the
official **`@nuxtjs/supabase`** module — the browser talks to Supabase directly
with the anon key, so there is no custom backend/server to run.

Entries belong to a **team**. Users manage teams at `/teams` (create a team, add
existing profiles by email, remove members, delete a team), and only members of a
team can read or write that team's entries — enforced by row-level security, not
by the UI.

Access requires signing in with a **Supabase Auth magic link** (passwordless
email): the module's redirect middleware sends unauthenticated visitors to
`/login`, and the emailed link returns them through `/confirm`. Only `/about`
is public.

The app is deployed as a static site to **GitHub Pages** at the base path
`/croissant-tracker/`. Supabase connection details come from `SUPABASE_URL` /
`SUPABASE_KEY` env vars (see `.env.example`).

## Tech Stack

- **Nuxt 4** (`compatibilityVersion: 4`, `app/` source directory)
- **Vue 3** (Composition API, `<script setup>`)
- **Nuxt UI v4** (`@nuxt/ui`) — component library (`U*` components)
- **Tailwind CSS v4** (configured via `@nuxt/ui`; CSS-first in `app/assets/css/main.css`)
- **Supabase** (Postgres) via `@nuxtjs/supabase` — data persistence
- **TypeScript** + `@nuxt/eslint`
- **pnpm** as the package manager (Node 22)

> Note: `app/pages/about.vue` text says "Nuxt 3 / Nuxt UI v3", but the project
> actually runs Nuxt 4 / Nuxt UI v4 (see `package.json`).

## Commands

```bash
pnpm install        # install dependencies
pnpm dev            # start dev server (http://localhost:3000)
pnpm build          # production build
pnpm generate       # static generation
pnpm preview        # preview production build
pnpm lint           # eslint
pnpm lint:fix       # eslint --fix
pnpm typecheck      # nuxt typecheck (vue-tsc)
```

## Project Structure

```
app/
  app.vue              # root: <UApp> + layout + page
  app.config.ts        # Nuxt UI theme (primary: amber, neutral: zinc) + glass UCard styling
  assets/css/main.css  # Tailwind + Nuxt UI imports, custom croissant theme vars/classes
  layouts/default.vue  # UContainer wrapper, nav menu links, <AppHeader> + slot
  components/
    AppHeader.vue      # fixed floating nav menu (UNavigationMenu) + ColorModeButton
    AppFooter.vue      # tagline footer
    ColorModeButton.vue# dark/light toggle with View Transitions animation
    CroissantBackground.vue # fixed animated backdrop: gradient, blooms, drifting croissants
    PageHero.vue       # icon badge + h1 + subtitle, used by every page
    SectionCard.vue    # UCard with an icon+title header (replaces the old emoji headers)
    StatCard.vue       # icon + value + label tile (index stats grid)
    EmptyState.vue     # empty/loading block; `loading` swaps the icon for a spinner
  pages/
    index.vue          # main tracker UI (the core file); persistence via composable
    teams.vue          # team management: create, add/remove members by email, delete
    login.vue          # magic-link sign-in form (signInWithOtp)
    confirm.vue        # magic-link callback: completes sign-in, then redirects
    about.vue          # static informational page (public, no auth)
  composables/
    useCroissantEntries.ts # Supabase-backed entries state + CRUD helpers
    useTeams.ts        # teams/membership state + CRUD; owns `activeTeamId`
  types/database.ts    # Supabase DB schema types (typed client)
  utils/links.ts       # currently EMPTY
server/                # tsconfig only; no server routes (static app)
supabase/migrations/   # SQL: croissant_entries (0001), authenticated-only RLS (0002),
                       #      teams + membership + RPCs (0003), team-scoped entries (0004),
                       #      profiles.email + auto-create trigger (0005),
                       #      backfill + prune email-less profiles (0006, destructive)
nuxt.config.ts
.github/workflows/     # CI (lint commented out, typecheck runs) + GitHub Pages deploy
```

## Key Conventions

- **State & persistence**: The UI lives in `app/pages/index.vue`; data access is
  encapsulated in the `useCroissantEntries` composable
  (`app/composables/useCroissantEntries.ts`). It exposes a shared `entries`
  (`useState`) plus `fetchEntries` / `addEntry` / `markAsDelivered`, all backed
  by the Supabase `croissant_entries` table. Entries are fetched `onMounted`.
  DB columns are snake_case; the composable maps them to the camelCase shape the
  UI uses (`deliveredDate`, `createdAt`). There is no global store/Pinia.
- **Teams**: `useTeams` (`app/composables/useTeams.ts`) follows the same shape and
  owns `activeTeamId` (shared `useState`), which both `/` and `/teams` read.
  `fetchEntries(teamId)` / `addEntry({ teamId, ... })` are always team-scoped.
  Three `security definer` Postgres functions back the parts the anon key can't
  do itself — `create_team` (team + owner row in one statement, since
  `insert ... returning` would trip the RLS SELECT check before the
  `on_team_created` trigger runs), `add_team_member_by_email` (resolves an email
  to a profile), and `list_team_members` (member list with emails, restricted to
  that team's members). Call them with `supabase.rpc(...)`; their
  `raise exception` messages surface as `error.message` and render in a `UAlert`.
- **Profiles**: `public.profiles` is *not* created by this repo — it already
  exists in the Supabase project. Migration `0005` adds an `email` column to it
  and keeps it in step with `auth.users` via the `sync_profile_from_auth_user`
  trigger, which fires on insert (i.e. when a magic link is *requested*) and on
  email change. `team_members.profile_id` has an FK to `profiles`, so a missing
  profile row breaks team creation — that trigger plus `0005`'s backfill is what
  guarantees one exists. Reads of `profiles` are limited to your own row plus
  teammates' (`shares_team_with`), since the table now holds email addresses.
- **Auth**: Magic-link (passwordless) via `@nuxtjs/supabase`. Route protection
  is configured in `nuxt.config.ts` under `supabase.redirect` /
  `redirectOptions` (`login: /login`, `callback: /confirm`, `exclude: [/about]`).
  `login.vue` calls `supabase.auth.signInWithOtp` with an `emailRedirectTo` built
  from `runtimeConfig.app.baseURL` (so the GitHub Pages base path is respected);
  `confirm.vue` watches `useSupabaseUser()` and redirects on sign-in. Access the
  current user with `useSupabaseUser()`; sign out via `supabase.auth.signOut()`
  (see `AppHeader.vue`).
- **Components**: Use Nuxt UI `U*` components (`UCard`, `UButton`, `UForm`,
  `UInput`, etc.). They auto-import — no manual imports needed. The app's own
  shared components (`PageHero`, `SectionCard`, `StatCard`, `EmptyState`) also
  auto-import; reach for them before re-creating a hero, a titled card, a stat
  tile, or an empty/loading block.
- **No emoji.** Every icon is `i-lucide-*` rendered through `UIcon` or a
  component's `icon` prop, marked `aria-hidden="true"` when decorative. Do not
  reintroduce emoji in markup, labels, headings, or status strings. Verify a
  Lucide name exists before using it — a bad name renders as an empty box, not
  an error:
  `node -e 'console.log("croissant" in require("./node_modules/@iconify-json/lucide/icons.json").icons)'`
- **Styling**: Tailwind utility classes inline. Custom theme tokens and helper
  classes (`croissant-gradient`, `croissant-shadow`, `animate-float`) are in
  `app/assets/css/main.css`; every custom token has a `.dark` counterpart there.
  Theme colors and the global glass `UCard` styling are set in `app.config.ts`.
- **Background**: `CroissantBackground.vue` is a `position: fixed; z-index: -1`
  layer mounted once in `layouts/default.vue`. It animates `transform`/`opacity`
  only and is disabled under `prefers-reduced-motion`. Do not give it or its
  children a `view-transition-name` — that would break the root-level colour-mode
  wipe in `ColorModeButton.vue`.
- **Icons**: `i-lucide-*` and `i-simple-icons-*` via the installed iconify sets.
- **Dark mode**: Handled by `useColorMode()` (Nuxt UI / @vueuse).

## Known Issues / Gotchas

- `app/utils/links.ts` is **empty**.
- Use only Nuxt UI v4 **semantic color tokens** on components (`primary`,
  `secondary`, `success`, `info`, `warning`, `error`, `neutral`) — not raw
  Tailwind names like `green`/`amber`. `primary` is mapped to amber in
  `app/app.config.ts`.
- CI **lint is commented out** in `.github/workflows`; only `typecheck` runs on
  PRs. Run `pnpm lint` locally before pushing.
- The GitHub Pages build uses `NUXT_APP_BASE_URL=/croissant-tracker/`. Use
  relative/`<NuxtLink>`/`to=` navigation so the base path is respected.

## Workflow Notes

- This is a static, client-only app — Supabase is the only backend. Set
  `SUPABASE_URL` / `SUPABASE_KEY` in `.env` (copy `.env.example`) to run locally.
  Without them the module only warns, so `pnpm typecheck`/`build` still succeed.
- Validate changes with `pnpm typecheck` and `pnpm lint` before committing.
- The default branch is `main`; CI and Pages deploy trigger on pushes to `main`.
