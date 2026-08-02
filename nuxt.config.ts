export default defineNuxtConfig({
  // Client-side rendered SPA: the app reads/writes its data from the browser
  // via Supabase, and the static GitHub Pages build has no Supabase env vars,
  // so there's nothing to prerender on the server.
  ssr: false,
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxtjs/supabase',
  ],
  compatibilityDate: '2024-11-01',
  css: [// CSS file in the project
  '~/assets/css/main.css',],
    future: {
    compatibilityVersion: 4
  },
  supabase: {
    // Require a logged-in user to reach the tracker. The module installs a
    // global middleware that redirects unauthenticated visitors to `login`;
    // the magic-link email sends users back through `callback`.
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // Public pages that don't require authentication.
      exclude: ['/about'],
      // Remember where the user was headed so /confirm can send them back.
      saveRedirectToCookie: true,
    },
    // Types for the typed Supabase client (useSupabaseClient()).
    types: '~/types/database.ts',
  },
})
