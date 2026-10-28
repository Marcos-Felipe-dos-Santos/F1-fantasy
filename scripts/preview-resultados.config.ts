/** Build separado de revisão: não altera o entrypoint nem o deploy do jogo. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginCsp } from './csp';

export default defineConfig({
  plugins: [react(), pluginCsp()],
  build: {
    outDir: '.wrangler/pr1-preview',
    emptyOutDir: true,
    rollupOptions: { input: 'scripts/preview-resultados.html' },
  },
});
