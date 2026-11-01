/**
 * Elo testado entre os dados do replay e o que a TELA desenha (PR 2a). Mesmo
 * padrão de `pista-camadas-render.test.ts`: `renderToStaticMarkup`, sem jsdom,
 * com `createElement` em vez de JSX.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDraft, resolverBots } from '../engine/draft';
import type { DraftState, Jogador } from '../engine/types';
import { dataset } from './dataset-app';
import { prepararCorrida } from './fluxo-corrida';
import { TelaCorrida } from './TelaCorrida';

function estadoComHumano(): DraftState {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const estado = resolverBots(criarDraft(dataset, atribuirPerfis(base, 42, 'dificil'), 42), dataset);
  return {
    ...estado,
    jogadores: estado.jogadores.map((j, i) => (i === 0 ? { ...j, tipo: 'humano' as const, nome: 'Você' } : j)),
  };
}

const estado = estadoComHumano();

function corridaCom(chuva: boolean, pistaId = 'pista-spa') {
  for (let seed = 1; seed < 200; seed++) {
    const corrida = prepararCorrida(dataset, estado, pistaId, seed);
    if (corrida.resultado.chuva === chuva) return corrida;
  }
  throw new Error('sem seed com esse clima');
}

function tela(corrida: ReturnType<typeof corridaCom>, tempoSimMs: number, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(TelaCorrida, {
      state: estado,
      pista: corrida.pista,
      grid: corrida.grid,
      resultado: corrida.resultado,
      fase: 'replay',
      tempoSimMs,
      onLargar: () => undefined,
      onAcelerar: () => undefined,
      velocidade: 'media',
      onVelocidade: () => undefined,
      ...extra,
    }),
  );
}

describe('painel: diferença para o líder', () => {
  it('toda linha traz a coluna, com o líder identificado', () => {
    const corrida = corridaCom(false);
    const html = tela(corrida, corrida.resultado.classificacao[0].tempoTotal / 2);
    const celulas = [...html.matchAll(/classificacao-ao-vivo__diferenca">([^<]*)</g)].map((m) => m[1]);
    expect(celulas.length).toBe(22);
    expect(celulas[0]).toBe('Líder');
    expect(celulas.slice(1).filter((c) => /^\+\d+,\ds$|^\+\d+ V$/.test(c)).length).toBeGreaterThan(15);
  });
});
