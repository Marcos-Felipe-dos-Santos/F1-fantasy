/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

/**
 * Config separada dos geradores de PREVIEW visual (PR 7.4), mesmo arranjo do
 * balance-harness (`vitest.balance.config.ts`): são ferramentas de dev que
 * ESCREVEM artefato em `preview/` pro dev olhar, não verificação de lógica.
 * Ficam fora do `npm test` (ver `exclude` em `vite.config.ts`).
 * Comando: `npm run preview`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['scripts/**/*.preview.test.ts'],
  },
});
