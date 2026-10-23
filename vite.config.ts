import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { groqMiddleware } from './server/groq'

/** Serves /api/chat and /api/flood-photo from Node so the Groq key never reaches the browser. */
function groqApi(key: string | undefined): Plugin {
  return {
    name: 'smartflow-groq-api',
    configureServer: (server) => void server.middlewares.use(groqMiddleware(key)),
    configurePreviewServer: (server) => void server.middlewares.use(groqMiddleware(key)),
  }
}

export default defineConfig(({ mode }) => ({
  server: { host: true },
  plugins: [
    groqApi(loadEnv(mode, process.cwd(), '').GROQ_API_KEY),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'SmartFlow Flood Early Warning',
        short_name: 'SmartFlow',
        description: 'Flood reports, advice and operator dashboard for township residents (prototype).',
        theme_color: '#183f80',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/report',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Weather: fresh when online, last reading when offline.
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Map tiles: cache what the user has already seen so the map works offline.
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}))
