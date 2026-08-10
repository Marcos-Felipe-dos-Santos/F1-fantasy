/**
 * PR 3.3.1 — a URL do WebSocket.
 *
 * Parece o teste mais bobo do projeto e não é: a versão anterior devolvia
 * `ws://<host>:8787` com a **porta fixa**, e isso tornava o jogo em rede
 * impossível por dois motivos somados —
 *
 * 1. `wrangler dev` sobe em `127.0.0.1` (só localhost), então de fora o app
 *    carregava e o WebSocket morria;
 * 2. **cada visitante chega por um IP diferente** — LAN `192.168.x`, ZeroTier
 *    `10.x`, Radmin `26.x`, celular pelo Wi-Fi. Não existe URL fixa que sirva
 *    todos, e é por isso que "abrir o worker na rede" sozinho não resolveria.
 *
 * A correção é derivar do host da página e deixar o Vite repassar `/parties/*`
 * pro worker (`server.proxy`, com `ws: true`). Este arquivo trava as duas
 * pontas: a base derivada e a rota que o `partyserver` espera.
 */

import { describe, expect, it } from 'vitest';
import { baseParaEstaPagina, urlDaSala } from './conexao';

describe('base do WebSocket', () => {
  it('usa o MESMO host e porta da página — em qualquer interface', () => {
    // Os três casos que o dev mediu na máquina dele, mais o celular na LAN.
    expect(baseParaEstaPagina({ protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173',
    );
    expect(baseParaEstaPagina({ protocol: 'http:', host: '192.168.0.13:5173' })).toBe(
      'ws://192.168.0.13:5173',
    );
    expect(baseParaEstaPagina({ protocol: 'http:', host: '10.241.222.232:5173' })).toBe(
      'ws://10.241.222.232:5173',
    );
    expect(baseParaEstaPagina({ protocol: 'http:', host: '26.156.17.128:5173' })).toBe(
      'ws://26.156.17.128:5173',
    );
  });

  it('NÃO fixa a porta 8787 — era exatamente o defeito', () => {
    for (const host of ['192.168.0.13:5173', 'exemplo.com', 'localhost:4173']) {
      expect(baseParaEstaPagina({ protocol: 'http:', host })).not.toContain('8787');
    }
  });

  it('https vira wss (senão o navegador bloqueia por conteúdo misto)', () => {
    expect(baseParaEstaPagina({ protocol: 'https:', host: 'jogo.exemplo.com' })).toBe(
      'wss://jogo.exemplo.com',
    );
  });

  it('sem porta na página, sem porta na URL do socket', () => {
    expect(baseParaEstaPagina({ protocol: 'http:', host: 'meu-pc' })).toBe('ws://meu-pc');
  });

  it('VITE_WS_BASE vence — é o escape pra worker em outra origem', () => {
    expect(
      baseParaEstaPagina({ protocol: 'http:', host: 'localhost:5173' }, 'wss://sala.exemplo.com'),
    ).toBe('wss://sala.exemplo.com');
    // String vazia não conta como configuração (é o default de env não setada).
    expect(baseParaEstaPagina({ protocol: 'http:', host: 'localhost:5173' }, '')).toBe(
      'ws://localhost:5173',
    );
  });
});

describe('rota da sala', () => {
  it('bate com o que `routePartykitRequest` espera (`Sala` → `sala`, kebab-case)', () => {
    // O prefixo `/parties/sala/` é o mesmo do `proxy` no `vite.config.ts`: se
    // um mudar sem o outro, o WebSocket some sem erro claro.
    expect(urlDaSala('ws://192.168.0.13:5173', 'sala-1')).toBe(
      'ws://192.168.0.13:5173/parties/sala/sala-1',
    );
  });

  it('escapa o nome da sala e tolera barra sobrando na base', () => {
    expect(urlDaSala('ws://host:5173/', 'sala com espaço')).toBe(
      'ws://host:5173/parties/sala/sala%20com%20espa%C3%A7o',
    );
  });
});
