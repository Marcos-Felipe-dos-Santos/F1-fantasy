/**
 * Build do preview do PR 3b (`scripts/preview-pr3b.tsx`): não altera o entrypoint nem o deploy do jogo.
 * SEM o plugin da CSP de propósito: o arquivo único de `scripts/montar-preview-pr3b.mjs` leva o
 * script embutido, que a `script-src 'self'` bloquearia. A CSP real é conferida no build de produção.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: process.env.PREVIEW_PR3B_SAIDA ?? '.wrangler/pr3b-preview',
    emptyOutDir: true,
    // Um JS e um CSS só, para o arquivo único.
    cssCodeSplit: false,
    rollupOptions: { input: 'scripts/preview-pr3b.html', output: { inlineDynamicImports: true } },
  },
});
