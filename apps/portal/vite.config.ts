import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { API_WORKER_URL } from '@bmi/shared';

// The API worker URL — use VITE_API_URL env var if set. In dev, fall back to local 
// wrangler dev port (8787). In production, fall back to deployed Cloudflare Worker.
const isDev = process.env.NODE_ENV !== 'production';
const API_ORIGIN = process.env.VITE_API_URL || (isDev ? 'http://127.0.0.1:8787' : API_WORKER_URL);

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
