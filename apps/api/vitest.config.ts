import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use standard Node pool for CI compatibility
    // Workers pool can be enabled locally if needed for integration testing
    environment: 'node',
    globals: true,
  },
});
