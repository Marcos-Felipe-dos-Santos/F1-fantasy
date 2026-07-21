/**
 * Transições puras do draft, extraídas do hook `useDraft` pra permitir teste
 * sem DOM (PR 1.7a). `iniciarDraft`/`aplicarEscolhaDoJogador` são genéricas
 * pra N humanos (PR 2.1a, modo Local); `iniciarDraftSingle`/
 * `aplicarEscolhaHumano` são wrappers finos que preservam a API e o
 * comportamento do modo Single (1 humano + 21 bots) — coberto por teste de
 * equivalência de seed.
 *
 * Regra de fronteira: cada função aqui é só composição de funções da engine
 * (`criarDraft`, `aplicarEscolha`, `resolverBots`) — nenhuma regra de jogo é
 * reimplementada. A UI (hook e telas) só chama estas funções; nunca chama a
 * engine diretamente pra transições de estado.
 */

import { atribuirPerfis } from '../engine/bots';
import { aplicarEscolha, criarDraft, resolverBots } from '../engine/draft';
import type { Dataset } from '../engine/dataset';
import { seedFromString } from '../engine/rng';
import type { Dificuldade, DraftState, EscolhaDraft, Jogador } from '../engine/types';

/** Id fixo do jogador humano no modo Single. */
export const ID_HUMANO = 'voce';

/** Total de jogadores de uma partida (§3/§12): humanos + bots até completar 22. */
const QTD_JOGADORES = 22;

/** Configuração de um jogador humano a entrar no draft. */
export interface HumanoConfig {
  id: string;
  nome?: string;
}

/**
 * Converte o texto de seed digitado pelo jogador numa seed numérica
 * determinística: só dígitos vira `Number`, qualquer outro texto passa por
 * `seedFromString`.
 */
export function seedDeTexto(texto: string): number {
  return /^\d+$/.test(texto) ? Number(texto) : seedFromString(texto);
}

/**
 * Converte um inteiro (sorteado pela UI via `crypto.getRandomValues`, fora
 * daqui — esta função não sorteia nada) na string decimal de sua normalização
 * uint32 (`>>> 0`). Contrato de round-trip com `seedDeTexto`:
 * `seedDeTexto(seedAleatoriaTexto(x)) === (x >>> 0)`, porque `Number` de uma
 * string decimal de um uint32 é sempre exato (uint32 cabe sem perda em
 * `number`) e o texto produzido só tem dígitos, então cai no ramo `Number`
 * de `seedDeTexto`, nunca no `seedFromString`.
 */
export function seedAleatoriaTexto(uint32: number): string {
  return String(uint32 >>> 0);
}

/**
 * Decisão da seed efetiva da partida (PR 2.4): usa o texto digitado só se o
 * jogador ABRIU a seção "seed específica" E digitou algo além de espaços;
 * qualquer outro caso sorteia uma seed nova via `sortearUint32` (injetado —
 * a TelaInicio passa `crypto.getRandomValues`; testes passam um stub). O
 * sorteio só é consumido no ramo aleatório, então uma seed específica válida
 * nunca depende da fonte de aleatoriedade.
 */
export function seedEfetivaTexto(
  usarEspecifica: boolean,
  seedTexto: string,
  sortearUint32: () => number,
): string {
  if (usarEspecifica && seedTexto.trim().length > 0) {
    return seedTexto;
  }
  return seedAleatoriaTexto(sortearUint32());
}

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/**
 * Valida a lista de humanos recebida por `iniciarDraft` antes de montar os
 * jogadores: nenhum id vazio/só-espaços, nenhum id duplicado, e a quantidade
 * de humanos precisa caber entre 1 e `QTD_JOGADORES` (senão não sobra
 * espaço, ou não sobra ninguém, pros bots).
 */
function validarHumanos(humanos: HumanoConfig[]): void {
  assert(
    humanos.length >= 1 && humanos.length <= QTD_JOGADORES,
    `iniciarDraft: esperado entre 1 e ${QTD_JOGADORES} humanos, recebeu ${humanos.length}`,
  );

  const idsVistos = new Set<string>();
  for (const humano of humanos) {
    assert(
      humano.id.trim().length > 0,
      'iniciarDraft: id de jogador humano vazio ou só espaços',
    );
    assert(
      !idsVistos.has(humano.id),
      `iniciarDraft: id de jogador humano duplicado "${humano.id}"`,
    );
    idsVistos.add(humano.id);
  }
}

/**
 * Monta os `QTD_JOGADORES` jogadores da partida: os humanos primeiro (na
 * ordem recebida, com o `nome` informado), depois bots `bot-01..` até
 * completar o total.
 *
 * IMPORTANTE: os ids de jogador humano são sempre fixos e definidos fora
 * daqui (`ID_HUMANO = 'voce'` no Single; `humano-1..4` no modo Local) — nunca
 * derivados do `nome` digitado. O `id` alimenta `deriveSeed` na engine
 * (`draft:sorteios:<id>` etc.); usar o nome como id quebraria a
 * reprodutibilidade por seed silenciosamente (mesmo nome digitado por
 * jogadores diferentes, ou nome mudando entre partidas, mudaria os
 * sub-streams de RNG).
 */
function montarJogadores(
  seed: number,
  dificuldade: Dificuldade,
  humanos: HumanoConfig[],
): Jogador[] {
  validarHumanos(humanos);
  const qtdBots = QTD_JOGADORES - humanos.length;
  const base: Jogador[] = [
    ...humanos.map((h): Jogador => ({ id: h.id, tipo: 'humano', nome: h.nome })),
    ...Array.from({ length: qtdBots }, (_, i) => ({
      id: `bot-${String(i + 1).padStart(2, '0')}`,
      tipo: 'bot' as const,
    })),
  ];
  return atribuirPerfis(base, seed, dificuldade);
}

/**
 * Monta os jogadores da partida (humanos + bots até 22), cria o draft e
 * resolve os bots até a UI precisar de uma decisão de algum humano (ou o
 * draft terminar).
 */
export function iniciarDraft(
  dataset: Dataset,
  seedTexto: string,
  dificuldade: Dificuldade,
  humanos: HumanoConfig[],
): DraftState {
  const seed = seedDeTexto(seedTexto);
  const jogadores = montarJogadores(seed, dificuldade, humanos);
  const inicial = criarDraft(dataset, jogadores, seed);
  return resolverBots(inicial, dataset);
}

/**
 * Aplica a escolha de um jogador (humano) e resolve os bots subsequentes,
 * sempre devolvendo um novo `DraftState` (a engine já é imutável).
 */
export function aplicarEscolhaDoJogador(
  dataset: Dataset,
  state: DraftState,
  jogadorId: string,
  escolha: EscolhaDraft,
): DraftState {
  const proximo = aplicarEscolha(state, dataset, jogadorId, escolha);
  return resolverBots(proximo, dataset);
}

/**
 * Monta os 22 jogadores do modo Single, cria o draft e resolve os bots até a
 * UI precisar de uma decisão do humano (ou o draft terminar, caso o humano
 * não exista — nunca acontece aqui, mas mantém o mesmo caminho da engine).
 *
 * Wrapper fino sobre `iniciarDraft` — mantém a API do modo Single intacta.
 * Sem `nome`: o fallback de `nomeJogador` na UI já cobre "Você" pro humano.
 */
export function iniciarDraftSingle(
  dataset: Dataset,
  seedTexto: string,
  dificuldade: Dificuldade,
): DraftState {
  return iniciarDraft(dataset, seedTexto, dificuldade, [{ id: ID_HUMANO }]);
}

/**
 * Aplica a escolha do humano do modo Single e resolve os bots subsequentes.
 * Wrapper fino sobre `aplicarEscolhaDoJogador` — mantém a API do modo Single
 * intacta.
 */
export function aplicarEscolhaHumano(
  dataset: Dataset,
  state: DraftState,
  escolha: EscolhaDraft,
): DraftState {
  return aplicarEscolhaDoJogador(dataset, state, ID_HUMANO, escolha);
}
