import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/* All packages that must stay on the server side */
const NODE_ONLY = [
  'playwright',
  'playwright-core',
  'chromium-bidi'
];

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' }   // API → backend
  },

  /* ------------- prevent them from entering the browser bundle ------------- */
  optimizeDeps: {
    exclude: NODE_ONLY
  },
  build: {
    rollupOptions: {
      external: NODE_ONLY
    }
  },
  resolve: {
    alias: NODE_ONLY.reduce((acc, name) => {
      acc[name] = resolve(__dirname, 'stub.js');  // map to empty stub
      return acc;
    }, {} as Record<string, string>)
  }
});
