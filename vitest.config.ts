import { defineConfig } from 'vitest/config';

// The constitution scopes automated tests to the shared calculation module,
// so the suite deliberately looks nowhere else.
export default defineConfig({
  test: {
    include: ['tests/calc/**/*.spec.ts'],
    environment: 'node',
  },
});
