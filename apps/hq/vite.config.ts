import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No PWA here: HQ runs on an office desktop with a normal reload cycle, not a kiosk tab that
// stays open for days — the service-worker/update-banner machinery in apps/web solves a problem
// this app doesn't have.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Source-level reuse of the branch app's pure modules (types, reports/money/date/permissions
    // helpers) without extracting a shared package. Only import modules that touch neither
    // import.meta.env nor web-app-only state (api.ts, data.ts are off-limits).
    alias: { '@web': fileURLToPath(new URL('../web/src', import.meta.url)) }
  }
});
