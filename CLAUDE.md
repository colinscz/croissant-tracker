# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Croissant Tracker** 🥐 — a lighthearted single-page web app for tracking who
owes croissants for being late (a European office tradition). Users log late
arrivals, see who owes pastries, mark debts as delivered, and view a
leaderboard. Entries are persisted in a **Supabase** Postgres database via the
official **`@nuxtjs/supabase`** module — the browser talks to Supabase directly
with the anon key, so there is no custom backend/server to run.

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
  app.config.ts        # app title/meta + Nuxt UI theme (primary: amber, neutral: zinc)
  assets/css/main.css  # Tailwind + Nuxt UI imports, custom croissant theme vars/classes
  layouts/default.vue  # UContainer wrapper, nav menu links, <AppHeader> + slot
  components/
    AppHeader.vue      # fixed floating nav menu (UNavigationMenu) + ColorModeButton
    ColorModeButton.vue# dark/light toggle with View Transitions animation
  pages/
    index.vue          # main tracker UI (the core file); persistence via composable
    about.vue          # static informational page
  composables/
    useCroissantEntries.ts # Supabase-backed entries state + CRUD helpers
  types/database.ts    # Supabase DB schema types (typed client)
  utils/links.ts       # currently EMPTY
server/                # tsconfig only; no server routes (static app)
supabase/migrations/   # SQL schema for the croissant_entries table + RLS
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
- **Components**: Use Nuxt UI `U*` components (`UCard`, `UButton`, `UForm`,
  `UInput`, etc.). They auto-import — no manual imports needed.
- **Styling**: Tailwind utility classes inline. Custom theme tokens and helper
  classes (`croissant-gradient`, `croissant-shadow`, `animate-float`) are in
  `app/assets/css/main.css`. Theme colors set in `app.config.ts`.
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
