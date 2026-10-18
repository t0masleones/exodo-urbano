import { defineConfig } from 'vitest/config';

// Testes de unidade: regras do jogo, validação de saves e sincronização (sem navegador).
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
