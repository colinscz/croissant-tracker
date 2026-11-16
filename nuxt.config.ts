export default defineNuxtConfig({
  // Client-rendered SPA served by the Nitro node server. The server exists for
  // /api/* (the database lives behind it now); pages render in the browser,
  // which is also where Hanko's web components and session live.
  ssr: false,
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxtjs/hanko',
  ],
  compatibilityDate: '2024-11-01',
  css: ['~/assets/css/main.css'],
  icon: {
    // Every icon is inside the client bundle, so the app never fetches icons
    // from api.iconify.design at runtime (blank boxes behind a proxy/offline).
    provider: 'none',
    fallbackToApi: false,
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    // Server-only. Override at runtime with NUXT_DATABASE_URL — a connection
    // string for the `croissant_app` role, which is subject to RLS.
    databaseUrl: '',
    // Where the server fetches Hanko's JWKS from. In Docker this is the internal
    // service URL (http://hanko:8000); falls back to the public API URL.
    hankoInternalUrl: '',
  },
  hanko: {
    // Public Hanko API URL the browser talks to. Set at runtime with
    // NUXT_PUBLIC_HANKO_API_URL.
    apiURL: '',
    // Every page requires a signed-in user unless it opts out with
    // definePageMeta({ hanko: { allow: ... } }) — see about.vue and login.vue.
    globalMiddleware: true,
    // The server verifies sessions itself (server/middleware/01.auth.ts), using
    // the internal Hanko URL and a cached key set.
    augmentContext: false,
    redirects: {
      login: '/login',
      home: '/',
      success: '/',
      followRedirect: true,
    },
    components: {
      enablePasskeys: true,
      fallbackLanguage: 'en',
    },
  },
  experimental: {
    // Lets @nuxtjs/hanko read `hanko` page meta at build time (globalMiddleware).
    scanPageMeta: true,
  },
  nitro: {
    preset: 'node-server',
  },
})
