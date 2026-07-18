import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Each test file gets a fresh module graph; in-memory DBs are per-app instance.
    isolate: true,
  },
});
