/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

/**
 * Config separada do balance-harness (PR 1.6, skill "balance-harness":
 * balanceamento é medido, não sentido). Roda só `scripts/**\/*.balance.test.ts`
 * — é lento (milhares de corridas simuladas) e mede metas de calibração, não
 * verifica lógica; por isso fica fora do `npm test`/`npx vitest run` normal
 * (ver `include` em vite.config.ts). Comando: `npm run balance`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['scripts/**/*.balance.test.ts'],
    testTimeout: 300000,
  },
});
