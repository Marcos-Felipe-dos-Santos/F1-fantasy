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
 * O par `Red Bull 2023` estava nos três blocos e `Ferrari 2004` em dois. **Não
 * é duplicação a ser "limpa"** — é o que separa origens que coincidiam **por
 * acaso** e que deixaram de coincidir no PR 6.
 * ~~✅ **E deixaram mesmo:** desde o PR 6, `DATA_RED_BULL_2023` vale
 * `Kaldrix 2023` enquanto `FIXTURE_RED_BULL_2023` e `DERIVADO_RED_BULL_2023`
 * seguem em `Red Bull 2023`.~~ **É a prova de que a partição pagou** — sem ela,
 * uma constante só não serviria os três lados. Quem deduplicar reabre a janela.
 * 🔴 **A LINHA RISCADA ENVELHECEU NO PR 7 (2026-08-31), e é riscada NO LUGAR.**
 * `FIXTURE_RED_BULL_2023` **passou a valer `Kaldrix 2023`** junto com o
 * `DATA_*`; só o `DERIVADO_*` segue em `Red Bull 2023`, e segue **para sempre**,
 * porque a entrada do pipeline é real por desenho. **A janela de que ela falava
 * era a do PR 6 → PR 7, e ela FECHOU.**
 * ⚠️ Riscada, e não apagada, porque descreve corretamente um estado que existiu
 * — mas em presente do indicativo ela contradiz o bloco `FIXTURE_*` lá embaixo,
 * e **qual das duas vale passaria a depender de qual o leitor abrisse primeiro.**
 * É a segunda vez que este arquivo paga isso: ver o `⚠️` do PR 6, ~15 linhas
 * abaixo, sobre o bloco que "tinha ficado para trás enquanto o resto do arquivo
 * era atualizado". Achado da revisão do PR 7.
 *
 * ⚠️ **PRECISÃO sobre a coluna "nunca":** o que segue real por desenho é
 * `equipe-anos.derivado.json`, a ENTRADA do pipeline — e ele continua sendo a
 * entrada depois do PR 6. **O fictício nasce na PUBLICAÇÃO, não no pipeline.**
 * ~~Desde o PR 5 existe ao lado dele um `equipe-anos.anonimo.json`
 * (gitignorado) que é fictício — mas nenhum consumidor desta tabela o lê.~~
 * ~~🔴 A cópia manual `derived → src/data/` NÃO morreu no PR 5 — ela morre no
 * PR 6. Até lá segue manual e sem guarda.~~
 * ✅ **AS DUAS LINHAS RISCADAS ENVELHECERAM NO PR 6 (2026-08-28), e são riscadas
 * NO LUGAR:** `equipe-anos.anonimo.json` **deixou de existir** (a saída passou a
 * ser `src/data/` direto, uma só), e **a cópia manual MORREU** — quem garante a
 * igualdade agora é `scripts/publicacao.test.ts`, não a convenção.
 * **Achado da revisão do PR 6:** este bloco tinha ficado para trás enquanto o
 * resto do arquivo era atualizado.
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
 *   — são **ORÁCULOS pinados** (asserções de SAÍDA), não entradas de lookup. O
 *   próprio comentário do primeiro diz que re-pinar exige "decisão CONSCIENTE do
 *   dev". **Decisão do dev, 2026-08-25: ficam literais**, tocados à mão e
 *   visíveis no diff.
 *   🔴 **CORRIGIDO NO PR 6 (2026-08-28) — os dois NÃO são do mesmo PR, e a
 *   redação anterior dizia que sim** (*"contra o dataset real … o PR 6 os toca à
 *   mão"*). **Medido por ensaio a seco:** trocando `src/data/`,
 *   `balance.test.ts` fica **vermelho** e `fluxo-draft-golden.test.ts` fica
 *   **VERDE** — porque ele importa `../fixtures/dataset-semente/equipe-anos.json`
 *   (linha 19), a FIXTURE. **`balance.test.ts` é PR 6; `fluxo-draft-golden.test.ts`
 *   é PR 7.**
 *   🔑 É a mesma família da 0(aa): dois consumidores que parecem o mesmo caso
 *   lendo datasets diferentes. **Foi o ensaio que separou os dois** — a leitura
 *   os tinha juntado.
 *   🔴 **CORRIGIDO NO PR 7 (2026-08-31) — ESTE PARÁGRAFO SUBDIMENSIONOU O PR 7,
 *   e é riscado no lugar.** Ler "`fluxo-draft-golden.test.ts` é PR 7" como *"o
 *   que cai no PR 7"* é ler a resposta de outra pergunta: o ensaio do PR 6
 *   perguntava **"cai no PR 6?"**, e só listou os arquivos que ele tinha na
 *   mão. **Medido no PR 7, trocando a fixture:** o baseline vermelho é de
 *   **66 testes em 9 arquivos** — `corrida` 34, `quali` 8, `carro` 7,
 *   `campeonato` 7, `draft` 5, `bots` 2, `dataset` 1, o portão 1, e
 *   `fluxo-draft-golden` **1 de 66**. A causa são os **115 sítios-linha** que
 *   citam id da fixture como literal, e que **este módulo nunca funilou** — ele
 *   guarda pares `equipe/ano`, nunca ids. Quem orçar o PR 7 pelo parágrafo
 *   acima orça um arquivo e encontra nove.
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

/**
 * 🔴 TROCADAS NO PR 6 (2026-08-28) — é a ÚNICA edição de constante da troca, e
 * é exatamente o que a partição comprou: quatro literais num bloco, em vez de
 * caçá-los por 7 arquivos.
 *
 * A equipe é a MESMA em cada linha, com o nome que a `TABELA_NOMES` lhe dá:
 *   `red_bull` → Kaldrix · `williams` → Pemberley
 *   `alfa`     → Ardenta · `renault`  → Charmont
 *
 * 🔑 **`DATA_RED_BULL_2023` seguir apontando para a MESMA equipe é decisão do
 * dev**, não conveniência: o canário existe para quebrar quando o dataset muda,
 * e trocá-lo por outra equipe no mesmo PR o faria medir outra coisa.
 * ⚠️ **Os NOMES das constantes ficam com a grafia real** (`DATA_RED_BULL_2023`,
 * não `DATA_KALDRIX_2023`): são identificadores de código, não dado servido, e
 * renomeá-los agora torraria a rastreabilidade de todo o histórico da trilha
 * sem tirar um byte do bundle. **O portão do PR 1 não mede `.ts`** — está no
 * docstring dele desde o começo.
 */

/** `scripts/balance.ts:50` (`loadoutForte`) e o canário do PR 6. */
export const DATA_RED_BULL_2023: RefEquipeAno = { equipe: 'Kaldrix', ano: 2023 };

/** Alavancas e guardas do harness (`alavancas.test.ts`, `balance.test.ts`). */
export const DATA_WILLIAMS_2022: RefEquipeAno = { equipe: 'Pemberley', ano: 2022 };
export const DATA_ALFA_ROMEO_1951: RefEquipeAno = { equipe: 'Ardenta', ano: 1951 };
export const DATA_RENAULT_2006: RefEquipeAno = { equipe: 'Charmont', ano: 2006 };

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

/**
 * 🔴 TROCADAS NO PR 7 (2026-08-31) — a fixture virou fictícia, e este é o
 * ÚNICO bloco que o PR edita. **`DATA_*` e `DERIVADO_*` ficam intocados**, que
 * é exatamente o que a partição comprou.
 *
 * A equipe é a MESMA em cada linha, com o nome que a `TABELA_NOMES` lhe dá:
 *   `red_bull` → Kaldrix   · `ferrari` → Sarterra  · `mercedes` → Halbrandt
 *   `mclaren`  → Ridgeway  · `aston_martin` → Ardsley Vane
 *   `williams` → Pemberley · `renault` → Charmont  · `sauber` → Baldern
 *   `minardi`  → Ronzani
 *
 * ⚠️ **Os NOMES das constantes ficam com a grafia real** (`FIXTURE_RED_BULL_2023`,
 * não `FIXTURE_KALDRIX_2023`), **mesmo precedente e mesmo motivo do `DATA_*` no
 * PR 6:** são identificadores de código, não dado servido, e renomeá-los
 * torraria a rastreabilidade da trilha inteira sem tirar um byte do bundle.
 * **O portão do PR 1 não mede `.ts`.**
 *
 * 🔑 **A JANELA ENTRE O PR 6 E O PR 7 FECHOU AQUI.** Desde o PR 6,
 * `DATA_RED_BULL_2023` valia `Kaldrix 2023` enquanto este bloco seguia em
 * `Red Bull 2023` — nomes diferentes para a MESMA equipe, cada um servindo o
 * dataset que ainda era o seu. Agora os dois dizem `Kaldrix`, e `DERIVADO_*`
 * segue em `Red Bull` **para sempre**, porque a entrada do pipeline é real por
 * desenho. **Quem deduplicar os três blocos agora reabre a janela** — eles
 * voltaram a coincidir em VALOR, não em ORIGEM.
 */

/** `draft-test-fixtures.ts` — o mesmo par que `DATA_RED_BULL_2023`, outra origem. */
export const FIXTURE_RED_BULL_2023: RefEquipeAno = { equipe: 'Kaldrix', ano: 2023 };

// Grid de 12 equipes distintas (`src/engine/corrida.test.ts:84-95`), para
// exercitar a pontuação FIA com mais de 10 carros.
export const FIXTURE_FERRARI_2023: RefEquipeAno = { equipe: 'Sarterra', ano: 2023 };
export const FIXTURE_MERCEDES_2023: RefEquipeAno = { equipe: 'Halbrandt', ano: 2023 };
export const FIXTURE_MCLAREN_2023: RefEquipeAno = { equipe: 'Ridgeway', ano: 2023 };
export const FIXTURE_ASTON_MARTIN_2023: RefEquipeAno = { equipe: 'Ardsley Vane', ano: 2023 };
export const FIXTURE_WILLIAMS_2023: RefEquipeAno = { equipe: 'Pemberley', ano: 2023 };
export const FIXTURE_FERRARI_2004: RefEquipeAno = { equipe: 'Sarterra', ano: 2004 };
export const FIXTURE_WILLIAMS_2004: RefEquipeAno = { equipe: 'Pemberley', ano: 2004 };
export const FIXTURE_MCLAREN_2004: RefEquipeAno = { equipe: 'Ridgeway', ano: 2004 };
export const FIXTURE_RENAULT_2004: RefEquipeAno = { equipe: 'Charmont', ano: 2004 };
export const FIXTURE_SAUBER_2004: RefEquipeAno = { equipe: 'Baldern', ano: 2004 };
export const FIXTURE_MINARDI_2004: RefEquipeAno = { equipe: 'Ronzani', ano: 2004 };

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
