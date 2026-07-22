import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['import', 'module', 'node'],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
