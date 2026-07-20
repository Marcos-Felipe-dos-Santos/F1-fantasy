/**
 * Golden snapshot do modo Single (PR 2.1a, correção A1 da revisão): valores
 * concretos hardcoded, extraídos da `main` (pré-PR, commit a6eaecc) rodando
 * `iniciarDraftSingle(dataset, 'demo', 'dificil')` — não derivados do código
 * novo deste PR. Objetivo: provar que a generalização pra N humanos não
 * mudou nada do caminho Single, sem depender de comparar o novo código
 * genérico contra o próprio wrapper que ele agora alimenta (o teste de
 * equivalência em `useDraft.test.ts` prova só que `nome` é inerte; este
 * arquivo prova a estabilidade contra o comportamento pré-existente).
 *
 * Processo de extração (documentado pro `senior-reviewer`/dev conferirem):
 * `git worktree add <tmp> main` + junction de `node_modules` + script
 * temporário que chama `iniciarDraftSingle` e imprime os valores em JSON;
 * worktree removido depois. Ver relatório do PR pro passo a passo completo.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { iniciarDraftSingle } from './fluxo-draft';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** ordemPeca completa (22 ids), extraída da main pra seed 'demo' + dificuldade 'dificil'. */
const ORDEM_PECA_GOLDEN = [
  'bot-11',
  'bot-19',
  'bot-04',
  'bot-13',
  'bot-18',
  'voce',
  'bot-21',
  'bot-07',
  'bot-01',
  'bot-06',
  'bot-16',
  'bot-05',
  'bot-14',
  'bot-12',
  'bot-10',
  'bot-09',
  'bot-02',
  'bot-08',
  'bot-03',
  'bot-15',
  'bot-20',
  'bot-17',
];

/** Perfil de 3 bots nomeados, mesma seed/dificuldade. */
const PERFIS_GOLDEN: Record<string, 'passeio' | 'praGanhar'> = {
  'bot-01': 'passeio',
  'bot-11': 'passeio',
  'bot-21': 'passeio',
};

/** Os 5 sorteios de equipe/ano do humano 'voce', mesma seed/dificuldade. */
const SORTEIOS_VOCE_GOLDEN = [
  { equipe: 'Benetton', ano: 1993 },
  { equipe: 'Williams', ano: 2023 },
  { equipe: 'McLaren', ano: 2004 },
  { equipe: 'Sauber', ano: 2004 },
  { equipe: 'Williams', ano: 2004 },
];

describe('golden snapshot: iniciarDraftSingle("demo", "dificil") == main pré-PR 2.1a', () => {
  it('ordemPeca, perfis de bot e sorteios do humano batem com os valores extraídos da main', () => {
    const estado = iniciarDraftSingle(dataset, 'demo', 'dificil');

    expect(estado.ordemPeca).toEqual(ORDEM_PECA_GOLDEN);

    for (const [botId, perfilEsperado] of Object.entries(PERFIS_GOLDEN)) {
      const bot = estado.jogadores.find((j) => j.id === botId);
      expect(bot?.perfilBot).toBe(perfilEsperado);
    }

    expect(estado.sorteios['voce']).toEqual(SORTEIOS_VOCE_GOLDEN);
  });
});
