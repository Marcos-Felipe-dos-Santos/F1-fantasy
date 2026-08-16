/**
 * A costura de `useCorrida` com a corrida online (PR 2/4) — o teste que pega
 * a classe de bug do 8.4.
 *
 * `useCorrida` não pode ser renderizado aqui: o projeto não tem
 * `@testing-library/react` nem ambiente jsdom (`vite.config.ts` roda os
 * testes em `environment: 'node'`). Por isso o alvo do teste é
 * `corridaInicial`, a função PURA que decide o que o `useState` de
 * `useCorrida` inicializa com — extraída de propósito pra ser testável sem
 * DOM. `useCorrida` só chama `useState(() => corridaInicial(...))`.
 *
 * 🔑 O teste de identidade usa `toBe`, não `toEqual`, e o motivo É a tese do
 * PR: duas preparações independentes e determinísticas da mesma corrida são
 * DEEP-EQUAL (mesma seed ⇒ mesmo resultado, bit a bit) — só a identidade de
 * referência distingue "usou o objeto que recebeu" de "preparou de novo e deu
 * igual". `toEqual` passaria mesmo se `corridaInicial` reimplementasse a
 * preparação por conta própria no modo `'pronta'`, que é exatamente o
 * segundo caminho que este PR existe pra proibir.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';
import { corridaInicial } from './useCorrida';
import { prepararCorrida } from './fluxo-corrida';
import { corridaDaSala } from './corrida-online';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Mesmo caminho de `fluxo-corrida.test.ts`: joga o humano até o draft concluir. */
function jogarDraftAteConcluir(seedTexto: string): DraftState {
  let atual = iniciarDraftSingle(dataset, seedTexto, 'facil');
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, ID_HUMANO);
    if (revelacao.fase !== 'sorteios') break;
    const slot = revelacao.slotsDisponiveis[0];
    const escolha: EscolhaDraft =
      slot === 'piloto'
        ? {
            tipo: 'piloto',
            pilotoId: (() => {
              const equipeAno = dataset.equipeAnos.find(
                (ea) => ea.equipe === revelacao.equipeAno.equipe && ea.ano === revelacao.equipeAno.ano,
              );
              if (!equipeAno) throw new Error('equipe/ano sorteada não encontrada no dataset de teste');
              return equipeAno.pilotos[0].id;
            })(),
          }
        : { tipo: 'componente', slot };
    atual = aplicarEscolhaHumano(dataset, atual, escolha);
  }
  const revelacao = revelarRodada(atual, ID_HUMANO);
  if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) {
    throw new Error('esperado fase peca com peças reveladas');
  }
  return aplicarEscolhaHumano(dataset, atual, { tipo: 'peca', pecaId: revelacao.pecasReveladas[0] });
}

describe('corridaInicial — a fonte única que useCorrida usa pra inicializar', () => {
  it('modo "pronta": devolve a MESMA REFERÊNCIA recebida, sem preparar de novo', () => {
    const state = jogarDraftAteConcluir('corrida-inicial-pronta');
    const corrida = corridaDaSala(dataset, state, 42);
    const inicial = corridaInicial(dataset, state, { modo: 'pronta', corrida });

    expect(inicial).toBe(corrida);
    expect(inicial.pista).toBe(corrida.pista);
    expect(inicial.grid).toBe(corrida.grid);
    expect(inicial.resultado).toBe(corrida.resultado);
  });

  it('modo "preparar": chama prepararCorrida (mesmo conteúdo, mas OUTRA referência de uma preparação alheia)', () => {
    const state = jogarDraftAteConcluir('corrida-inicial-preparar');
    const preparadaFora = prepararCorrida(dataset, state, 'pista-monza', 42);
    const inicial = corridaInicial(dataset, state, {
      modo: 'preparar',
      pistaId: 'pista-monza',
      seed: 42,
    });

    // Determinístico ⇒ mesmo conteúdo, mas é outra chamada ⇒ outra referência.
    // `corridaInicial` acrescenta `pistaId` (que `prepararCorrida` não devolve) —
    // é o único campo a mais, comparado explicitamente à parte.
    expect(inicial).toEqual({ pistaId: 'pista-monza', ...preparadaFora });
    expect(inicial).not.toBe(preparadaFora);
  });

  it('modo "preparar" sem seed usa a seed do draft (default de prepararCorrida)', () => {
    const state = jogarDraftAteConcluir('corrida-inicial-default');
    const inicial = corridaInicial(dataset, state, { modo: 'preparar', pistaId: 'pista-interlagos' });
    const esperado = prepararCorrida(dataset, state, 'pista-interlagos');
    expect(inicial).toEqual({ pistaId: 'pista-interlagos', ...esperado });
  });
});
