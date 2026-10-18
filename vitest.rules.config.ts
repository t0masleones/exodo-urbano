import { defineConfig } from 'vitest/config';

// Testes das regras do Firestore. Rodam contra o emulador: npm run test:rules
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
