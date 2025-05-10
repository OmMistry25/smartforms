// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/* all the server‑only modules you stubbed out */
const NODE_ONLY = [
  'playwright',
  'playwright-core',
  'chromium-bidi'
];

export default defineConfig({
  // ─────────────── PUBLIC PATH ────────────────
  // when you build, assets will be referenced under /smartforms/
  base: '/smartforms/',

  plugins: [
    react(),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    // ← This proxy lets your dev frontend at :5173 call `/api/...`
    //     and have it forwarded to your backend at localhost:4000
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  optimizeDeps: {
    exclude: NODE_ONLY,
  },

  build: {
    rollupOptions: {
      external: NODE_ONLY,
    },
  },

  resolve: {
    alias: NODE_ONLY.reduce((acc, name) => {
      // stub these out so Vite's build doesn't choke
      acc[name] = resolve(__dirname, 'stub.js');
      return acc;
    }, {} as Record<string,string>),
  },
});
