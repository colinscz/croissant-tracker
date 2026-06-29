# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Croissant Tracker** 🥐 — a lighthearted single-page web app for tracking who
owes croissants for being late (a European office tradition). Users log late
arrivals, see who owes pastries, mark debts as delivered, and view a
leaderboard. All data lives in browser **localStorage** — there is no backend
or database.

The app is deployed as a static site to **GitHub Pages** at the base path
`/croissant-tracker/`.

## Tech Stack

- **Nuxt 4** (`compatibilityVersion: 4`, `app/` source directory)
- **Vue 3** (Composition API, `<script setup>`)
- **Nuxt UI v4** (`@nuxt/ui`) — component library (`U*` components)
- **Tailwind CSS v4** (configured via `@nuxt/ui`; CSS-first in `app/assets/css/main.css`)
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
    index.vue          # main tracker UI + all localStorage logic (the core file)
    about.vue          # static informational page
  utils/links.ts       # currently EMPTY
server/                # tsconfig only; no server routes (static app)
nuxt.config.ts
.github/workflows/     # CI (lint commented out, typecheck runs) + GitHub Pages deploy
```

## Key Conventions

- **State & persistence**: All tracker logic lives in `app/pages/index.vue`.
  Entries are `ref([])`, persisted to `localStorage` under the key
  `croissant-tracker-entries`. Loaded `onMounted`; guarded with
  `import.meta.client` for SSR safety. There is no global store/Pinia.
- **Components**: Use Nuxt UI `U*` components (`UCard`, `UButton`, `UForm`,
  `UInput`, etc.). They auto-import — no manual imports needed.
- **Styling**: Tailwind utility classes inline. Custom theme tokens and helper
  classes (`croissant-gradient`, `croissant-shadow`, `animate-float`) are in
  `app/assets/css/main.css`. Theme colors set in `app.config.ts`.
- **Icons**: `i-lucide-*` and `i-simple-icons-*` via the installed iconify sets.
- **Dark mode**: Handled by `useColorMode()` (Nuxt UI / @vueuse).

## Known Issues / Gotchas

- `app/layouts/default.vue` renders `<AppFooter />`, but **no `AppFooter`
  component exists** in `app/components/`. This will warn/fail to resolve —
  either create the component or remove the reference.
- `app/utils/links.ts` is **empty**.
- `app/pages/index.vue` uses `color="green"` and `color="amber"` on some
  `UButton`s. Nuxt UI v4 only recognizes configured semantic colors
  (`primary`, `neutral`, plus standard aliases). Prefer `color="primary"`/
  `color="success"` or register the color in `app.config.ts`.
- CI **lint is commented out** in `.github/workflows`; only `typecheck` runs on
  PRs. Run `pnpm lint` locally before pushing.
- The GitHub Pages build uses `NUXT_APP_BASE_URL=/croissant-tracker/`. Use
  relative/`<NuxtLink>`/`to=` navigation so the base path is respected.

## Workflow Notes

- This is a static, client-only app — there is no API or DB to run.
- Validate changes with `pnpm typecheck` and `pnpm lint` before committing.
- The default branch is `main`; CI and Pages deploy trigger on pushes to `main`.
