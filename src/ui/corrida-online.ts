/**
 * A fonte ÚNICA da corrida online (PR 2/4 de "corrida online", Fase 3).
 *
 * 🔴 **A tese deste arquivo é a classe de bug do PR 8.4**: duas trilhas de
 * corrida, cada lado correto isoladamente, a composição errada, e `npm test`
 * não pega — porque hoje, com a mesma seed, as duas trilhas dão o mesmo
 * resultado. O jogador assistiria a uma corrida e veria OUTRA na tabela.
 *
 * A defesa: `useSalaOnline` chama esta função UMA vez (`useMemo`), e a MESMA
 * referência alimenta tanto o hash de divergência (`hashDaCorrida`) quanto a
 * tela (`FluxoCorrida`, via `{ modo: 'pronta', corrida }`). Ninguém mais
 * chama `prepararCorrida` na trilha online — é o que
 * `contrato-corrida-online.test.ts` varre.
 *
 * 🏆 **O PR 3.5.3 acrescentou as ETAPAS do campeonato online** (`etapasDaSala`,
 * `classificacaoDaSala`) e a tese não mudou de forma: continua havendo UMA
 * função que computa corrida online, e agora ela é chamada de dois sítios com
 * dono declarado — a corrida avulsa em `useSalaOnline`, as etapas no `map`
 * daqui —, cada um travado em UMA chamada exata pelo contrato.
 *
 * Mora em `src/ui/`, não em `src/net/`, por força da cerca do ESLint:
 * `prepararCorrida` está em `src/ui/fluxo-corrida.ts` (consome
 * `simularQuali`/`simularCorrida` da engine) e `src/net/**` está proibido de
 * importar `src/ui/**` (isola a camada de rede do front-end). `corrida-online.ts`
 * é o ponto onde a pista sorteada (engine pura) encontra a preparação da
 * corrida (UI) — e por isso vive do lado que pode importar os dois.
 */

import { acumularClassificacao, calendarioSorteado, seedDaEtapa } from '../engine/campeonato';
import type { Dataset } from '../engine/dataset';
import { pistaSorteada } from '../engine/pista-sorteada';
import type {
  DraftState,
  LinhaClassificacao,
  Pista,
  ResultadoCorrida,
  ResultadoQuali,
} from '../engine/types';
import { prepararCorrida } from './fluxo-corrida';

/** A corrida completa de uma sala online: pista sorteada + grid + resultado, já computados. */
export interface CorridaPreparada {
  pistaId: string;
  pista: Pista;
  grid: ResultadoQuali;
  resultado: ResultadoCorrida;
}

/**
 * Prepara a corrida de uma sala online a partir do draft concluído. Pura e
 * determinística: mesmas entradas ⇒ mesma pista e mesmo resultado, em qualquer
 * cliente que a chame — é essa propriedade que faz os 22 verem a mesma corrida
 * sem o servidor conhecer o dataset.
 *
 * 🔴 **DUAS SEMÂNTICAS DE SEED, e a diferença NÃO é estilo — é a decisão D6 da
 * Fase 6, preservada bit a bit (PR 3.5.3).**
 *
 * - **Sem `pistaId` (corrida avulsa online, PR 1/4):** a pista sai de
 *   `pistaSorteada(seed)` e a simulação usa a seed **CRUA**, exatamente como
 *   a corrida avulsa offline.
 * - **Com `pistaId` (etapa de campeonato online, PR 3.5.3):** a pista vem do
 *   CALENDÁRIO — `pistaSorteada` **não é chamada** — e a simulação usa
 *   `seedDaEtapa(seed, pistaId)`, **a mesma função e o mesmo rótulo
 *   `camp:${pistaId}`** da etapa offline.
 *
 * 🔒 **Inverter isso é a classe de bug do 8.4.** Passar a seed publicada crua
 * (ou re-sortear a pista com ela) produz uma corrida perfeitamente
 * determinística e **diferente da etapa que o offline simula com a mesma seed**
 * — e nada quebra: o hash bate entre os clientes, a tela mostra uma corrida
 * coerente, e só o baseline de conformidade contra `simularEtapa` acusa.
 * ⚠️ Pior: `prepararCorrida` tem **default `seed = draftState.seed`**, então
 * ESQUECER o 4º argumento compila limpo e erra em silêncio.
 */
export function corridaDaSala(
  dataset: Dataset,
  draft: DraftState,
  seed: number,
  pistaId?: string,
): CorridaPreparada {
  const idDaPista = pistaId ?? pistaSorteada(dataset, seed);
  const seedDaSimulacao = pistaId === undefined ? seed : seedDaEtapa(seed, pistaId);
  const { pista, grid, resultado } = prepararCorrida(dataset, draft, idDaPista, seedDaSimulacao);
  return { pistaId: idDaPista, pista, grid, resultado };
}

/**
 * 🏆 As etapas ABERTAS do campeonato online, derivadas do snapshot (PR 3.5.3).
 *
 * 🔒 **Derivação PURA, sem estado local acumulado** — é o que faz o F5
 * funcionar: quem recarrega a página recompõe exatamente as mesmas etapas do
 * snapshot, sem depender de nada que o navegador tenha guardado. Não há
 * "adicionar a etapa nova à lista": a lista inteira é função do snapshot.
 *
 * 🔒 **A etapa k é o PAR `(seedsAbertas[k], calendario[k])`** — as duas metades
 * vêm do servidor pela mesma via e têm que ser casadas pelo MESMO índice. É
 * este pareamento que os baselines M-pista e M-indice atacam.
 *
 * O servidor publica só as seeds já abertas (`seedsAbertas`, crescente), então
 * o comprimento do array é o próprio limite: **as etapas futuras não são
 * computáveis porque a seed delas não está aqui**, não porque alguém se lembrou
 * de cortar a lista.
 *
 * Devolve `[]` em dois casos, e **só nesses dois**: `seedCalendario === null`
 * e `seedsAbertas` vazio. Na prática é o que cobre sala **legado** (nunca teve
 * seeds) e o draft em andamento — mas por caminho INDIRETO, e a diferença
 * importa.
 *
 * ⚠️ **Esta função NÃO olha `draft.fase`, e a redação anterior deste bloco
 * dizia que ela devolvia `[]` "quando o draft ainda não concluiu"** (aviso A5
 * da revisão). Isso é falso: chamada com draft em andamento e `seedsAbertas`
 * não vazio, ela **LANÇA**, por `prepararCorrida` (`fluxo-corrida.ts`). Quem
 * garante que esse par nunca acontece são o portão do SERVIDOR (segura
 * `seedCalendario`/`seedsAbertas` até o draft concluir, mesmo portão da
 * `seedCorrida`) e a guarda de fase do `useSalaOnline`. Quem chamar daqui
 * sem uma das duas recebe exceção, não lista vazia.
 *
 * ⚠️ **`nEtapas` do snapshot NÃO é lido aqui — o formato é fixo em `'curta'`
 * (5), e hoje isso é coerente porque a casca sempre cria a sala com
 * `N_ETAPAS_CURTA`.** Mas o teto de LEITURA do servidor é `[1, 10]`
 * (`sala.ts`, contra `seedsEtapas.length === MAX_ETAPAS`), não 5 — então uma
 * sala v2 com `nEtapas: 10` é considerada **`ok`**, publica 6+ seeds abertas,
 * e esta função lança em `calendario[5]`. **Pendência aberta, decisão do
 * dev** (ver `ESTADO.md`): ou o formato passa a sair de `sala.nEtapas`, ou o
 * cliente ganha uma borda que capture o erro. Registrado aqui porque é onde a
 * próxima pessoa vai olhar.
 */
export function etapasDaSala(
  dataset: Dataset,
  draft: DraftState,
  seedCalendario: number | null,
  seedsAbertas: readonly number[],
): CorridaPreparada[] {
  if (seedCalendario === null || seedsAbertas.length === 0) return [];
  // `'curta'` é o CORTE 3.5-F (formato fixo de 5 etapas, sem seletor no lobby)
  // e o rótulo `'calendario'` já está registrado — nenhum rótulo novo nasce
  // aqui. Restaurar o formato variável é um campo no `iniciar` e um argumento
  // nesta linha.
  const calendario = calendarioSorteado(dataset, seedCalendario, 'curta');
  return seedsAbertas.map((seed, k) => {
    const pistaId = calendario[k];
    // Lança alto em vez de derivar `undefined`: um servidor publicando mais
    // etapas abertas do que o calendário tem é incoerência de contrato, e o
    // silêncio aqui viraria uma etapa com pista errada mais adiante.
    if (pistaId === undefined) {
      throw new Error(
        `etapasDaSala: ${seedsAbertas.length} etapas abertas para um calendário de ${calendario.length}`,
      );
    }
    return corridaDaSala(dataset, draft, seed, pistaId);
  });
}

/**
 * 🏆 A classificação acumulada do campeonato online (PR 3.5.3).
 *
 * 🔒 **Delega inteiramente a `acumularClassificacao`** — a MESMA função do
 * offline (pontuação FIA, countback, desempate por `jogadorId`). Reimplementar
 * a soma aqui seria a classe de bug do 8.4 na tabela em vez de na corrida.
 *
 * 🔒 **`jogadorIds` sai de `draft.loadouts`, ordenado como `prepararCorrida`
 * ordena os loadouts que efetivamente correram** (`fluxo-corrida.ts:80-82`).
 * Não monta roster próprio de propósito: `montarJogadores` já está duplicado
 * entre a UI e `src/net/` (pendência 0(a)) e uma terceira cópia seria pior.
 *
 * Acumula **só as etapas abertas** que recebe — a tabela cresce junto com o
 * cursor do servidor, e nenhuma etapa futura entra na conta.
 */
export function classificacaoDaSala(
  etapas: readonly CorridaPreparada[],
  draft: DraftState,
): LinhaClassificacao[] {
  const jogadorIds = Object.keys(draft.loadouts).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return acumularClassificacao([...etapas], jogadorIds);
}
