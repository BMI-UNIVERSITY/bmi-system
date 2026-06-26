import { defineConfig } from 'vitest/config';

// BMI UMS Backend — Vitest configuration
// Environment: node (not jsdom — this is a server-side API)
// Coverage via V8 provider for accurate source mapping with TypeScript

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/types/**',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
      },
    },
  },
  resolve: {
    // Prevent backend tests from trying to load frontend configs
    alias: {
      '@': '/src',
    },
  },
});
