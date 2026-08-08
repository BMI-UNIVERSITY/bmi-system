import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api-smoke-tests',
    include: ['tests/smoke/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
  },
});
