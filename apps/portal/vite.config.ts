import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { API_WORKER_URL } from '@bmi/shared';

// The API worker URL — use VITE_API_URL env var if set, else fall back to the
// deployed Cloudflare Worker. This proxy only applies in dev (npm run dev).
const API_ORIGIN = process.env.VITE_API_URL || API_WORKER_URL;

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: true,
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
