/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
    // O balance-harness (scripts/*.balance.test.ts) roda por config separada
    // (vitest.balance.config.ts, comando `npm run balance`) — não entra no
    // `npm test`/`npx vitest run` normal (é lento e mede, não verifica lógica).
    include: ['src/**/*.test.ts'],
  },
});
