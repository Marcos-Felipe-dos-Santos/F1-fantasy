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

function arquivosDaUi(): string[] {
  return readdirSync(AQUI).flatMap((nome) => {
    const caminho = join(AQUI, nome);
    if (statSync(caminho).isDirectory()) return [];
    // O próprio teste cita os nomes proibidos; e os testes em geral podem
    // importar o que precisarem — a cerca é sobre código de PRODUÇÃO da UI.
    if (!/\.tsx?$/.test(nome) || /\.test\.tsx?$/.test(nome)) return [];
    return [caminho];
  });
}

describe('a UI não pode ter um SEGUNDO caminho de escolha do ausente', () => {
  it('a varredura enxerga os arquivos de produção da UI (não passa vazia)', () => {
    const arquivos = arquivosDaUi();
    expect(arquivos.length).toBeGreaterThan(20);
    expect(arquivos.some((a) => a.endsWith('FluxoOnline.tsx'))).toBe(true);
    expect(arquivos.some((a) => a.endsWith('useSalaOnline.ts'))).toBe(true);
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
