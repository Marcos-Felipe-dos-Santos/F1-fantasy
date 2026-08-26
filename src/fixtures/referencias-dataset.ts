/**
 * REFERÊNCIAS DE `equipe/ano` — o sítio ÚNICO dos literais de nome real usados
 * para LOCALIZAR entradas do dataset (PR 2 da trilha do dataset fictício).
 *
 * Antes deste arquivo, os pares `equipe/ano` estavam escritos à mão em 7
 * arquivos e 44 sítios, e se comportavam de formas DIFERENTES quando o nome não
 * batia: `scripts/balance.ts:52` lançava (quebra alta, ruidosa), enquanto
 * `scripts/dataset-report.ts` imprimia `'(não encontrado)'` e seguia — o bloco é
 * rotulado no próprio código como *"informativo — não falha o script"*. **É a
 * degradação silenciosa que mais interessa funilar:** ela mente sem alarme.
 *
 * 🔑 **Por que ANTES da troca de dataset (PR 6):** com o funil, o PR 6 troca os
 * valores AQUI, num lugar só, em vez de caçá-los por 7 arquivos — e o contraste
 * "um quebra alto, o outro degrada em silêncio" deixa de existir.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 ESTE MÓDULO GUARDA LITERAIS. NUNCA RESOLVE DO DATASET.
 *
 * A tentação óbvia é derivar estas constantes do dataset (pegar a primeira
 * entrada, procurar por id…). **Isso destruiria o valor do funil, e o efeito
 * está MEDIDO neste projeto:** `loadoutsParadas` (`scripts/balance.ts:219`)
 * monta seus specs a partir de `selecionarPilotosParadas(dataset)`, ou seja do
 * próprio dataset — então o `.find` sempre acha, o `throw` de `:221` é
 * **inalcançável**, e a função é **IMUNE a rename**. Um funil auto-resolvido
 * viraria exatamente isso.
 *
 * O plano nomeia `scripts/balance.ts:50` como o **canário** que o PR 6 precisa
 * ver quebrar quando o dataset virar fictício. Um canário que se conserta
 * sozinho não é canário. **Literais, importados — nada mais.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ O QUE ESTE MÓDULO NÃO COBRE, e é deliberado:
 *
 * - **`scripts/portao-nomes-reais.test.ts:213-222`** — o literal `'Ferrari'` lá
 *   É a cláusula anti-vacuidade do portão do PR 1. Funilá-lo destruiria o teste.
 * - **`scripts/balance.test.ts:38-43`** e **`src/ui/fluxo-draft-golden.test.ts:61-65`**
 *   — são **ORÁCULOS pinados** contra o dataset real (asserções de SAÍDA), não
 *   entradas de lookup. O próprio comentário do primeiro diz que re-pinar exige
 *   "decisão CONSCIENTE do dev". **Decisão do dev, 2026-08-25: ficam literais**,
 *   e o PR 6 os toca à mão, visíveis no diff.
 * - **`src/engine/types.test.ts`** — fixtures sintéticas, com ids e notas
 *   inventados. Não tocam o dataset.
 * - **Nome de equipe em prosa** (nome de teste, comentário) e **`'Red Bull Ring'`**,
 *   que é nome de PISTA, não de equipe.
 *
 * 📌 Nenhum valor mudou ao criar este arquivo. O PR 2 é refactor verde→verde:
 * `npm test` e a saída de `npm run balance` são idênticos antes e depois.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 ACHADO DO PR 2 QUE O PLANO NÃO PREVIA — LEIA ANTES DE EXECUTAR O PR 6.
 *
 * **Os consumidores destas constantes NÃO leem todos o mesmo dataset**, e a
 * trilha troca os três em PRs DIFERENTES. Medido em 2026-08-25:
 *
 * | consumidor | dataset que lê | troca em |
 * |---|---|---|
 * | `scripts/balance.ts`, `alavancas.test.ts`, `balance.test.ts` | `src/data/` | **PR 6** |
 * | `src/engine/corrida.test.ts`, `draft-test-fixtures.ts` (via `bots.test.ts` e `draft.test.ts`) | `src/fixtures/dataset-semente/` | **PR 7** |
 * | `scripts/dataset-report.ts`, `derivar-notas.test.ts` | `scripts/derived/` | **nunca** (segue real por desenho) |
 *
 * 🔑 **`RED_BULL_2023` é consumido pelos TRÊS.** Entre o PR 6 e o PR 7 existe
 * uma janela em que `src/data/` já é fictício e a fixture ainda é real — e uma
 * constante só não pode servir os dois lados. **Nessa janela, o `.find` do lado
 * não-trocado deixa de achar:** `balance.ts:52` lançaria (ruidoso, bom) e
 * `dataset-report.ts` imprimiria `'(não encontrado)'` (silencioso, ruim).
 *
 * **Dois caminhos, e a escolha é do dev:**
 *   (a) particionar este módulo por dataset — um bloco por origem — antes do PR 6;
 *   (b) fazer o PR 6 e o PR 7 no mesmo PR, fechando a janela.
 *
 * ⚠️ **O funil não CRIOU este problema — ele o tornou visível.** Antes, os
 * mesmos literais estavam espalhados por 7 arquivos e a janela existia igual,
 * sem que nada a apontasse.
 */

/** Um par `equipe/ano`, que é como o dataset indexa uma entrada. */
export interface RefEquipeAno {
  readonly equipe: string;
  readonly ano: number;
}

// ---------------------------------------------------------------------------
// O carro forte de referência do balance-harness.
// ---------------------------------------------------------------------------

/** `scripts/balance.ts:50` (`loadoutForte`) e o canário do PR 6. */
export const RED_BULL_2023: RefEquipeAno = { equipe: 'Red Bull', ano: 2023 };

// ---------------------------------------------------------------------------
// Alavancas e guardas do harness (`alavancas.test.ts`, `balance.test.ts`).
// ---------------------------------------------------------------------------

export const WILLIAMS_2022: RefEquipeAno = { equipe: 'Williams', ano: 2022 };
export const ALFA_ROMEO_1951: RefEquipeAno = { equipe: 'Alfa Romeo', ano: 1951 };
export const RENAULT_2006: RefEquipeAno = { equipe: 'Renault', ano: 2006 };

// ---------------------------------------------------------------------------
// Spot-checks do `dataset-report.ts` — o caminho que degrada em SILÊNCIO.
// ---------------------------------------------------------------------------

export const MCLAREN_1988: RefEquipeAno = { equipe: 'McLaren', ano: 1988 };
export const FERRARI_2004: RefEquipeAno = { equipe: 'Ferrari', ano: 2004 };
export const MINARDI_1995: RefEquipeAno = { equipe: 'Minardi', ano: 1995 };
export const RED_BULL_2012: RefEquipeAno = { equipe: 'Red Bull', ano: 2012 };
export const RED_BULL_2011: RefEquipeAno = { equipe: 'Red Bull', ano: 2011 };
export const MERCEDES_2015: RefEquipeAno = { equipe: 'Mercedes', ano: 2015 };
export const MCLAREN_2015: RefEquipeAno = { equipe: 'McLaren', ano: 2015 };

/**
 * Os 5 pares do bloco de buckets AERO/MEC/MOTOR (`dataset-report.ts:210-214`).
 * A FORMA de lista é preservada — o chamador itera sobre ela.
 */
export const SPOT_CHECKS_BUCKETS: readonly RefEquipeAno[] = [
  RED_BULL_2011,
  MERCEDES_2015,
  MCLAREN_2015,
  FERRARI_2004,
  MCLAREN_1988,
];

// ---------------------------------------------------------------------------
// Overrides curados (`derivar-notas.test.ts`).
// ---------------------------------------------------------------------------

/** Andrea de Cesaris — titular real FORA de ULT_OVERRIDES/CHU_OVERRIDES. */
export const MINARDI_1986: RefEquipeAno = { equipe: 'Minardi', ano: 1986 };

// ---------------------------------------------------------------------------
// Grid de 12 equipes distintas (`src/engine/corrida.test.ts:84-95`), para
// exercitar a pontuação FIA com mais de 10 carros.
// ---------------------------------------------------------------------------

export const FERRARI_2023: RefEquipeAno = { equipe: 'Ferrari', ano: 2023 };
export const MERCEDES_2023: RefEquipeAno = { equipe: 'Mercedes', ano: 2023 };
export const MCLAREN_2023: RefEquipeAno = { equipe: 'McLaren', ano: 2023 };
export const ASTON_MARTIN_2023: RefEquipeAno = { equipe: 'Aston Martin', ano: 2023 };
export const WILLIAMS_2023: RefEquipeAno = { equipe: 'Williams', ano: 2023 };
export const WILLIAMS_2004: RefEquipeAno = { equipe: 'Williams', ano: 2004 };
export const MCLAREN_2004: RefEquipeAno = { equipe: 'McLaren', ano: 2004 };
export const RENAULT_2004: RefEquipeAno = { equipe: 'Renault', ano: 2004 };
export const SAUBER_2004: RefEquipeAno = { equipe: 'Sauber', ano: 2004 };
export const MINARDI_2004: RefEquipeAno = { equipe: 'Minardi', ano: 2004 };

/** As 12, na ORDEM original — a ordem alimenta `jogadorId: p1…p12`. */
export const GRID_12_EQUIPES_DISTINTAS: readonly RefEquipeAno[] = [
  RED_BULL_2023,
  FERRARI_2023,
  MERCEDES_2023,
  MCLAREN_2023,
  ASTON_MARTIN_2023,
  WILLIAMS_2023,
  FERRARI_2004,
  WILLIAMS_2004,
  MCLAREN_2004,
  RENAULT_2004,
  SAUBER_2004,
  MINARDI_2004,
];
