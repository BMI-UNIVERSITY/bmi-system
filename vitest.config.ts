import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/api/vitest.config.ts',
      'apps/portal/vitest.config.ts',
      'apps/ums/vitest.config.ts',
      'bmi-university/vitest.config.mjs',
      'packages/shared/vitest.config.ts',
      'packages/adapters/vitest.config.ts',
      'packages/api-middleware/vitest.config.ts',
      'packages/bootstrap/vitest.config.ts',
    ],
  },
});
