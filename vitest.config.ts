import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Engines are pure TS: tests run in Node with no DOM, on purpose. A test that needs a
// browser API is a sign the code under test belongs in Tool.svelte, not engine.ts.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
