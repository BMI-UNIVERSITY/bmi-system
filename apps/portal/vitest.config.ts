import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['worker/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
});
