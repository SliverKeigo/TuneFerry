import { defineConfig } from 'vitest/config';

// Vitest 2.x — runs against `lib/` and `api/` in a Node environment.
// Client-side React tests would need a jsdom env and @testing-library; add
// them later under client/ with its own vitest.config.ts if needed.
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'api/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts', 'api/**/*.ts'],
      exclude: ['**/*.test.ts', '**/types/**'],
    },
  },
});
