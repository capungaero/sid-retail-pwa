import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly', method: 'GET' }
        ]
      }
    })
  ]
});
