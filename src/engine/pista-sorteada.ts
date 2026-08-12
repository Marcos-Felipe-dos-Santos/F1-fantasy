/**
 * Pista da corrida ONLINE avulsa — PR 1/4 de "corrida online" (Fase 3).
 *
 * 🔒 **Rótulo PRÓPRIO, nunca `'calendario'`.** `calendarioSorteado`
 * (`campeonato.ts`) deriva o calendário do futuro campeonato online (PR 3.5)
 * a partir da MESMA `seedCorrida`. Se esta função reusasse o rótulo
 * `'calendario'`, a pista da corrida avulsa online seria SEMPRE igual à
 * etapa 1 do calendário do campeonato — dois consumidores da mesma seed
 * compartilhando stream, a classe de defeito que `deriveSeed` existe para
 * evitar (ver `src/engine/namespaces-seed.ts`). Rótulo próprio, stream
 * próprio: os dois sorteios são independentes mesmo partindo da mesma seed.
 *
 * 🔑 **Função pura.** Entra dataset + seed, sai um id de pista — sem I/O, sem
 * estado, sem relógio. É essa pureza que permite os 22 clientes de uma sala
 * derivarem, cada um sozinho, a MESMA pista a partir da MESMA `seedCorrida`
 * publicada no fim do draft: o servidor nunca precisa conhecer o dataset
 * (regra de arquitetura da Fase 3) nem calcular a pista ele mesmo — só
 * publicar o número.
 */

import { createRng, deriveSeed } from './rng';
import type { Dataset } from './dataset';

/** Rótulo do sub-stream de RNG do sorteio de pista da corrida online avulsa. */
export const ROTULO_SEED_PISTA = 'online:pista';

/**
 * Sorteia a pista da corrida online avulsa a partir da `seedCorrida` da sala.
 *
 * Lança erro nomeado se o dataset não tiver pista nenhuma — no espírito de
 * `etapasDoFormato` (`campeonato.ts`), que `calendarioSorteado` usa pela
 * mesma razão: sem a guarda, `shuffle([])[0]` devolveria `undefined` tipado
 * como `string`, e o erro só apareceria bem longe daqui, num `pistasById.get`
 * que falha sem dizer por quê.
 */
export function pistaSorteada(dataset: Dataset, seedCorrida: number): string {
  if (dataset.pistas.length === 0) {
    throw new Error('pistaSorteada: dataset não tem pista nenhuma');
  }
  const rng = createRng(deriveSeed(seedCorrida, ROTULO_SEED_PISTA));
  return rng.shuffle(dataset.pistas.map((pista) => pista.id))[0];
}
