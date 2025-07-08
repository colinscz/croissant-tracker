export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
  ],
  compatibilityDate: '2024-11-01',
  css: [// CSS file in the project
  '~/assets/css/main.css',],
    future: {
    compatibilityVersion: 4
  },
})