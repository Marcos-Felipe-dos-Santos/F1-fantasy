/**
 * `velRef` é calculado UMA vez por corrida e carro (obrigação do PR 3a): o replay inteiro é percorrido
 * só na primeira chamada. Arquivo próprio porque o `vi.mock` vale para o arquivo todo.
 */

import { describe, expect, it, vi } from 'vitest';
import { atribuirPerfis } from '../../engine/bots';
import { criarDraft, resolverBots } from '../../engine/draft';
import type { Jogador } from '../../engine/types';
import { dataset } from '../dataset-app';
import { replayDaCorrida } from '../fim-da-corrida';
import { prepararCorrida } from '../fluxo-corrida';
import { velocidadeDeReferencia } from './controlador';

vi.mock('../fim-da-corrida', async (original) => {
  const m = await original<typeof import('../fim-da-corrida')>();
  return { ...m, replayDaCorrida: vi.fn(m.replayDaCorrida) };
});

describe('velocidadeDeReferencia', () => {
  it('percorre o replay só na primeira chamada para o mesmo carro', () => {
    const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
      id: `j${String(i + 1).padStart(2, '0')}`,
      tipo: 'bot' as const,
    }));
    const estado = resolverBots(
      criarDraft(dataset, atribuirPerfis(base, 5, 'dificil'), 5),
      dataset,
    );
    const { resultado, pista } = prepararCorrida(dataset, estado, 'pista-spa', 5);
    vi.mocked(replayDaCorrida).mockClear();
    const v = velocidadeDeReferencia(resultado, pista, 'j01');
    expect(v).toBeGreaterThan(0);
    expect(velocidadeDeReferencia(resultado, pista, 'j01')).toBe(v);
    expect(vi.mocked(replayDaCorrida)).toHaveBeenCalledTimes(1);
    velocidadeDeReferencia(resultado, pista, 'j02');
    expect(vi.mocked(replayDaCorrida)).toHaveBeenCalledTimes(2);
  });
});
