import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
    supabaseUrl: '',
    supabaseSecretKey: '',
    public: {
      siteUrl: ''
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
      meta: [{ property: 'og:site_name', content: 'BG' }]
    }
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  }
})
