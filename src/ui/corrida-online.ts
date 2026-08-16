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
 * Mora em `src/ui/`, não em `src/net/`, por força da cerca do ESLint:
 * `prepararCorrida` está em `src/ui/fluxo-corrida.ts` (consome
 * `simularQuali`/`simularCorrida` da engine) e `src/net/**` está proibido de
 * importar `src/ui/**` (isola a camada de rede do front-end). `corrida-online.ts`
 * é o ponto onde a pista sorteada (engine pura) encontra a preparação da
 * corrida (UI) — e por isso vive do lado que pode importar os dois.
 */

import type { Dataset } from '../engine/dataset';
import { pistaSorteada } from '../engine/pista-sorteada';
import type { DraftState, Pista, ResultadoCorrida, ResultadoQuali } from '../engine/types';
import { prepararCorrida } from './fluxo-corrida';

/** A corrida completa de uma sala online: pista sorteada + grid + resultado, já computados. */
export interface CorridaPreparada {
  pistaId: string;
  pista: Pista;
  grid: ResultadoQuali;
  resultado: ResultadoCorrida;
}

/**
 * Deriva a pista da `seedCorrida` da sala e prepara a corrida a partir do
 * draft concluído. Pura e determinística: mesma `(draft, seedCorrida)` ⇒
 * mesma pista e mesmo resultado, em qualquer cliente que a chame — é essa
 * propriedade que faz os 22 verem a mesma corrida sem o servidor conhecer o
 * dataset.
 */
export function corridaDaSala(
  dataset: Dataset,
  draft: DraftState,
  seedCorrida: number,
): CorridaPreparada {
  const pistaId = pistaSorteada(dataset, seedCorrida);
  const { pista, grid, resultado } = prepararCorrida(dataset, draft, pistaId, seedCorrida);
  return { pistaId, pista, grid, resultado };
}
