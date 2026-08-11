import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { proxyDoWorker } from './src/net/rotas';

export default defineConfig({
  plugins: [react()],
  server: {
    /**
     * 🔌 O WORKER É SERVIDO ATRAVÉS DA PORTA DO VITE (PR 3.3.1).
     *
     * Sem isto, jogar em rede não funciona — e não é questão de abrir mais uma
     * porta. `wrangler dev` sobe em `127.0.0.1:8787` (só localhost), então o
     * app carregava de fora mas o WebSocket morria; e mesmo abrindo o worker
     * na rede, a URL do WS não pode ser fixa: **cada visitante chega por um IP
     * diferente** (LAN, ZeroTier, Radmin, celular pelo Wi-Fi).
     *
     * Com o proxy, o WebSocket vai para o MESMO host e a MESMA porta da página
     * que o navegador já abriu. Some a classe inteira do problema:
     * - uma porta só (5173) no firewall;
     * - funciona em qualquer interface, sem configurar nada por cliente;
     * - e continua funcionando em cenários futuros (túnel, celular, outra
     *   rede) sem tocar em código.
     *
     * `ws: true` é o que faz o `Upgrade: websocket` ser repassado — sem ele o
     * proxy só encaminharia HTTP e a conexão cairia no handshake.
     *
     * ⚠️ **A LISTA NÃO MORA AQUI (PR 3.3.3).** O que não estiver no proxy NÃO
     * CHEGA no worker: o Vite responde 404 sozinho e o terminal do `wrangler`
     * fica em silêncio, então a falha se disfarça de "servidor fora do ar".
     * Foi o que aconteceu com `/criar-sala`, criado no 3.3.2 quando este bloco
     * já existia e listava só `/parties`. Como o problema era haver duas listas
     * que precisavam concordar, a correção não foi acrescentar a chave que
     * faltava e sim **derivar o bloco inteiro** de `src/net/rotas.ts`, que é
     * onde as rotas do worker são declaradas. Rota nova lá atravessa o proxy
     * sozinha.
     */
    proxy: proxyDoWorker(),
  },
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
