/**
 * CERCA DE FINAL DE LINHA — PR do `.gitattributes`.
 *
 * Trava a propriedade que o `.gitattributes` existe para dar:
 *
 *     todo arquivo que o digest de `versao.test.ts` lê está pinado como
 *     TEXTO com `eol=lf` — logo, chega ao disco em LF em qualquer máquina.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 POR QUE ELA ASSERE O ATRIBUTO E NÃO OS BYTES DO DISCO. Esta é a parte que
 * impede alguém de "melhorá-la" depois, e é decisão do dev (2026-09-01).
 *
 * A cerca óbvia seria abrir cada arquivo e exigir zero `\r`. **Ela seria
 * VERMELHA hoje**, e não por regressão: medido nesta máquina, o escopo do
 * digest está **12 CRLF + 6 LF**, porque `.gitattributes` **não renormaliza o
 * working tree** — a convergência é por arquivo, conforme cada um for
 * re-checkoutado (ver `ESTADO.md` §Pendências 0(af)).
 *
 * 🔑 **E o defeito é maior que "estaria vermelha": o resultado dela dependeria
 * do MODO DE CHECKOUT** — verde num clone fresco, vermelha aqui, com o mesmo
 * conteúdo commitado nos dois casos. **É exatamente o defeito que este PR
 * existe para remover, reintroduzido uma camada acima**: em vez de o digest
 * depender do checkout, passaria a depender a cerca do digest.
 *
 * `git check-attr` não tem esse problema, e a razão precisa importa:
 * **ele responde a partir da CONFIGURAÇÃO DE ATRIBUTOS, não dos bytes com que
 * cada arquivo foi materializado.** O `.gitattributes` é o mesmo em toda
 * máquina que tenha o repositório; o final de linha de cada arquivo em disco,
 * não. É esse o eixo que torna a cerca determinística — **não** "commitado
 * versus working tree".
 *
 * ⚠️ **A distinção é dita assim porque a primeira redação desta cerca errou
 * exatamente aqui**: afirmava que `check-attr` lê o `.gitattributes`
 * *COMMITADO*. **É falso, e foi medido** — sem `--cached` ele lê o do WORKING
 * TREE. Com o arquivo ainda não rastreado, `git check-attr text` respondia
 * `auto` enquanto `git check-attr --cached text` respondia `unspecified`.
 *
 * 🔒 **E ler o working tree é a escolha CERTA, não uma limitação a consertar
 * com `--cached`.** Quem governa os checkouts desta cópia é o `.gitattributes`
 * que está em disco. Alguém que o apague ou o edite localmente quebra os
 * próprios checkouts, e é isso que a cerca deve acusar — `--cached` ficaria
 * verde nesse cenário, olhando um arquivo que não está mais governando nada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 ASSERE OS DOIS ATRIBUTOS, E NÃO É REDUNDÂNCIA.
 *
 * `text=auto` sozinho normaliza o índice mas **não** fixa o final de linha do
 * checkout; `eol=lf` sozinho não se aplica a arquivo que o git não considere
 * texto. Exigir só `text` deixaria passar um `.gitattributes` reescrito como
 * `* text=auto` — atributo presente, propriedade perdida, cerca verde.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 ANTI-VACUIDADE, e ela é load-bearing por medição.
 *
 * `git check-attr eol` devolve **`lf` até para um `.png`** — medido. Ou seja,
 * uma sonda que só olhasse `eol` não discriminaria nada e passaria mesmo com o
 * mecanismo quebrado. Quem discrimina é `text`: os binários voltam **`unset`**
 * por causa das linhas `*.png binary` / `*.woff2 binary`, e é o `text: unset`
 * que torna o `eol` inerte para eles.
 *
 * Por isso a anti-vacuidade exige que o `.png` responda **diferente** das
 * fontes. Sem ela, um parser quebrado que devolvesse `'auto'` para tudo — ou
 * um `check-attr` que não achasse o `.gitattributes` — deixaria a cerca verde.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ } from './caminhos-dataset.ts';

/**
 * O MESMO recorte de `digestDoConteudo` (`src/engine/versao.test.ts`): fonte de
 * engine que não é teste e não é o próprio `versao.ts`. Repetido pela regra em
 * vez de por lista literal — lista literal seria a segunda fonte que precisa
 * concordar com a primeira, e ela sai de sincronia em silêncio quando alguém
 * acrescenta um arquivo à engine.
 *
 * 🔒 **A duplicação com `versao.test.ts` é DELIBERADA e a deriva aqui é
 * BENIGNA — não "consertar" importando de um teste para o outro.** Se os dois
 * recortes divergirem, o arquivo novo continua pinado pelo `*` do
 * `.gitattributes`; o efeito é a cerca cobrir de MENOS, nunca passar falso.
 * Importar de `versao.test.ts` executaria os `describe` dele duas vezes.
 */
const EH_FONTE_DE_ENGINE = (nome: string): boolean =>
  nome.endsWith('.ts') && !nome.endsWith('.test.ts') && nome !== 'versao.ts';

/** Os mesmos dois de `src/net/` que o digest cobre (`FONTES_DE_NET`). */
const FONTES_DE_NET = ['cliente.ts', 'hash-draft.ts'];

/** Binário usado só como anti-vacuidade: tem que responder DIFERENTE das fontes. */
const BINARIO_DE_CONTROLE = 'docs/img/draft.png';

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

/** Absoluto → relativo à raiz, em barra normal: é a forma que o `git` ecoa de volta. */
const relativo = (caminho: string): string =>
  caminho.slice(RAIZ.length + 1).replace(/\\/g, '/');

const ENTRADAS_DO_DIGEST = {
  engine: arquivosDe(join(RAIZ, 'src', 'engine'), EH_FONTE_DE_ENGINE).map(relativo),
  dataset: arquivosDe(join(RAIZ, 'src', 'data'), (n) => n.endsWith('.json')).map(relativo),
  rede: FONTES_DE_NET.map((n) => `src/net/${n}`),
};

const TODAS = [
  ...ENTRADAS_DO_DIGEST.engine,
  ...ENTRADAS_DO_DIGEST.dataset,
  ...ENTRADAS_DO_DIGEST.rede,
];

/**
 * `caminho → { text, eol }`, lido de `git check-attr`.
 *
 * Falha ALTO e legível se o `git` não responder: um gate que falha ilegível é
 * um gate que alguém desliga (mesma razão do `try/catch` de
 * `checar-casca-sem-node.ts`).
 */
function atributosDe(caminhos: string[]): Map<string, Record<string, string>> {
  let saida: string;
  try {
    saida = new TextDecoder().decode(
      execFileSync('git', ['check-attr', 'text', 'eol', '--', ...caminhos], { stdio: 'pipe' }),
    );
  } catch (erro) {
    throw new Error(
      `não consegui rodar \`git check-attr\` a partir de ${process.cwd()}. ` +
        `Esta cerca pergunta ao git pelos ATRIBUTOS dos arquivos, então precisa de um repositório git. ` +
        `Erro original: ${String(erro)}`,
    );
  }

  const mapa = new Map<string, Record<string, string>>();
  for (const linha of saida.split('\n')) {
    if (linha.trim().length === 0) continue;
    // Formato: `<caminho>: <atributo>: <valor>`. Parseado a partir do FIM
    // porque só o caminho pode conter ': ' — atributo e valor, não.
    const partes = linha.trimEnd().split(': ');
    const valor = partes.pop() as string;
    const atributo = partes.pop() as string;
    const caminho = partes.join(': ');
    mapa.set(caminho, { ...(mapa.get(caminho) ?? {}), [atributo]: valor });
  }
  return mapa;
}

const ATRIBUTOS = atributosDe([...TODAS, BINARIO_DE_CONTROLE]);

describe('🔒 cerca de final de linha — o `.gitattributes` cobre o escopo do digest', () => {
  it('ANTI-VACUIDADE 1: a varredura achou os três grupos do digest', () => {
    // Um filtro quebrado zeraria a lista e faria a cerca abaixo passar sem
    // asserir nada. Mesmos limiares do anti-vacuidade de `versao.test.ts`.
    expect(ENTRADAS_DO_DIGEST.engine.length).toBeGreaterThan(5);
    expect(ENTRADAS_DO_DIGEST.dataset.length).toBeGreaterThan(0);
    expect(ENTRADAS_DO_DIGEST.rede).toHaveLength(2);
  });

  it('ANTI-VACUIDADE 2: o binário de controle responde DIFERENTE das fontes', () => {
    const doBinario = ATRIBUTOS.get(BINARIO_DE_CONTROLE);
    const daFonte = ATRIBUTOS.get(TODAS[0]);

    expect(doBinario, `\`git check-attr\` não respondeu sobre ${BINARIO_DE_CONTROLE}`).toBeDefined();
    expect(daFonte, `\`git check-attr\` não respondeu sobre ${TODAS[0]}`).toBeDefined();

    // É `text` que discrimina — `eol` devolve `lf` para os dois (medido), e uma
    // sonda que olhasse só `eol` passaria com o mecanismo quebrado.
    expect(doBinario?.text).toBe('unset');
    expect(daFonte?.text).toBe('auto');
    expect(doBinario?.text).not.toBe(daFonte?.text);
  });

  it('toda entrada do digest está pinada como texto com `eol=lf`', () => {
    const fora = TODAS.filter((caminho) => {
      const attr = ATRIBUTOS.get(caminho);
      return attr?.text !== 'auto' || attr?.eol !== 'lf';
    });

    expect(
      fora,
      [
        '',
        '🔴 arquivo do escopo do digest NÃO está pinado pelo `.gitattributes`.',
        '',
        '   Esperado por arquivo: `text: auto` E `eol: lf`.',
        '   Sem os DOIS, o final de linha volta a depender do modo de checkout,',
        '   e o digest de `versao.test.ts` volta a medir o checkout em vez do conteúdo.',
        '',
        ...fora.map((c) => `   ${c} → ${JSON.stringify(ATRIBUTOS.get(c) ?? null)}`),
        '',
      ].join('\n'),
    ).toEqual([]);
  });
});
