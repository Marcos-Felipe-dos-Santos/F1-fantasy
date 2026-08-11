/**
 * PR 3.4 — a guarda que impede `VERSAO_APP` de apodrecer.
 *
 * 🔴 **O problema que este arquivo resolve.** Um handshake baseado numa
 * constante que se bumpa "quando lembrar" não é defesa: é a mesma classe de
 * falha do comentário que dizia conferir o proxy e não conferia. A engine muda,
 * ninguém bumpa, os dois clientes se declaram iguais e divergem em silêncio —
 * exatamente o que o handshake existia pra impedir.
 *
 * Então a constante é amarrada ao CONTEÚDO: este teste hasheia `src/engine/` e
 * `src/data/` e compara com um digest registrado. Mudou o conteúdo sem mudar a
 * versão ⇒ vermelho, com instrução do que fazer.
 *
 * ⚠️ Ele **falha de propósito** em toda mudança de engine ou dataset. Isso é o
 * recurso, não o incômodo: é o único momento em que alguém decide, conscientemente,
 * se a mudança altera resultado de partida.
 *
 * 📛 Este teste LÊ `src/data/*.json` — em bytes, para hashear, **nunca imprimindo
 * conteúdo**. A regra do `CLAUDE.md` protege o contexto da sessão contra despejo
 * de 324 mil tokens; hashear bytes num teste não despeja nada.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VERSAO_APP } from './versao';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_SRC = join(AQUI, '..');

/**
 * O digest registrado. **Atualize junto com `VERSAO_APP`** — a mensagem de
 * falha traz o valor novo pronto pra colar.
 */
const DIGEST_REGISTRADO = 'e53ab7df';

/** Hash de string estilo xmur3, igual ao da engine — sem dependência nova. */
function hashTexto(texto: string): number {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i += 1) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Arquivos que entram no digest, em ordem estável. */
function arquivosDe(raiz: string, filtro: (nome: string) => boolean): string[] {
  const achados: string[] = [];
  const andar = (dir: string): void => {
    for (const nome of readdirSync(dir).sort()) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (filtro(nome)) achados.push(caminho);
    }
  };
  andar(raiz);
  return achados;
}

/**
 * O que conta como fonte de engine para o digest.
 *
 * Testes ficam de fora: mudar teste não muda partida, e incluí-los faria a
 * versão subir por motivo errado. **`versao.ts` também fica de fora, e isso é
 * necessário, não estético**: ele mora em `src/engine/`, então incluí-lo faria
 * bumpar `VERSAO_APP` mudar o próprio digest que a bump deveria satisfazer —
 * o teste pediria uma segunda rodada a cada vez, sem informar nada.
 */
const EH_FONTE_DE_ENGINE = (nome: string): boolean =>
  nome.endsWith('.ts') && !nome.endsWith('.test.ts') && nome !== 'versao.ts';

/**
 * Arquivos de `src/net/` que também decidem RESULTADO — e que a primeira
 * versão deste digest esquecia (achado da revisão do 3.4). Não é detalhe:
 *
 * - **`cliente.ts`** é onde vive `escolhaDoAusente`, literalmente a única
 *   decisão que cada cliente toma sozinho — o RISCO ATIVO do projeto. Mexer
 *   nele muda o resultado do MESMO log com `VERSAO_APP` parada, que é
 *   exatamente o que o handshake existe pra impedir.
 * - **`hash-draft.ts`** decide o formato do atestado. Um deploy que só mexa
 *   nele faria cliente velho e novo hashearem estados IDÊNTICOS de formas
 *   diferentes — mesma versão, os dois entram, **alarme falso imediato**. Era
 *   um caminho real de dois clientes CORRETOS divergindo sem ser lag.
 */
const FONTES_DE_NET = ['cliente.ts', 'hash-draft.ts'];

function digestDoConteudo(): string {
  // A engine é o que CALCULA; `src/data/` é o que ALIMENTA; e os dois arquivos
  // de `src/net/` acima decidem substituição de ausente e formato de hash.
  const daEngine = arquivosDe(join(RAIZ_SRC, 'engine'), EH_FONTE_DE_ENGINE);
  const doDataset = arquivosDe(join(RAIZ_SRC, 'data'), (n) => n.endsWith('.json'));
  const daRede = FONTES_DE_NET.map((n) => join(RAIZ_SRC, 'net', n));

  let acumulado = 0;
  for (const caminho of [...daEngine, ...doDataset, ...daRede]) {
    // Nome relativo entra junto: renomear arquivo muda o que a engine importa.
    const relativo = caminho.slice(RAIZ_SRC.length).replace(/\\/g, '/');
    acumulado = hashTexto(`${acumulado}:${relativo}:${hashTexto(readFileSync(caminho, 'utf8'))}`);
  }
  return acumulado.toString(16).padStart(8, '0');
}

describe('VERSAO_APP acompanha o conteúdo de engine + dataset', () => {
  it('o digest registrado bate com o conteúdo atual', () => {
    const atual = digestDoConteudo();
    expect(
      atual,
      [
        '',
        '🔴 `src/engine/` ou `src/data/` MUDOU e `VERSAO_APP` não acompanhou.',
        '',
        `   VERSAO_APP hoje: ${VERSAO_APP}`,
        `   digest esperado: ${DIGEST_REGISTRADO}`,
        `   digest atual:    ${atual}`,
        '',
        '   Decida: a mudança altera RESULTADO de partida?',
        '   - Sim  → bump `VERSAO_APP` (src/engine/versao.ts) E cole o digest atual aqui.',
        '            Clientes de versões diferentes deixam de conseguir entrar na mesma sala,',
        '            que é o ponto: eles produziriam loadouts diferentes do mesmo log.',
        '   - Não  → cole só o digest atual (refactor sem efeito, comentário, tipo).',
        '',
      ].join('\n'),
    ).toBe(DIGEST_REGISTRADO);
  });

  /**
   * 🔒 ANTI-VACUIDADE. Sem isto, um `digestDoConteudo` que devolvesse constante
   * (por não achar arquivo nenhum, por exemplo) deixaria o teste acima verde
   * pra sempre — e a guarda inteira viraria decoração.
   */
  it('o digest realmente depende do conteúdo lido', () => {
    const daEngine = arquivosDe(join(RAIZ_SRC, 'engine'), EH_FONTE_DE_ENGINE);
    const doDataset = arquivosDe(join(RAIZ_SRC, 'data'), (n) => n.endsWith('.json'));

    // Achou arquivos dos três lados? Um filtro quebrado zeraria a varredura.
    expect(daEngine.length).toBeGreaterThan(5);
    expect(doDataset.length).toBeGreaterThan(0);

    // E os de `src/net/` existem mesmo? Um rename silencioso faria o digest
    // parar de cobrir justamente o arquivo do RISCO ATIVO.
    for (const nome of FONTES_DE_NET) {
      expect(existsSync(join(RAIZ_SRC, 'net', nome)), `${nome} sumiu de src/net/`).toBe(true);
    }

    // E o hash distingue conteúdo — se `hashTexto` colapsasse, tudo passaria.
    expect(hashTexto('a')).not.toBe(hashTexto('b'));
    expect(hashTexto('')).not.toBe(hashTexto('a'));
  });

  it('a versão tem o formato anunciado', () => {
    expect(VERSAO_APP).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
