import { defineConfig } from 'vitest/config';

/**
 * Integration test configuration for the API worker.
 *
 * These tests run in a Node environment and can start a local Wrangler dev server
 * (via `unstable_dev`) to test end-to-end request/response behaviour against
 * real D1 and KV bindings.
 *
 * Run with: npm run test:integration
 */
export default defineConfig({
  test: {
    name: 'api-integration',
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Single-threaded so Wrangler dev server start/stop doesn't race
    pool: 'forks',
  },
});
