/** Build separado de revisão do PR 2c: não altera o entrypoint nem o deploy do jogo. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginCsp } from './csp';

export default defineConfig({
  plugins: [react(), pluginCsp()],
  build: {
    outDir: process.env.PREVIEW_PIT_SAIDA ?? '.wrangler/pr2c-preview',
    emptyOutDir: true,
    rollupOptions: { input: 'scripts/preview-pit.html' },
  },
});
