import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',     // allow Codespaces to forward
    port: 5173,
    proxy: {
      // anything that begins with /api → http://localhost:4000
      '/api': 'http://localhost:4000'
    }
  }
});
