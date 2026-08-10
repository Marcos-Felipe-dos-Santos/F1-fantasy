/**
 * 🔴 O CONTRATO DO AUSENTE, testado explicitamente (pedido do dev no PR 3.3).
 *
 * O risco, nas palavras dele: *"se dois clientes divergirem na escolha
 * automática de quem abandonou, o pool de peças fura em silêncio."*
 *
 * O harness já prova que o MECANISMO funciona (controle negativo: sabotar um
 * cliente faz a comparação falhar). O que o 3.3 acrescenta é um risco
 * diferente: **a UI criar um SEGUNDO caminho de decisão**. Um `escolherBot`
 * chamado de dentro de um componente, uma heurística "pega a primeira peça",
 * um `Math.random` num `useEffect` — qualquer um desses divide a decisão em
 * dois lugares, e a partir daí dois jogadores podem debitar cópias diferentes
 * do pool compartilhado sem que nada acuse.
 *
 * Por isso este arquivo tem duas metades:
 * 1. **Varredura de `src/ui/**`** — nenhum arquivo de UI pode importar
 *    `escolherBot` nem reimplementar a substituição.
 * 2. **Verificação de comportamento** — a substituição é determinística e dá o
 *    MESMO resultado em execuções independentes, que é a propriedade de que
 *    tudo depende.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { criarDraft, resolverBots } from '../engine/draft';
import { congelarRoster } from '../net/sala';
import { escolhaDoAusente } from '../net/cliente';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const AQUI = dirname(fileURLToPath(import.meta.url));

/**
 * Tira comentários da fonte antes de procurar.
 *
 * Necessário, e não conveniência: os arquivos que MAIS falam de
 * `escolhaDoAusente` e de `Math.random` são justamente os que explicam por que
 * não podem usá-los — `useSalaOnline.ts` e `FluxoOnline.tsx` documentam a
 * regra, e `persistencia.ts` diz "sem `Math.random`, sem relógio". Uma
 * varredura ingênua reprovaria a própria documentação da regra e empurraria
 * todo mundo a apagar os comentários, que é o oposto do que se quer.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\r\n]*/g, '$1');
}

/** Anda na árvore inteira, não só no primeiro nível. */
function tsRecursivo(dir: string, incluirTestes: boolean): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    // RECURSIVO de propósito: a primeira versão parava no primeiro nível e
    // degradaria em silêncio no dia em que alguém criasse `src/ui/online/`.
    if (statSync(caminho).isDirectory()) return tsRecursivo(caminho, incluirTestes);
    if (!/\.tsx?$/.test(nome)) return [];
    if (!incluirTestes && /\.test\.tsx?$/.test(nome)) return [];
    return [caminho];
  });
}

function arquivosDaUi(): string[] {
  return tsRecursivo(AQUI, false);
}

/** Todo `.ts`/`.tsx` do projeto — produção e teste. */
function arquivosDoProjeto(): string[] {
  const raiz = join(AQUI, '..');
  return ['engine', 'net', 'ui'].flatMap((pasta) => tsRecursivo(join(raiz, pasta), true));
}

/**
 * Quantos argumentos cada chamada de `nomeFn` recebe.
 *
 * ⚠️ Conta parênteses BALANCEADOS, e isso não é preciosismo: a primeira versão
 * usava `/nomeFn\s*\([^)]*,[^)]*,/` e era **falso-negativo** — o `[^)]*` parava
 * no primeiro `)`, então a chamada real
 * `sincronizarDraft(aplicarMensagem(a, b), dataset, sabotagem)` passava limpo.
 * Medido: com a sabotagem aplicada, o teste continuava verde. Um teste de cerca
 * que não pega o contorno é pior que nenhum, porque dá confiança falsa.
 */
function aridadesDe(fonte: string, nomeFn: string): number[] {
  const aridades: number[] = [];
  const marca = new RegExp(`\\b${nomeFn}\\s*\\(`, 'g');
  for (let m = marca.exec(fonte); m !== null; m = marca.exec(fonte)) {
    let profundidade = 1;
    let argumentos = 1;
    let i = m.index + m[0].length;
    for (; i < fonte.length && profundidade > 0; i += 1) {
      const c = fonte[i];
      if (c === '(' || c === '[' || c === '{') profundidade += 1;
      else if (c === ')' || c === ']' || c === '}') profundidade -= 1;
      else if (c === ',' && profundidade === 1) argumentos += 1;
    }
    // Chamada sem argumento nenhum: `fn()`.
    if (fonte.slice(m.index + m[0].length, i - 1).trim().length === 0) argumentos = 0;
    aridades.push(argumentos);
  }
  return aridades;
}

/** `E:\...\src\net\cliente.ts` → `src/net/cliente.ts`, pra asserção legível. */
const relativo = (caminho: string): string =>
  caminho.slice(caminho.indexOf('src')).split('\\').join('/');

describe('a UI não pode ter um SEGUNDO caminho de escolha do ausente', () => {
  it('a varredura enxerga os arquivos de produção da UI (não passa vazia)', () => {
    const arquivos = arquivosDaUi();
    expect(arquivos.length).toBeGreaterThan(20);
    expect(arquivos.some((a) => a.endsWith('FluxoOnline.tsx'))).toBe(true);
    expect(arquivos.some((a) => a.endsWith('useSalaOnline.ts'))).toBe(true);
  });

  it('`aridadesDe` conta argumentos com parênteses aninhados (anti-falso-negativo)', () => {
    // O caso exato que a versão anterior deixava passar.
    expect(aridadesDe('sincronizarDraft(aplicarMensagem(a, b), dataset)', 'sincronizarDraft')).toEqual([
      2,
    ]);
    expect(
      aridadesDe('sincronizarDraft(aplicarMensagem(a, b), dataset, sabota)', 'sincronizarDraft'),
    ).toEqual([3]);
    expect(aridadesDe('sincronizarDraft(x, y, (e, d, j) => f(e, d, j))', 'sincronizarDraft')).toEqual(
      [3],
    );
    expect(aridadesDe('fn()', 'fn')).toEqual([0]);
    expect(aridadesDe('outraCoisa(a, b, c)', 'sincronizarDraft')).toEqual([]);
  });

  it('o removedor de comentários não come CÓDIGO (anti-vacuidade)', () => {
    // Se ele apagasse demais, os três testes abaixo passariam sempre.
    const fonte = [
      '// escolherBot no comentário',
      '/* escolhaDoAusente no bloco */',
      'const x = escolherBot(a, b, c);',
      'const y = Math.random();',
      "const url = 'https://exemplo.com'; // o // de https não pode cortar a linha",
    ].join('\n');
    const limpo = semComentarios(fonte);
    expect(limpo).toContain('escolherBot(a, b, c)');
    expect(limpo).toContain('Math.random()');
    expect(limpo).toContain('https://exemplo.com');
    expect(limpo).not.toContain('no comentário');
    expect(limpo).not.toContain('no bloco');
  });

  it('nenhum arquivo de UI importa `escolherBot`', () => {
    const culpados = arquivosDaUi().filter((arquivo) =>
      /\bescolherBot\b/.test(semComentarios(readFileSync(arquivo, 'utf8'))),
    );
    expect(
      culpados,
      `a escolha do ausente tem que sair de src/net/cliente.ts, num lugar só:\n${culpados.join('\n')}`,
    ).toEqual([]);
  });

  it('nenhum arquivo de UI chama `escolhaDoAusente` por conta própria', () => {
    // Nem a versão canônica: quem a chama é `sincronizarDraft`, dentro do
    // cliente. Se a UI a chamasse, teria de decidir QUANDO — e é aí que dois
    // clientes passam a divergir, mesmo usando a mesma função.
    const culpados = arquivosDaUi().filter((arquivo) =>
      /\bescolhaDoAusente\b/.test(semComentarios(readFileSync(arquivo, 'utf8'))),
    );
    expect(culpados, `só o cliente resolve ausente:\n${culpados.join('\n')}`).toEqual([]);
  });

  it('ALLOWLIST repo-wide: só estes arquivos podem tocar `escolherBot`', () => {
    // Asserir AUSÊNCIA num diretório é contornável por indireção: um helper novo
    // em `src/net/qualquer-coisa.ts` chamado de um componente passaria limpo
    // (achado da revisão). Asserir IGUALDADE contra uma lista fechada não é —
    // qualquer arquivo novo que toque `escolherBot` reprova até ser discutido.
    const permitidos = [
      'src/engine/bots.ts',
      'src/engine/bots.test.ts',
      'src/engine/draft.ts',
      'src/engine/draft.test.ts',
      'src/engine/draft-utils.ts',
      'src/net/cliente.ts',
      'src/net/draft-rede.ts',
      'src/net/conformidade-draft.test.ts',
      'src/ui/contrato-ausente.test.ts',
    ].sort();
    const usam = arquivosDoProjeto()
      .filter((a) => /\bescolherBot\b/.test(readFileSync(a, 'utf8')))
      .map(relativo)
      .sort();
    expect(usam).toEqual(permitidos);
  });

  it('a UI não chama `escolhaPadrao` — o docstring dela CONVIDA a isso', () => {
    // `escolhaPadrao` se anuncia como "o que a UI vai substituir por cliques".
    // Chamá-la com o id de um AUSENTE seria um segundo caminho de decisão sem
    // citar nenhum nome proibido. A UI escolhe por CLIQUE; nada mais.
    const culpados = arquivosDaUi().filter((arquivo) =>
      /\bescolhaPadrao\b/.test(semComentarios(readFileSync(arquivo, 'utf8'))),
    );
    expect(culpados.map(relativo), 'a UI decide por clique, não por heurística').toEqual([]);
  });

  it('ninguém na UI passa o 3º argumento de `sincronizarDraft`', () => {
    // O terceiro parâmetro (`EscolherPeloAusente`) existe para o HARNESS
    // sabotar clientes de propósito. Passá-lo na UI reabriria exatamente a
    // divergência que este arquivo existe para impedir — e não dispararia
    // nenhum dos outros testes, porque não cita nome proibido nenhum.
    const culpados = arquivosDaUi().filter((arquivo) =>
      aridadesDe(semComentarios(readFileSync(arquivo, 'utf8')), 'sincronizarDraft').some(
        (n) => n > 2,
      ),
    );
    expect(culpados.map(relativo), 'só o harness injeta escolha de ausente').toEqual([]);
  });

  it('nenhum arquivo de UI usa Math.random (nem para desempate visual)', () => {
    // `Math.random` na UI do online é caminho direto pra divergência: basta
    // que ele influencie qualquer coisa que vire comando.
    const culpados = arquivosDaUi().filter((arquivo) =>
      /Math\s*\.\s*random/.test(semComentarios(readFileSync(arquivo, 'utf8'))),
    );
    expect(culpados, `use o RNG semeado da engine:\n${culpados.join('\n')}`).toEqual([]);
  });
});

describe('a substituição do ausente é determinística', () => {
  const roster = (seed: number) =>
    congelarRoster(
      Array.from({ length: 4 }, (_, i) => ({
        id: `humano-${String(i + 1).padStart(2, '0')}`,
        nome: `J${i + 1}`,
        pronto: true,
      })),
      seed,
      'dificil',
    );

  it.each([1, 2026, 99999])(
    'seed %i: dois clientes independentes escolhem a MESMA coisa pelo ausente',
    (seed) => {
      // Dois "clientes" = duas execuções que nunca se falaram, partindo do
      // mesmo estado. É exatamente a condição real: 22 máquinas calculando
      // sozinhas o que o ausente escolheria.
      const estadoA = resolverBots(criarDraft(dataset, roster(seed), seed), dataset);
      const estadoB = resolverBots(criarDraft(dataset, roster(seed), seed), dataset);

      for (const jogadorId of ['humano-01', 'humano-03']) {
        expect(escolhaDoAusente(estadoA, dataset, jogadorId)).toEqual(
          escolhaDoAusente(estadoB, dataset, jogadorId),
        );
      }
    },
  );

  it('a escolha depende do JOGADOR — não é a mesma para todo mundo', () => {
    // Anti-vacuidade: se a substituição devolvesse sempre a mesma coisa, o
    // teste acima passaria sem provar determinismo de nada.
    const estado = resolverBots(criarDraft(dataset, roster(2026), 2026), dataset);
    const escolhas = ['humano-01', 'humano-02', 'humano-03', 'humano-04'].map((id) =>
      JSON.stringify(escolhaDoAusente(estado, dataset, id)),
    );
    expect(new Set(escolhas).size, 'a substituição ignora quem é o jogador').toBeGreaterThan(1);
  });

  it('não muta o estado recebido (o clone `comoBot` é local)', () => {
    // Se o clone com `tipo: 'bot'` vazasse para o estado aplicado,
    // `resolverBots` resolveria o ausente uma segunda vez por conta própria — e
    // aí os clientes divergiriam conforme a ordem em que chamassem.
    const estado = resolverBots(criarDraft(dataset, roster(7), 7), dataset);
    const copia = structuredClone(estado);
    escolhaDoAusente(estado, dataset, 'humano-02');
    expect(estado).toEqual(copia);
  });
});
