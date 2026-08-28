/**
 * 🔒 TESTE DIFERENCIAL DO `anonimizar` — PR 5 da trilha do dataset fictício.
 *
 * Compara o dataset DERIVADO (real) com a saída de `anonimizar` e responde duas
 * perguntas que se contrapõem de propósito:
 *
 *   (a) **ESTRUTURAL** — o que NÃO pode ter mudado: comprimento, ordem, `ano`
 *       posicional, TODAS as notas, e a ordem do par de pilotos.
 *   (b) **ANTI-VACUIDADE** — o que TEM de ter mudado: os dois arquivos não são
 *       idênticos, e **todo** `equipe`, **todo** `pilotos[].nome`, **todo** `id`
 *       e **todo** `estrategista.nome` DIFEREM.
 *
 * 🔴 **É a metade (b) que É o teste.** Sem ela, um `anonimizar` que degenerasse
 * em `cp` passaria trivialmente na metade (a) — e passaria com louvor, porque
 * cópia preserva estrutura perfeitamente. Mutante `M-cp` prova isso.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔑 A PROVA QUE FECHA O PR: OS DOIS HASHES, na MESMA seed.
 *
 * - **`hashDaCorrida` IDÊNTICO** — a simulação não vê nome. A carga dele é
 *   `pistaId`, `jogadorId`, `posicao`, `status`, `tempoTotal`,
 *   `voltaMaisRapida.jogadorId` e `historicoVoltas` (`src/net/hash-corrida.ts`)
 *   — nenhum id nem nome de dataset. **O determinismo sobrevive à troca.**
 * - **`hashDoDraft` DIFERENTE** — ele consome `${equipe}@${ano}` (`sorteios`) e
 *   os ids de loadout (`src/net/hash-draft.ts:64-70`), então mudar por desenho.
 *   **É a cláusula anti-vacuidade de graça: se os dois hashes baterem, o
 *   `anonimizar` virou cópia.**
 *
 * ⚠️ **As duas metades são load-bearing e não se substituem.** `hashDaCorrida`
 * idêntico com `hashDoDraft` idêntico é uma cópia; `hashDaCorrida` diferente é
 * quebra de determinismo, que é o que o PR 6 não pode aceitar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 📛 **DISCIPLINA DE SAÍDA — este teste lê ~1 MB e NUNCA o imprime.** Toda
 * mensagem de falha é limitada a contagem + no máximo 3 amostras curtas. Mesma
 * regra do `portao-nomes-reais.test.ts` e do `src/engine/versao.test.ts:18`:
 * teste que despeja dataset ao ficar vermelho estoura a sessão que for
 * diagnosticá-lo.
 *
 * 📌 **Opera sobre o RETORNO EM MEMÓRIA de `anonimizar`, nunca sobre
 * `equipe-anos.anonimo.json`** — o arquivo é gitignorado (decisão do dev,
 * 2026-08-28) e `npm test` não pode depender de artefato gerado.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anonimizar, type TabelaDeNomes } from './anonimizar.ts';
import { EQUIPE_ANOS_DERIVADO, DATA_DIR, TABELA_NOMES } from './caminhos-dataset.ts';
import { verificarColisaoDeIds, type EquipeAnoDerivado } from './derivar-notas.ts';
import { join } from 'node:path';
import { criarDataset } from '../src/engine/dataset';
import { criarDraft, resolverBots } from '../src/engine/draft';
import { atribuirPerfis } from '../src/engine/bots';
import { pistaSorteada } from '../src/engine/pista-sorteada';
import { simularQuali } from '../src/engine/quali';
import { simularCorrida } from '../src/engine/corrida';
import { hashDoDraft } from '../src/net/hash-draft';
import { hashDaCorrida } from '../src/net/hash-corrida';
import type { Jogador } from '../src/engine/types';

const ler = (caminho: string): unknown => JSON.parse(readFileSync(caminho, 'utf8'));

const REAL = ler(EQUIPE_ANOS_DERIVADO) as EquipeAnoDerivado[];
const TABELA = ler(TABELA_NOMES) as TabelaDeNomes;
const ANON = anonimizar(REAL, TABELA);

/** Cardinalidades do universo — se mudarem, nada abaixo vale mais. */
const ESPERADO_REGISTROS = 771;
const ESPERADO_EQUIPES_NA_TABELA = 105;
const ESPERADO_PILOTOS_NA_TABELA = 353;

/** `no máximo 3` amostras, curtas, para não despejar dataset numa falha. */
function amostras(itens: readonly string[]): string {
  const corte = itens.slice(0, 3).join(' · ');
  return itens.length > 3 ? `${corte} … (+${itens.length - 3})` : corte;
}

/** Todos os 6 ids de um registro, na ordem canônica de `verificarColisaoDeIds`. */
function idsDe(reg: EquipeAnoDerivado): string[] {
  return [
    reg.pilotos[0].id,
    reg.pilotos[1].id,
    reg.chassi.id,
    reg.motor.id,
    reg.estrategista.id,
    reg.pit.id,
  ];
}

/** O token de piloto do id (`…-piloto-<token>`), que é o `driverId` real ou o `codigo` fictício. */
function tokenDoPiloto(id: string): string {
  const k = id.indexOf('-piloto-');
  return k < 0 ? '' : id.slice(k + '-piloto-'.length);
}

// ---------------------------------------------------------------------------
// Anti-vacuidade do próprio carregamento.
// ---------------------------------------------------------------------------

describe('🔒 diferencial — o insumo existe (anti-vacuidade do carregamento)', () => {
  it(`o derivado tem ${ESPERADO_REGISTROS} registros e a tabela tem 105/353`, () => {
    // Se qualquer um destes degenerar para vazio, TODA comparação abaixo passa
    // por vacuidade (0 iguais em 0 registros) e o teste declararia limpo um
    // pipeline que não rodou.
    expect(REAL).toHaveLength(ESPERADO_REGISTROS);
    expect(Object.keys(TABELA.equipes)).toHaveLength(ESPERADO_EQUIPES_NA_TABELA);
    expect(Object.keys(TABELA.pilotos)).toHaveLength(ESPERADO_PILOTOS_NA_TABELA);
  });
});

// ---------------------------------------------------------------------------
// (a) METADE ESTRUTURAL — o que NÃO pode ter mudado.
// ---------------------------------------------------------------------------

describe('🔒 diferencial (a) ESTRUTURAL — o que o anonimizar NÃO pode mexer', () => {
  it('mesmo comprimento', () => {
    expect(ANON).toHaveLength(REAL.length);
  });

  it('mesma ORDEM: o `ano` bate posicionalmente em todos os registros', () => {
    const fora: string[] = [];
    for (let i = 0; i < REAL.length; i++) {
      if (ANON[i].ano !== REAL[i].ano) fora.push(`#${i}: ${REAL[i].ano}→${ANON[i].ano}`);
    }
    expect(fora.length, `ano fora de posição em ${fora.length} registros: ${amostras(fora)}`).toBe(
      0,
    );
  });

  it('TODAS as notas são deep-equal, campo a campo', () => {
    const fora: string[] = [];
    for (let i = 0; i < REAL.length; i++) {
      const r = REAL[i];
      const a = ANON[i];
      const pares: Array<[string, unknown, unknown]> = [
        ['pilotos[0]', r.pilotos[0].notas, a.pilotos[0].notas],
        ['pilotos[1]', r.pilotos[1].notas, a.pilotos[1].notas],
        ['chassi', r.chassi.notas, a.chassi.notas],
        ['motor', r.motor.notas, a.motor.notas],
        ['estrategista', r.estrategista.notas, a.estrategista.notas],
        ['pit', r.pit.notas, a.pit.notas],
      ];
      for (const [rotulo, esperado, obtido] of pares) {
        // Comparação por string canônica: as chaves são emitidas na mesma ordem
        // porque o objeto de notas é o MESMO por referência quando correto.
        if (JSON.stringify(esperado) !== JSON.stringify(obtido)) fora.push(`#${i} ${rotulo}`);
      }
    }
    expect(fora.length, `notas alteradas em ${fora.length} sítios: ${amostras(fora)}`).toBe(0);
  });

  it('a ORDEM DO PAR de pilotos é preservada — `pilotos[i]` mapeia o `driverId` de `pilotos[i]`', () => {
    // 🔴 O risco vivo: alguém "melhorando" o script re-ordena o par pelo
    // driverId FICTÍCIO, espelhando o `.sort(cmpStr)` de `derivar-notas.ts:688`
    // — e troca os dois pilotos de lugar dentro da equipe, calado.
    const fora: string[] = [];
    for (let i = 0; i < REAL.length; i++) {
      for (const k of [0, 1] as const) {
        const driverIdReal = tokenDoPiloto(REAL[i].pilotos[k].id);
        const esperado = TABELA.pilotos[driverIdReal]?.codigo;
        const obtido = tokenDoPiloto(ANON[i].pilotos[k].id);
        if (esperado === undefined || esperado !== obtido) {
          fora.push(`#${i}[${k}] ${driverIdReal}→${obtido} (esperado ${esperado ?? '???'})`);
        }
        if (TABELA.pilotos[driverIdReal]?.nome !== ANON[i].pilotos[k].nome) {
          fora.push(`#${i}[${k}] nome fora de posição`);
        }
      }
    }
    expect(fora.length, `par de pilotos fora de posição em ${fora.length} sítios: ${amostras(fora)}`)
      .toBe(0);
  });

  it('a guarda REAL do pipeline aceita a saída — `verificarColisaoDeIds` não lança', () => {
    // 🔒 A função IMPORTADA de `derivar-notas.ts`, não uma reimplementação com
    // `Set` aqui dentro: contornar `derivarNotas` contorna a guarda existente,
    // e um `Set` local só provaria que este arquivo sabe usar `Set`.
    expect(() => verificarColisaoDeIds(ANON)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// (b) METADE ANTI-VACUIDADE — o que TEM de ter mudado. É ela que é o teste.
// ---------------------------------------------------------------------------

describe('🔒 diferencial (b) ANTI-VACUIDADE — sem isto, `cp` passa', () => {
  it('os dois datasets NÃO são idênticos', () => {
    expect(JSON.stringify(ANON)).not.toBe(JSON.stringify(REAL));
  });

  it('TODO `equipe` difere', () => {
    const iguais = REAL.filter((r, i) => r.equipe === ANON[i].equipe).map((r) => `${r.ano}`);
    expect(iguais.length, `${iguais.length} equipes não mudaram: ${amostras(iguais)}`).toBe(0);
  });

  it('TODO `pilotos[].nome` difere (1.542 nomes)', () => {
    const iguais: string[] = [];
    for (let i = 0; i < REAL.length; i++) {
      for (const k of [0, 1] as const) {
        if (REAL[i].pilotos[k].nome === ANON[i].pilotos[k].nome) iguais.push(`#${i}[${k}]`);
      }
    }
    expect(iguais.length, `${iguais.length} nomes de piloto não mudaram: ${amostras(iguais)}`).toBe(
      0,
    );
  });

  it('TODO `id` difere (6 por registro)', () => {
    // 🔑 Os ids SÃO os nomes neste esquema (`slug(constructorId)-ano-papel`), e
    // é por isso que trocar só o nome exibido seria meio-serviço: o bundle
    // continuaria carregando `alfa-1950-piloto-fangio`.
    const iguais: string[] = [];
    for (let i = 0; i < REAL.length; i++) {
      const idsReais = idsDe(REAL[i]);
      const idsAnon = idsDe(ANON[i]);
      for (let k = 0; k < idsReais.length; k++) {
        if (idsReais[k] === idsAnon[k]) iguais.push(idsReais[k]);
      }
    }
    expect(iguais.length, `${iguais.length} ids não mudaram: ${amostras(iguais)}`).toBe(0);
  });

  it('TODO `estrategista.nome` difere', () => {
    const iguais = REAL.filter((r, i) => r.estrategista.nome === ANON[i].estrategista.nome).map(
      (r) => r.estrategista.id,
    );
    expect(
      iguais.length,
      `${iguais.length} nomes de estrategista não mudaram: ${amostras(iguais)}`,
    ).toBe(0);
  });

  it('🔴 O 4º SÍTIO: `estrategista.nome` é CONSISTENTE com `equipe` — a string foi RECONSTRUÍDA', () => {
    // O campo nasce por INTERPOLAÇÃO (`derivar-notas.ts:711`), não é um campo
    // próprio — é o sítio que uma caminhada de campo esquece. Se ele for
    // deixado para trás (ou traduzido de forma independente do campo `equipe`),
    // sobra "Estrategista <real> <ano>" ao lado de `equipe: <fictício>`.
    const fora: string[] = [];
    for (const a of ANON) {
      const esperado = `Estrategista ${a.equipe} ${a.ano}`;
      if (a.estrategista.nome !== esperado) fora.push(`${a.estrategista.id}: "${a.estrategista.nome}"`);
    }
    expect(
      fora.length,
      `${fora.length} estrategistas inconsistentes com o campo \`equipe\`: ${amostras(fora)}`,
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A PROVA: os dois hashes, mesma seed.
// ---------------------------------------------------------------------------

/** Seed fixa da prova. Qualquer uma serve; fixa para o resultado ser reproduzível. */
const SEED = 20260827;

/** 22 bots — o draft se resolve inteiro sem humano, e o RNG é o semeado da engine. */
function jogadoresDaProva(): Jogador[] {
  const crus: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot',
  }));
  // `Dificuldade` é `'facil' | 'dificil'` (`src/engine/types.ts:240`) — não há
  // 'media'. ⚠️ Uma versão anterior deste arquivo passava `'media'`: em runtime
  // `PROPORCAO_PRA_GANHAR['media']` é `undefined`, `rng.next() < undefined` é
  // `false`, e TODOS os 22 bots saíam 'passeio'. Rodava, dava hash estável e
  // parecia certo — quem pegou foi o `tsc`, não o teste. Registrado porque é a
  // forma exata do "o teste afirmava o que não conferia".
  return atribuirPerfis(crus, SEED, 'dificil');
}

/** Roda draft + quali + corrida sobre um `equipe-anos` e devolve os dois hashes. */
function medir(equipeAnos: unknown) {
  const dataset = criarDataset(
    equipeAnos,
    ler(join(DATA_DIR, 'pecas.json')),
    ler(join(DATA_DIR, 'pistas.json')),
  );
  const draft = resolverBots(criarDraft(dataset, jogadoresDaProva(), SEED), dataset);
  const pistaId = pistaSorteada(dataset, SEED);
  const pista = dataset.pistasById.get(pistaId);
  if (pista === undefined) throw new Error(`prova: pista "${pistaId}" não existe no dataset`);
  const loadouts = Object.values(draft.loadouts);
  const grid = simularQuali(dataset, loadouts, pista, SEED);
  const resultado = simularCorrida(dataset, loadouts, pista, grid, SEED);
  return {
    fase: draft.fase,
    pistaId,
    nLoadouts: loadouts.length,
    hashDraft: hashDoDraft(draft),
    hashCorrida: hashDaCorrida({ pistaId, resultado }),
  };
}

describe('🔑 diferencial — a PROVA: mesma seed, dataset real × dataset anonimizado', () => {
  const mReal = medir(REAL);
  const mAnon = medir(ANON);

  it('ANTI-VACUIDADE da prova: os dois lados rodaram um draft COMPLETO com 22 loadouts', () => {
    // Sem isto, um draft que parasse na fase 'sorteios' daria hashes iguais por
    // não ter chegado a lugar nenhum — e a metade "IDÊNTICO" passaria por
    // vacuidade. É a lição da SEXTA instância do `ESTADO.md`: baseline cujo
    // cenário não alcança a guarda não é baseline.
    expect(mReal.fase).toBe('concluido');
    expect(mAnon.fase).toBe('concluido');
    expect(mReal.nLoadouts).toBe(22);
    expect(mAnon.nLoadouts).toBe(22);
  });

  it('a PISTA sorteada é a mesma — a seed não vê o dataset trocado', () => {
    expect(mAnon.pistaId).toBe(mReal.pistaId);
  });

  it('✅ `hashDaCorrida` é IDÊNTICO — o determinismo sobrevive à troca', () => {
    expect(
      mAnon.hashCorrida,
      [
        '🔴 A CORRIDA MUDOU ao trocar o dataset por nomes fictícios.',
        `   real:       ${mReal.hashCorrida}`,
        `   anonimizado:${mAnon.hashCorrida}`,
        '',
        '   A simulação NÃO pode ver nome: as notas computam sobre pools de',
        '   percentil e o rótulo não entra em conta nenhuma. Hash diferente aqui',
        '   é bandeira vermelha para o PR 6, não ruído.',
      ].join('\n'),
    ).toBe(mReal.hashCorrida);
  });

  it('🔴 `hashDoDraft` DIFERE — é a cláusula anti-vacuidade: se bater, o anonimizar virou cópia', () => {
    expect(
      mAnon.hashDraft,
      [
        '🔴 O HASH DO DRAFT NÃO MUDOU — e ele consome `${equipe}@${ano}` e os',
        '   ids de loadout (`src/net/hash-draft.ts`). Se ele bate nos dois lados,',
        '   o `anonimizar` não trocou nada que o draft enxergue.',
        `   os dois: ${mReal.hashDraft}`,
      ].join('\n'),
    ).not.toBe(mReal.hashDraft);
  });
});
