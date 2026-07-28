import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
    // O balance-harness (scripts/*.balance.test.ts) roda por config separada
    // (vitest.balance.config.ts, comando `npm run balance`) — não entra no
    // `npm test`/`npx vitest run` normal (é lento e mede, não verifica lógica).
    // Testes de scripts/ rápidos e mockados (PR 4.1: fetch-f1-data) entram
    // no `npm test` normal, igual aos de src/.
    // Geradores de preview visual (scripts/*.preview.test.ts, PR 7.4) também
    // rodam por config separada (vitest.preview.config.ts, `npm run preview`):
    // escrevem artefato em preview/ pro dev olhar, não verificam lógica.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: [
      ...configDefaults.exclude,
      'scripts/**/*.balance.test.ts',
      'scripts/**/*.preview.test.ts',
    ],
  },
});
