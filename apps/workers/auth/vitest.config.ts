import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 70 },
      include: ['lib/**/*.ts'],
      exclude: ['lib/types.ts', '**/*.test.ts'],
    },
    include: ['lib/**/*.test.ts', 'routes/**/*.test.ts'],
  },
});
