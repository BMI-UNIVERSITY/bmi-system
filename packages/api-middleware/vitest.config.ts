import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Audit requirement: >80% coverage on core middleware
      thresholds: { lines: 80, functions: 80, branches: 70 },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'], // barrel export, nothing to test
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
});
