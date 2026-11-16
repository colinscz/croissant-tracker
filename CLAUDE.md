# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Croissant Tracker** — a lighthearted web app for tracking who owes croissants
for being late (a European office tradition). Users log late arrivals, see who
owes pastries, mark debts as delivered, and view a leaderboard.

It is **self-hosted with Docker**: a Nuxt 4 app (Nitro `node-server`) with a
small JSON API under `/api`, **PostgreSQL 17** for data, a self-hosted
**[Hanko](https://www.hanko.io/)** for passwordless sign-in, and Caddy for TLS.
Deployment target: one Hetzner Cloud server (`docs/self-hosting-hetzner.md`).
The browser never talks to the database. It calls `/api/*`, and the server
queries Postgres as an RLS-bound role on the user's behalf.

Entries belong to a **team**. Users manage teams at `/teams` (create a team, add
existing profiles by email, remove members, delete a team), and only members of a
team can read or write that team's entries. **Row-level security** in Postgres
enforces this, not the UI or the API handlers.

Each entry names the **team member who owes the croissants**
(`debtorProfileId`), and that person can't mark their own debt delivered.
Somebody else has to confirm it. The `prevent_self_delivery` trigger enforces
this; the UI only mirrors it by hiding the button.

Sign-in is **Hanko** (an emailed one-time passcode, plus optional passkeys) via
`@nuxtjs/hanko`. Its global page middleware sends signed-out visitors to
`/login`. Only `/about` is public.

## Tech Stack

- **Nuxt 4** (`compatibilityVersion: 4`, `app/` source directory), `ssr: false`
  (SPA served by the Nitro node server)
- **Vue 3** (Composition API, `<script setup>`)
- **Nuxt UI v4** (`@nuxt/ui`): component library (`U*` components)
- **Tailwind CSS v4** (configured via `@nuxt/ui`; CSS-first in `app/assets/css/main.css`)
- **PostgreSQL 17** via **Drizzle ORM** + the `postgres` driver; migrations with `drizzle-kit`
- **Hanko** (self-hosted, `ghcr.io/teamhanko/hanko`) via **`@nuxtjs/hanko`**;
  the server verifies session JWTs with `jose`
- **Docker** / Docker Compose, **Caddy** for HTTPS
- **TypeScript** + `@nuxt/eslint`
- **pnpm 11** as the package manager (**Node 24**, also in the Dockerfile and CI)

## Commands

```bash
pnpm install        # install dependencies
pnpm dev            # dev server (http://localhost:3000); needs Postgres + Hanko running
pnpm build          # production build → .output/
pnpm start          # run the production build
pnpm lint           # eslint
pnpm lint:fix       # eslint --fix
pnpm typecheck      # nuxt typecheck (vue-tsc)
pnpm db:generate    # drizzle-kit: new migration from server/db/schema.ts
pnpm db:migrate     # apply migrations (DATABASE_OWNER_URL)
pnpm db:bundle      # bundle the migrator for the Docker `migrate` image

# backing services for `pnpm dev` (Postgres, Hanko, Mailpit at :8025)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres hanko app-migrate mailpit
# whole stack locally / in production
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
docker compose up -d --build
```

## Project Structure

```
app/
  app.vue              # root: <UApp> + layout + page
  app.config.ts        # Nuxt UI theme (primary: amber, neutral: zinc) + glass UCard styling
  assets/css/main.css  # Tailwind + Nuxt UI imports, custom croissant theme vars/classes
  layouts/default.vue  # UContainer wrapper, nav menu links, <AppHeader> + slot
  components/
    AppHeader.vue      # fixed floating nav menu (UNavigationMenu) + sign-out + ColorModeButton
    AppFooter.vue      # tagline footer
    ColorModeButton.vue# dark/light toggle with View Transitions animation
    CroissantBackground.vue # fixed animated backdrop: gradient, blooms, drifting croissants
    PageHero.vue       # icon badge + h1 + subtitle, used by every page
    SectionCard.vue    # UCard with an icon+title header
    StatCard.vue       # icon + value + label tile (index stats grid)
    EmptyState.vue     # empty/loading block; `loading` swaps the icon for a spinner
  pages/
    index.vue          # main tracker UI (the core file); persistence via composable
    teams.vue          # team management: create, add/remove members by email, delete
    login.vue          # <hanko-auth> sign-in (hanko: { allow: 'logged-out' })
    about.vue          # static informational page (hanko: { allow: 'all' })
  composables/
    useCroissantEntries.ts # entries state + CRUD over /api
    useTeams.ts        # teams/membership state + CRUD over /api; owns `activeTeamId`
    useCurrentUser.ts  # signed-in user from /api/me; signOut()
    useApiError.ts     # apiErrorMessage(): $fetch error → UAlert string
  utils/links.ts       # currently EMPTY
server/
  api/                 # Nitro routes: me, health, teams, teams/[id]/{members,entries}, entries/[id]
  middleware/01.auth.ts# verifies Hanko JWT → event.context.user; syncs the profile row
  utils/auth.ts        # verifyHankoSession (jose + Hanko JWKS), requireUser
  utils/db.ts          # useDb() pool (croissant_app role), withUser(event, fn)
  utils/pg-error.ts    # toHttpError: Postgres errors → HTTP errors (P0001 message kept)
  utils/validate.ts    # tiny input validators (uuidParam, requireString, …)
  db/schema.ts         # Drizzle tables (types for server + client)
  db/migrate.ts        # migration runner (owner role)
  db/migrations/       # 0000_init.sql (generated), 0001_rls_functions.sql (hand-written)
docker/
  postgres/init/01-roles.sh # first-boot: croissant + hanko DBs, owner/app/hanko roles
  hanko/config.yaml    # Hanko config (secrets/URLs come from env in compose)
  caddy/Caddyfile      # APP_DOMAIN → app, AUTH_DOMAIN → hanko
Dockerfile             # targets: `app` (default) and `migrate`
docker-compose.yml     # production stack; docker-compose.dev.yml = local overrides + Mailpit
docs/self-hosting-hetzner.md
.github/workflows/ci.yml # typecheck + docker image build (no push); lint commented out
```

## Key Conventions

- **State & persistence**: The UI lives in `app/pages/index.vue`; data access is
  encapsulated in composables (`useCroissantEntries`, `useTeams`) that call the
  app's own `/api` routes with `$fetch`. Each exposes shared `useState` plus
  helpers that set an `error` string (via `apiErrorMessage`) rather than throw.
  API responses are already camelCase (Drizzle field names). There is no global
  store/Pinia.
- **Authorisation lives in Postgres.** Every API handler that touches data
  runs inside `withUser(event, tx => …)` (`server/utils/db.ts`), which opens a
  transaction as `croissant_app` (NOBYPASSRLS, owns nothing) and sets
  `app.user_id` from the verified Hanko `sub`. RLS policies, the
  `security definer` functions and the triggers in
  `server/db/migrations/0001_rls_functions.sql` read `app.current_user_id()`
  (the replacement for Supabase's `auth.uid()`). Don't re-implement
  membership checks in handlers, and never query with the owner role from the
  app. A handler that gets zero rows back from an UPDATE/DELETE should answer
  403/404 (RLS filtered the row).
- **Errors**: `raise exception` in SQL (SQLSTATE `P0001`) is written for people.
  `toHttpError` passes its message through as a 400, the composables put it in
  `error`, and pages render it in a `UAlert`.
- **Who owes it**: `addEntry` takes a `debtorProfileId` picked from the active
  team's members (`/` loads them via `fetchMembers`), plus `name`, a *display
  snapshot* of that member's label at logging time. Group by `debtorProfileId`,
  not by `name`. `prevent_self_delivery` rejects any change to `delivered` (in
  either direction, and on insert) when the current user is the debtor. It's a
  trigger rather than an RLS predicate so the debtor can still fix their own
  entry's date or reason, and so the refusal is a readable message instead of a
  silent zero-row update.
- **Teams**: `useTeams` owns `activeTeamId` (shared `useState`), which both `/`
  and `/teams` read. `create_team`, `add_team_member_by_email` and
  `list_team_members` are `security definer` functions called from the API
  routes with ``tx.execute(sql`select … from public.fn(...)`)``.
- **Profiles**: `public.profiles` is created by this repo. `id` = Hanko user id.
  `server/middleware/01.auth.ts` calls `app.sync_own_profile(email)` on a user's
  API requests (cached per process), which replaces Supabase's `auth.users`
  trigger. Reads are limited to your own row plus teammates' (`shares_team_with`).
- **Auth**: `@nuxtjs/hanko` with `globalMiddleware: true`. Pages opt out with
  `definePageMeta({ hanko: { allow: 'all' | 'logged-out' } })`. The module's own
  server middleware is disabled (`augmentContext: false`). The server verifies
  the `hanko` cookie / Bearer token itself in `server/utils/auth.ts`, fetching
  JWKS from `NUXT_HANKO_INTERNAL_URL` (`http://hanko:8000` in Docker). Use
  `requireUser(event)` in handlers and `useCurrentUser()` on the client.
  Sign-out is `useCurrentUser().signOut()`.
- **Migrations**: change `server/db/schema.ts` and run `pnpm db:generate`. For
  SQL that drizzle-kit doesn't model (policies, functions, triggers, grants), use
  `pnpm drizzle-kit generate --custom --name …`. New tables need RLS enabled,
  policies `to croissant_app`, and grants to `croissant_app`. Never edit an
  applied migration.
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
  `secondary`, `success`, `info`, `warning`, `error`, `neutral`), not raw
  Tailwind names like `green`/`amber`. `primary` is mapped to amber in
  `app/app.config.ts`.
- CI **lint is commented out** in `.github/workflows/ci.yml`; CI runs
  `typecheck` and builds both Docker images (never pushes). Run `pnpm lint`
  locally before pushing.
- `docker/postgres/init/01-roles.sh` only runs on an **empty** data volume.
  Changing a password in `.env` afterwards doesn't change the role.
- The role name `croissant_app` is hard-coded in `0001_rls_functions.sql` and the
  init script. Keep them in step.
- Hanko is configured with `session.enable_auth_token_header: true` because the
  app and Hanko are on different origins. hanko-elements then stores the JWT as
  the `hanko` cookie on the app's domain, which is what the server reads.
- Sign-in is passcode/passkey, not magic link: there is no `/confirm` callback.

## Workflow Notes

- Local dev needs Postgres + Hanko running (see Commands); copy `.env.example`
  to `.env`, whose defaults match `docker-compose.dev.yml`. Passcode emails land
  in Mailpit at http://localhost:8025. `pnpm typecheck`/`build` don't need any
  services.
- Validate changes with `pnpm typecheck` and `pnpm lint` before committing.
- The default branch is `main`; CI runs on pushes and PRs to `main`. There is no
  automatic deployment. Deploy by `git pull && docker compose up -d --build` on
  the server.
