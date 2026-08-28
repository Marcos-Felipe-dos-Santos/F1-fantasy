/**
 * REFERÊNCIAS DE `equipe/ano` — o sítio ÚNICO dos literais de nome real usados
 * para LOCALIZAR entradas do dataset (PR 2 da trilha do dataset fictício),
 * **PARTICIONADO POR ORIGEM no PR de posicionamento (2026-08-28).**
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
 * 🔒 A PARTIÇÃO POR ORIGEM — CAMINHO (a), DECISÃO DO DEV EM 2026-08-28.
 *
 * O PR 2 mediu que **os consumidores destas constantes NÃO leem todos o mesmo
 * dataset**, e que a trilha troca cada dataset num PR diferente. Isso virou a
 * pendência **0(aa)** do `ESTADO.md`, com dois caminhos possíveis: **(a)**
 * particionar este módulo por dataset antes do PR 6, ou **(b)** fazer o PR 6 e o
 * PR 7 no mesmo PR. **O dev escolheu (a)**, com o motivo dito por ele: fazer 6 e
 * 7 juntos junta o ALTO RISCO (`src/data/`, tela, netcode) com o BAIXO
 * (fixture), e o portão visual do 6 ficaria misturado com mudança de fixture.
 *
 * **Cada bloco abaixo serve UMA origem, e é a origem que dita quando ele muda:**
 *
 * | bloco       | dataset que os consumidores leem  | troca em |
 * |-------------|-----------------------------------|----------|
 * | `DATA_*`    | `src/data/`                       | **PR 6** |
 * | `FIXTURE_*` | `src/fixtures/dataset-semente/`   | **PR 7** |
 * | `DERIVADO_*`| `scripts/derived/`                | **nunca**|
 *
 * 🔑 **O PREFIXO É O PONTO, não decoração.** `RED_BULL_2023` era UMA constante
 * consumida pelos TRÊS lados, e entre o PR 6 e o PR 7 existe uma janela em que
 * `src/data/` já é fictício e a fixture ainda é real — **uma constante só não
 * serve os dois lados**. Nessa janela o `.find` do lado não-trocado deixaria de
 * achar: `balance.ts:52` lançaria (ruidoso, bom) e `dataset-report.ts`
 * imprimiria `'(não encontrado)'` (silencioso, ruim). Com a partição, o PR 6
 * edita **só o bloco `DATA_*`** e os outros dois seguem apontando para o dado
 * que ainda é real.
 *
 * 🔑 **Consequência aceita: o mesmo par aparece mais de uma vez.**
 * `Red Bull 2023` está nos três blocos e `Ferrari 2004` em dois. **Não é
 * duplicação a ser "limpa"** — é o que separa origens que hoje coincidem por
 * acaso e que deixam de coincidir no PR 6. Quem deduplicar reabre a janela.
 *
 * ⚠️ **PRECISÃO sobre a coluna "nunca":** o que segue real por desenho é
 * `equipe-anos.derivado.json`, a ENTRADA do pipeline. Desde o PR 5 existe ao
 * lado dele um `equipe-anos.anonimo.json` (gitignorado, saída de
 * `npm run dataset:anonimizar`) que é fictício — mas **nenhum consumidor desta
 * tabela o lê**, e por isso a coluna continua correta como está.
 * 🔴 **A cópia manual `derived → src/data/` NÃO morreu no PR 5 — ela morre no
 * PR 6**, que é quem publica. Até lá segue manual e sem guarda.
 *
 * ⚠️ **A PARTIÇÃO NÃO É CERCA, e a distinção importa.** Nada aqui IMPEDE que um
 * arquivo que lê a fixture importe do bloco `DATA_*` — o alinhamento
 * consumidor↔bloco é convenção sustentada por leitura, não por teste. O que
 * existe do lado do PR 6 são os dois portões que já estão no plano: o `throw` de
 * `balance.ts:52` (ruidoso) e o `npm run dataset:report` com sha256 comparado
 * (que é justamente o que cobre o caminho silencioso).
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
 * 📌 **Nenhum VALOR mudou na partição — só os nomes das constantes.** É refactor
 * verde→verde: `npm test` e a saída de `npm run balance` são idênticos antes e
 * depois. ⚠️ **A exceção medida, e ela não é comportamento:**
 * `src/engine/draft-test-fixtures.ts` está no escopo do digest de `VERSAO_APP`
 * (mora em `src/engine/` e não tem sufixo `.test.ts`), então renomear o import
 * dele **move o digest** de `src/engine/versao.test.ts`. **Sem bump de
 * `VERSAO_APP`** — é o caso "Não" que o próprio `versao.test.ts` descreve, e o
 * precedente é o do PR 2 (`50bda11`), pelo mesmo arquivo.
 */

/** Um par `equipe/ano`, que é como o dataset indexa uma entrada. */
export interface RefEquipeAno {
  readonly equipe: string;
  readonly ano: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO `DATA_*` — consumidores que leem `src/data/`. 🔴 TROCAM NO PR 6.
//
// `scripts/balance.ts`, `scripts/alavancas.test.ts`, `scripts/balance.test.ts`.
// É o ÚNICO bloco que o PR 6 edita.
// ═══════════════════════════════════════════════════════════════════════════

/** `scripts/balance.ts:50` (`loadoutForte`) e o canário do PR 6. */
export const DATA_RED_BULL_2023: RefEquipeAno = { equipe: 'Red Bull', ano: 2023 };

/** Alavancas e guardas do harness (`alavancas.test.ts`, `balance.test.ts`). */
export const DATA_WILLIAMS_2022: RefEquipeAno = { equipe: 'Williams', ano: 2022 };
export const DATA_ALFA_ROMEO_1951: RefEquipeAno = { equipe: 'Alfa Romeo', ano: 1951 };
export const DATA_RENAULT_2006: RefEquipeAno = { equipe: 'Renault', ano: 2006 };

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO `DERIVADO_*` — consumidores que leem `scripts/derived/`. NUNCA TROCAM.
//
// `scripts/dataset-report.ts`, `scripts/derivar-notas.test.ts`. O derivado é a
// ENTRADA do pipeline e segue com nome REAL por desenho — ver
// `scripts/caminhos-dataset.ts`.
// ═══════════════════════════════════════════════════════════════════════════

/** `derivar-notas.test.ts` — o mesmo par que `DATA_RED_BULL_2023`, outra origem. */
export const DERIVADO_RED_BULL_2023: RefEquipeAno = { equipe: 'Red Bull', ano: 2023 };

/** Andrea de Cesaris — titular real FORA de ULT_OVERRIDES/CHU_OVERRIDES. */
export const DERIVADO_MINARDI_1986: RefEquipeAno = { equipe: 'Minardi', ano: 1986 };

// Spot-checks do `dataset-report.ts` — o caminho que degrada em SILÊNCIO.
export const DERIVADO_MCLAREN_1988: RefEquipeAno = { equipe: 'McLaren', ano: 1988 };
export const DERIVADO_FERRARI_2004: RefEquipeAno = { equipe: 'Ferrari', ano: 2004 };
export const DERIVADO_MINARDI_1995: RefEquipeAno = { equipe: 'Minardi', ano: 1995 };
export const DERIVADO_RED_BULL_2012: RefEquipeAno = { equipe: 'Red Bull', ano: 2012 };
export const DERIVADO_RED_BULL_2011: RefEquipeAno = { equipe: 'Red Bull', ano: 2011 };
export const DERIVADO_MERCEDES_2015: RefEquipeAno = { equipe: 'Mercedes', ano: 2015 };
export const DERIVADO_MCLAREN_2015: RefEquipeAno = { equipe: 'McLaren', ano: 2015 };

/**
 * Os 5 pares do bloco de buckets AERO/MEC/MOTOR (`dataset-report.ts:210-214`).
 * A FORMA de lista é preservada — o chamador itera sobre ela.
 */
export const DERIVADO_SPOT_CHECKS_BUCKETS: readonly RefEquipeAno[] = [
  DERIVADO_RED_BULL_2011,
  DERIVADO_MERCEDES_2015,
  DERIVADO_MCLAREN_2015,
  DERIVADO_FERRARI_2004,
  DERIVADO_MCLAREN_1988,
];

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO `FIXTURE_*` — consumidores que leem `src/fixtures/dataset-semente/`.
// 🔴 TROCAM NO PR 7.
//
// `src/engine/draft-test-fixtures.ts`, `src/engine/corrida.test.ts`.
// ═══════════════════════════════════════════════════════════════════════════

/** `draft-test-fixtures.ts` — o mesmo par que `DATA_RED_BULL_2023`, outra origem. */
export const FIXTURE_RED_BULL_2023: RefEquipeAno = { equipe: 'Red Bull', ano: 2023 };

// Grid de 12 equipes distintas (`src/engine/corrida.test.ts:84-95`), para
// exercitar a pontuação FIA com mais de 10 carros.
export const FIXTURE_FERRARI_2023: RefEquipeAno = { equipe: 'Ferrari', ano: 2023 };
export const FIXTURE_MERCEDES_2023: RefEquipeAno = { equipe: 'Mercedes', ano: 2023 };
export const FIXTURE_MCLAREN_2023: RefEquipeAno = { equipe: 'McLaren', ano: 2023 };
export const FIXTURE_ASTON_MARTIN_2023: RefEquipeAno = { equipe: 'Aston Martin', ano: 2023 };
export const FIXTURE_WILLIAMS_2023: RefEquipeAno = { equipe: 'Williams', ano: 2023 };
export const FIXTURE_FERRARI_2004: RefEquipeAno = { equipe: 'Ferrari', ano: 2004 };
export const FIXTURE_WILLIAMS_2004: RefEquipeAno = { equipe: 'Williams', ano: 2004 };
export const FIXTURE_MCLAREN_2004: RefEquipeAno = { equipe: 'McLaren', ano: 2004 };
export const FIXTURE_RENAULT_2004: RefEquipeAno = { equipe: 'Renault', ano: 2004 };
export const FIXTURE_SAUBER_2004: RefEquipeAno = { equipe: 'Sauber', ano: 2004 };
export const FIXTURE_MINARDI_2004: RefEquipeAno = { equipe: 'Minardi', ano: 2004 };

/** As 12, na ORDEM original — a ordem alimenta `jogadorId: p1…p12`. */
export const FIXTURE_GRID_12_EQUIPES_DISTINTAS: readonly RefEquipeAno[] = [
  FIXTURE_RED_BULL_2023,
  FIXTURE_FERRARI_2023,
  FIXTURE_MERCEDES_2023,
  FIXTURE_MCLAREN_2023,
  FIXTURE_ASTON_MARTIN_2023,
  FIXTURE_WILLIAMS_2023,
  FIXTURE_FERRARI_2004,
  FIXTURE_WILLIAMS_2004,
  FIXTURE_MCLAREN_2004,
  FIXTURE_RENAULT_2004,
  FIXTURE_SAUBER_2004,
  FIXTURE_MINARDI_2004,
];
