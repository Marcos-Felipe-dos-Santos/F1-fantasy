/**
 * Ligação do som na tela (PR 3b). Sem jsdom (o projeto não tem), os efeitos do hook não rodam
 * aqui: o comportamento está em `controlador.test.ts` e `audio.test.ts`. Isto prende o que só a
 * ligação garante: o hook vive em `TelaCorrida`, ANTES do retorno da fase 'grid' (senão a ordem dos
 * hooks muda entre as fases), recebe a fase e as posições que a tela já calcula, e desmonta com
 * ela, que é como o "Acelerar" (que troca a fase sem passar pelo salto de relógio) cala os sons.
 */

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { atribuirPerfis } from '../../engine/bots';
import { criarDraft, resolverBots } from '../../engine/draft';
import type { Jogador } from '../../engine/types';
import { dataset } from '../dataset-app';
import { prepararCorrida } from '../fluxo-corrida';
import { TelaCorrida } from '../TelaCorrida';

vi.mock('../useTelaEstreita', () => ({ useTelaEstreita: () => false }));
vi.mock('../useMovimentoReduzido', () => ({ useMovimentoReduzido: () => false }));

const fonte = (arquivo: string) => readFileSync(`src/ui/sons/${arquivo}`, 'utf8');

describe('som na TelaCorrida', () => {
  it('o hook é chamado antes do retorno da fase grid, com a fase e as posições da tela', () => {
    const tela = fonte('../TelaCorrida.tsx');
    const chamada = tela.indexOf('useSomDaCorrida(');
    expect(chamada).toBeGreaterThan(-1);
    expect(chamada).toBeLessThan(tela.indexOf("if (fase === 'grid')"));
    const args = tela.slice(chamada, tela.indexOf(');', chamada));
    expect(args).toMatch(/\bfase\b/);
    expect(args).toMatch(/\bcarros\b/);
    expect(args).toMatch(/\bescala\b/);
    // Uma só fonte das posições: o hook não chama `replay.posicao` de novo.
    expect(fonte('./useSomDaCorrida.ts')).not.toMatch(/\.posicao\(/);
  });

  it('o hook encerra o controlador na limpeza do efeito (desmontar e trocar de fase)', () => {
    const hook = fonte('./useSomDaCorrida.ts');
    expect(hook).toMatch(/fase !== 'replay'/);
    expect(hook).toMatch(/return \(\) => \{[^}]*\.encerrar\(\)/);
  });

  it('o controle de som aparece no grid e no replay', () => {
    const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
      id: `j${String(i + 1).padStart(2, '0')}`,
      tipo: 'bot' as const,
    }));
    const estado0 = resolverBots(
      criarDraft(dataset, atribuirPerfis(base, 42, 'dificil'), 42),
      dataset,
    );
    const state = {
      ...estado0,
      jogadores: estado0.jogadores.map((j, i) =>
        i === 0 ? { ...j, tipo: 'humano' as const, nome: 'Você' } : j,
      ),
    };
    const { pista, grid, resultado } = prepararCorrida(dataset, state, 'pista-monza', 7);
    for (const fase of ['grid', 'replay'] as const) {
      const html = renderToStaticMarkup(
        createElement(TelaCorrida, {
          state,
          pista,
          grid,
          resultado,
          fase,
          tempoSimMs: 30000,
          onLargar: () => {},
          onAcelerar: () => {},
          velocidade: 'media',
          onVelocidade: () => {},
        }),
      );
      expect(html).toContain('controle-som');
      expect(html).toMatch(/aria-label="Volume"/);
      // Sem Web Audio (node), o controle fica visível e desabilitado, nunca some em silêncio.
      expect(html).toMatch(/Som indisponível/);
    }
  });
});
