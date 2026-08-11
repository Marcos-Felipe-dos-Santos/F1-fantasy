/**
 * PR 3.3.3 — o proxy do Vite cobre TODAS as rotas do worker.
 *
 * 🔴 **Este teste nasceu de um bug que passou por todas as redes.** O 3.3.2
 * trocou a criação de sala de uma rota do Durable Object para `POST
 * /criar-sala` no worker. O `proxy` do `vite.config.ts`, escrito no 3.3.1,
 * repassava só `/parties/*` — então o `fetch` do botão "Criar sala" morria
 * DENTRO do Vite com 404 e **o worker não registrava requisição nenhuma**.
 * Medido, não deduzido: `curl -X POST http://localhost:5173/criar-sala` deu 404
 * sem uma linha no terminal do `wrangler`, enquanto a mesma chamada em `:8787`
 * devolveu `{"codigo":"531004"}`.
 *
 * Os 1355 testes da suíte passavam. `conexao.test.ts` até *dizia*, em
 * comentário, que o prefixo "é o mesmo do `proxy` no `vite.config.ts`" — e nada
 * lia coisa alguma. Comentário não é asserção; é a mesma armadilha da "asserção
 * infalsificável" que o 8.2 já tinha encontrado.
 *
 * 🔑 **O que este arquivo protege não é a chave que faltou, é a DERIVAÇÃO.**
 * `vite.config.ts` não lista mais rotas: ele chama `proxyDoWorker()`. Enquanto
 * isso valer, esquecer o proxy de uma rota nova é impossível — e é justamente
 * "enquanto isso valer" que os testes abaixo cobram.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ALVO_WORKER_DEV,
  PREFIXO_PARTIES,
  proxyDoWorker,
  ROTA_CRIAR_SALA,
  ROTAS_DO_WORKER,
} from './rotas';
import { urlDaSala } from './conexao';

/**
 * A regra de casamento do Vite, reproduzida: chave iniciada por `^` é regex;
 * qualquer outra casa por PREFIXO (`path.startsWith(context)`).
 */
function casa(chave: string, caminho: string): boolean {
  if (chave.startsWith('^')) return new RegExp(chave).test(caminho);
  return caminho.startsWith(chave);
}

/** A chave do proxy que atenderia este caminho, ou `null`. */
function chaveQueAtende(caminho: string): string | null {
  return Object.keys(proxyDoWorker()).find((chave) => casa(chave, caminho)) ?? null;
}

// Caminho derivado deste arquivo, não do cwd: `new URL(...)` direto no
// `readFileSync` não compila aqui, porque o `lib: DOM` do projeto faz `URL` ser
// o do navegador e não o do Node.
const AQUI = dirname(fileURLToPath(import.meta.url));
const FONTE_VITE_CONFIG = readFileSync(join(AQUI, '..', '..', 'vite.config.ts'), 'utf8');

describe('o proxy do Vite cobre as rotas do worker', () => {
  it('🔴 `/criar-sala` atravessa o proxy — era exatamente o que faltava', () => {
    // Sem isto, "Criar sala" leva 404 do próprio Vite e o worker nem fica
    // sabendo. A UI então acusa o servidor de estar fora do ar, e ele está no
    // ar. Foi o bug do 3.3.2.
    expect(chaveQueAtende(ROTA_CRIAR_SALA)).not.toBeNull();
  });

  it('o WebSocket da sala continua coberto, e com `ws: true`', () => {
    const caminho = new URL(urlDaSala('ws://localhost:5173', 'A3F9C2')).pathname;
    expect(caminho.startsWith(PREFIXO_PARTIES)).toBe(true);

    const chave = chaveQueAtende(caminho);
    expect(chave).not.toBeNull();
    expect(proxyDoWorker()[chave!].ws).toBe(true);
  });

  it('TODA rota declarada é atendida, e só a do WebSocket pede `ws`', () => {
    const proxy = proxyDoWorker();
    for (const rota of ROTAS_DO_WORKER) {
      const chave = chaveQueAtende(rota.caminho);
      expect(chave, `rota "${rota.caminho}" não atravessa o proxy`).not.toBeNull();
      // `ws` num proxy HTTP puro não quebra nada, mas mentir sobre a natureza
      // da rota é como a lista volta a divergir do worker.
      expect(proxy[chave!].ws ?? false, rota.caminho).toBe(rota.ws);
      expect(proxy[chave!].target, rota.caminho).toBe(ALVO_WORKER_DEV);
    }
  });

  /**
   * 🔒 ANTI-VACUIDADE. Sem isto, um `casa()` que devolvesse sempre `true` (ou
   * uma rota `'/'`, que engoliria o app inteiro) deixaria tudo acima verde sem
   * provar nada.
   */
  it('um caminho que NÃO é do worker não casa com chave nenhuma', () => {
    for (const caminho of ['/', '/index.html', '/src/ui/App.tsx', '/rota-inexistente']) {
      expect(chaveQueAtende(caminho), caminho).toBeNull();
    }
  });
});

/**
 * O elo que fecha o circuito. Os testes acima provam que `proxyDoWorker()` está
 * certo; estes provam que é ELE que o Vite usa. Sem isso, alguém poderia
 * reescrever o bloco à mão no `vite.config.ts` e recriar exatamente as duas
 * listas divergentes que causaram o bug — com a suíte inteira verde.
 *
 * É verificação sobre o TEXTO do arquivo, e isso tem limite conhecido: prova
 * que a chamada está escrita, não que o Vite a executou. O que a torna útil
 * mesmo assim é que o modo de falha real é edição humana, não runtime — e o
 * caminho de runtime já foi medido à mão com `curl` neste PR.
 */
describe('o `vite.config.ts` USA a derivação, em vez de uma cópia à mão', () => {
  it('o arquivo foi mesmo lido (anti-vacuidade dos dois cheques abaixo)', () => {
    expect(FONTE_VITE_CONFIG).toContain('defineConfig');
    expect(FONTE_VITE_CONFIG).toContain('server:');
  });

  it('o `proxy` vem de `proxyDoWorker()`', () => {
    expect(FONTE_VITE_CONFIG).toMatch(/proxy:\s*proxyDoWorker\(\)/);
  });

  it('nenhum alvo escrito à mão — seria a segunda fonte de verdade de novo', () => {
    expect(FONTE_VITE_CONFIG).not.toMatch(/target:\s*['"]/);
  });
});
