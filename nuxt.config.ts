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
    // No auth in this app — disable the global redirect middleware so pages
    // are reachable without a logged-in user. The anon key + RLS policies
    // (see supabase/migrations) gate access to the data instead.
    redirect: false,
    // Types for the typed Supabase client (useSupabaseClient()).
    types: '~/types/database.ts',
  },
})
