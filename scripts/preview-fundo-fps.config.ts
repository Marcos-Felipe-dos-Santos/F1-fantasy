import { defineConfig, mergeConfig } from 'vite';
import base from './preview-pit.config';

/** Mesma corrida/código; baseline retira apenas a decoração para isolar o custo visual. */
export default mergeConfig(base, defineConfig({
  build: { outDir: process.env.FUNDO_SAIDA ?? '.wrangler/fundo-fps-depois' },
  plugins: [{
    name: 'baseline-sem-decoracao',
    enforce: 'pre',
    transform(code, id) {
      if (process.env.FUNDO_BASELINE === '1' && id.replaceAll('\\', '/').endsWith('/src/ui/estilos.css')) {
        const importacao = "@import './fundo.css';";
        if (!code.includes(importacao)) throw new Error('Import do fundo não encontrado');
        return code.replace(importacao, '');
      }
    },
  }],
}));
