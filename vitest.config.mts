import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolves the "@/*" alias from tsconfig natively, so the test runner and
    // the Next build agree on module resolution without an extra plugin.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    globals: false,
  },
});
