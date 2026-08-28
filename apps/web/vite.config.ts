import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Registration is done manually via useRegisterSW() in App.tsx (virtual:pwa-register/react)
      // instead of the auto-injected script, so a stale build can show an in-app "update
      // available" banner rather than silently keep running old code forever on a kiosk device
      // that never gets a hard reload. See App.tsx's UpdateBanner for why this matters here:
      // a kasir on a build from before a payment-flow change couldn't check out at all.
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        // A new service worker activates (and starts controlling already-open tabs) as soon as
        // it finishes installing, instead of waiting for every tab to be closed first — which on
        // an always-open POS kiosk tab could otherwise never happen. UpdateBanner still asks the
        // cashier before reloading (mid-sale cart is in-memory only), this just means an update
        // is READY the moment it's needed rather than stuck behind a tab that's never closed.
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly', method: 'GET' }
        ]
      }
    })
  ]
});
