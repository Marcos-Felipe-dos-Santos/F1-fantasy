/**
 * `corridaDaSala` (PR 2/4 de "corrida online") — a fonte única que
 * `useSalaOnline` vai chamar. É esta função que faz os 22 clientes de uma
 * sala derivarem, cada um sozinho, a MESMA corrida a partir da MESMA
 * `(draft, seedCorrida)`.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';
import { corridaDaSala } from './corrida-online';
import { pistaSorteada } from '../engine/pista-sorteada';

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

describe('corridaDaSala', () => {
  it('é a fonte única e determinística: mesma (draft, seedCorrida) ⇒ mesma pista e mesmo resultado', () => {
    const draft1 = jogarDraftAteConcluir('corrida-sala-det');
    const draft2 = jogarDraftAteConcluir('corrida-sala-det');

    const a = corridaDaSala(dataset, draft1, 12345);
    const b = corridaDaSala(dataset, draft2, 12345);

    expect(a.pistaId).toBe(b.pistaId);
    expect(a.resultado.classificacao).toEqual(b.resultado.classificacao);
    expect(a.grid).toEqual(b.grid);
  });

  it('deriva a pista com pistaSorteada (não outro sorteio próprio)', () => {
    const draft = jogarDraftAteConcluir('corrida-sala-pista');
    const corrida = corridaDaSala(dataset, draft, 777);
    expect(corrida.pistaId).toBe(pistaSorteada(dataset, 777));
    expect(corrida.pista.id).toBe(corrida.pistaId);
  });

  it('seedCorrida diferente ⇒ resultado diferente (a seed está sendo usada)', () => {
    const draft = jogarDraftAteConcluir('corrida-sala-seed');
    const a = corridaDaSala(dataset, draft, 1);
    const b = corridaDaSala(dataset, draft, 2);

    // Anti-vacuidade fraca: ou a pista muda, ou (mesma pista) a classificação muda.
    const diferente =
      a.pistaId !== b.pistaId || JSON.stringify(a.resultado.classificacao) !== JSON.stringify(b.resultado.classificacao);
    expect(diferente).toBe(true);
  });
});
