import { defineConfig } from 'vitest/config';

// Vitest 2.x — runs against `src/lib/**` and `src/app/api/**` (Node env).
// Client-side React tests would need a jsdom env + @testing-library; set up
// a separate config under src/ when that becomes needed.
export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts', 'src/app/api/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['**/*.test.ts', '**/types/**'],
    },
  },
});
