import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API worker URL — use VITE_API_URL env var if set, else fall back to the
// deployed Cloudflare Worker. This proxy only applies in dev (npm run dev).
const API_ORIGIN = process.env.VITE_API_URL || 'https://bmi-api.bmiuniversity107.workers.dev';

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
