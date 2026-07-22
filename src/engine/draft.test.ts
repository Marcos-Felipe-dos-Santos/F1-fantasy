import { describe, expect, it } from 'vitest';
import { criarDataset, type Dataset } from './dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import type { DraftState, Jogador } from './types';
import { atribuirPerfis, escolherBot } from './bots';
import { aplicarEscolha, criarDraft, resolverBots } from './draft';
import { stateManual } from './draft-test-fixtures';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

function jogadoresBots(seed: number): Jogador[] {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `bot-${i + 1}`,
    tipo: 'bot' as const,
  }));
  return atribuirPerfis(base, seed, 'dificil');
}

/** Resolve todos os bots de uma lista, na ordem informada, dentro da fase sorteios. */
function resolverSorteiosNaOrdem(
  state: DraftState,
  ds: Dataset,
  ordemJogadorIds: string[],
): DraftState {
  let atual = state;
  while (atual.fase === 'sorteios') {
    const jogadorId = ordemJogadorIds.find((id) => atual.progresso[id].rodada <= 5);
    if (!jogadorId) break;
    const escolha = escolherBot(atual, ds, jogadorId);
    atual = aplicarEscolha(atual, ds, jogadorId, escolha);
  }
  return atual;
}

describe('draft completo com 22 bots (§3)', () => {
  it('chega em "concluido" com 22 loadouts válidos e sem peça com mais de 2 donos', () => {
    const jogadores = jogadoresBots(123);
    const inicial = criarDraft(dataset, jogadores, 123);
    const final = resolverBots(inicial, dataset);

    expect(final.fase).toBe('concluido');
    expect(Object.keys(final.loadouts)).toHaveLength(22);

    for (const jogador of jogadores) {
      const loadout = final.loadouts[jogador.id];
      expect(loadout).toBeDefined();
      expect(dataset.pilotosById.has(loadout.pilotoId)).toBe(true);
      expect(dataset.chassisById.has(loadout.chassiId)).toBe(true);
      expect(dataset.motoresById.has(loadout.motorId)).toBe(true);
      expect(dataset.estrategistasById.has(loadout.estrategistaId)).toBe(true);
      expect(dataset.pitsById.has(loadout.pitId)).toBe(true);
      expect(dataset.pecasById.has(loadout.pecaId)).toBe(true);
    }

    // Nenhum jogador repete equipe/ano nos seus 5 sorteios.
    for (const jogador of jogadores) {
      const pares = final.sorteios[jogador.id].map((r) => `${r.equipe}::${r.ano}`);
      expect(new Set(pares).size).toBe(5);
    }

    // Nenhuma peça com mais de 2 donos.
    const contagemPecas = new Map<string, number>();
    for (const loadout of Object.values(final.loadouts)) {
      contagemPecas.set(loadout.pecaId, (contagemPecas.get(loadout.pecaId) ?? 0) + 1);
    }
    for (const [, contagem] of contagemPecas) {
      expect(contagem).toBeLessThanOrEqual(2);
    }
  });

  it('determinismo: mesma seed produz loadouts idênticos; seeds diferentes produzem loadouts diferentes', () => {
    const jogadoresA = jogadoresBots(777);
    const finalA1 = resolverBots(criarDraft(dataset, jogadoresA, 777), dataset);
    const finalA2 = resolverBots(criarDraft(dataset, jogadoresA, 777), dataset);
    expect(finalA2.loadouts).toEqual(finalA1.loadouts);

    const jogadoresB = jogadoresBots(999);
    const finalB = resolverBots(criarDraft(dataset, jogadoresB, 999), dataset);
    expect(finalB.loadouts).not.toEqual(finalA1.loadouts);
  });

  it('isolamento de streams: resolver bots em ordens diferentes não muda o loadout de ninguém', () => {
    const jogadores = jogadoresBots(55);
    const seed = 55;

    const estadoBase = criarDraft(dataset, jogadores, seed);
    const ids = jogadores.map((j) => j.id);
    const idsInvertidos = [...ids].reverse();

    const finalOrdemNormal = resolverBots(
      resolverSorteiosNaOrdem(estadoBase, dataset, ids),
      dataset,
    );
    const finalOrdemInvertida = resolverBots(
      resolverSorteiosNaOrdem(estadoBase, dataset, idsInvertidos),
      dataset,
    );

    expect(finalOrdemInvertida.loadouts).toEqual(finalOrdemNormal.loadouts);
  });
});

describe('rodada 5 forçada (§3)', () => {
  it('escolher um slot diferente do único restante lança erro', () => {
    const jogador: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const state = stateManual(dataset, {
      jogadores: [jogador],
      progresso: {
        'bot-1': {
          rodada: 5,
          slots: {
            pilotoId: 'redbull-2023-piloto-verstappen',
            chassiId: 'redbull-2023-chassi',
            motorId: 'redbull-2023-motor',
            estrategistaId: 'redbull-2023-estrategista',
          },
        },
      },
    });

    expect(() => aplicarEscolha(state, dataset, 'bot-1', { tipo: 'componente', slot: 'chassi' })).toThrow(
      /já preenchido/,
    );
  });

  it('quando o slot restante é "piloto", o jogador ainda escolhe qual dos 2 titulares', () => {
    const jogador: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const state = stateManual(dataset, {
      jogadores: [jogador],
      progresso: {
        'bot-1': {
          rodada: 5,
          slots: {
            chassiId: 'redbull-2023-chassi',
            motorId: 'redbull-2023-motor',
            estrategistaId: 'redbull-2023-estrategista',
            pitId: 'redbull-2023-pit',
          },
        },
      },
    });

    const proximo = aplicarEscolha(state, dataset, 'bot-1', {
      tipo: 'piloto',
      pilotoId: 'redbull-2023-piloto-perez',
    });

    expect(proximo.progresso['bot-1'].slots.pilotoId).toBe('redbull-2023-piloto-perez');
    expect(proximo.progresso['bot-1'].rodada).toBe(6);
  });
});

describe('escolhas ilegais lançam erro descritivo', () => {
  it('slot já preenchido', () => {
    const jogador: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const state = stateManual(dataset, {
      jogadores: [jogador],
      progresso: { 'bot-1': { rodada: 2, slots: { chassiId: 'redbull-2023-chassi' } } },
    });
    expect(() => aplicarEscolha(state, dataset, 'bot-1', { tipo: 'componente', slot: 'chassi' })).toThrow(
      /já preenchido/,
    );
  });

  it('piloto de outra equipe/ano', () => {
    const jogador: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const state = stateManual(dataset, { jogadores: [jogador] });
    expect(() =>
      aplicarEscolha(state, dataset, 'bot-1', {
        tipo: 'piloto',
        pilotoId: 'ferrari-2004-piloto-schumacher',
      }),
    ).toThrow(/não pertence à equipe\/ano/);
  });

  it('peça não revelada', () => {
    const jogador: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const state = stateManual(dataset, {
      jogadores: [jogador],
      fase: 'peca',
      progresso: {
        'bot-1': {
          rodada: 6,
          slots: {
            pilotoId: 'redbull-2023-piloto-verstappen',
            chassiId: 'redbull-2023-chassi',
            motorId: 'redbull-2023-motor',
            estrategistaId: 'redbull-2023-estrategista',
            pitId: 'redbull-2023-pit',
          },
        },
      },
      pecasReveladas: ['peca-bargeboards', 'peca-mapa-motor', 'peca-composto-macio'],
    });
    expect(() =>
      aplicarEscolha(state, dataset, 'bot-1', { tipo: 'peca', pecaId: 'peca-ers-turbinado' }),
    ).toThrow(/não está entre as 5 reveladas/);
  });

  it('vez errada na fase peça', () => {
    const jogadorA: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const jogadorB: Jogador = { id: 'bot-2', tipo: 'bot', perfilBot: 'passeio' };
    const slotsCompletos = {
      pilotoId: 'redbull-2023-piloto-verstappen',
      chassiId: 'redbull-2023-chassi',
      motorId: 'redbull-2023-motor',
      estrategistaId: 'redbull-2023-estrategista',
      pitId: 'redbull-2023-pit',
    };
    const state = stateManual(dataset, {
      jogadores: [jogadorA, jogadorB],
      fase: 'peca',
      progresso: {
        'bot-1': { rodada: 6, slots: slotsCompletos },
        'bot-2': { rodada: 6, slots: slotsCompletos },
      },
      ordemPeca: ['bot-1', 'bot-2'],
      indicePeca: 0,
      pecasReveladas: ['peca-bargeboards', 'peca-mapa-motor'],
    });
    expect(() =>
      aplicarEscolha(state, dataset, 'bot-2', { tipo: 'peca', pecaId: 'peca-bargeboards' }),
    ).toThrow(/não é a vez/);
  });
});

describe('imutabilidade', () => {
  it('aplicarEscolha não muta o state de entrada (fase sorteios)', () => {
    const jogador: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const state = stateManual(dataset, { jogadores: [jogador] });
    const snapshot = JSON.stringify(state);

    aplicarEscolha(state, dataset, 'bot-1', { tipo: 'componente', slot: 'chassi' });

    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('aplicarEscolha não muta o state de entrada (fase peça — cobre copiasRestantes/loadouts/transição)', () => {
    const jogador: Jogador = { id: 'bot-1', tipo: 'bot', perfilBot: 'passeio' };
    const state = stateManual(dataset, {
      jogadores: [jogador],
      fase: 'peca',
      progresso: {
        'bot-1': {
          rodada: 6,
          slots: {
            pilotoId: 'redbull-2023-piloto-verstappen',
            chassiId: 'redbull-2023-chassi',
            motorId: 'redbull-2023-motor',
            estrategistaId: 'redbull-2023-estrategista',
            pitId: 'redbull-2023-pit',
          },
        },
      },
      pecasReveladas: ['peca-bargeboards', 'peca-mapa-motor', 'peca-composto-macio'],
    });
    const snapshot = JSON.stringify(state);

    const proximo = aplicarEscolha(state, dataset, 'bot-1', {
      tipo: 'peca',
      pecaId: 'peca-bargeboards',
    });

    // O state original permanece intocado...
    expect(JSON.stringify(state)).toBe(snapshot);
    // ...enquanto o novo state reflete a jogada (cópias decrementadas,
    // loadout registrado e transição pra "concluido" com só 1 jogador).
    expect(proximo.copiasRestantes['peca-bargeboards']).toBe(1);
    expect(proximo.loadouts['bot-1']?.pecaId).toBe('peca-bargeboards');
    expect(proximo.fase).toBe('concluido');
  });
});

describe('atribuirPerfis (§12)', () => {
  it('é determinístico por seed', () => {
    const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
      id: `bot-${i + 1}`,
      tipo: 'bot' as const,
    }));
    const perfis1 = atribuirPerfis(base, 321, 'dificil');
    const perfis2 = atribuirPerfis(base, 321, 'dificil');
    expect(perfis2).toEqual(perfis1);
  });

  it('proporção agregada sobre ~50 seeds fica perto de 20% (fácil) e 60% (difícil)', () => {
    const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
      id: `bot-${i + 1}`,
      tipo: 'bot' as const,
    }));

    function proporcaoPraGanhar(dificuldade: 'facil' | 'dificil'): number {
      let praGanhar = 0;
      let total = 0;
      for (let seed = 0; seed < 50; seed++) {
        const perfis = atribuirPerfis(base, seed, dificuldade);
        for (const jogador of perfis) {
          total++;
          if (jogador.perfilBot === 'praGanhar') praGanhar++;
        }
      }
      return praGanhar / total;
    }

    expect(proporcaoPraGanhar('facil')).toBeGreaterThan(0.12);
    expect(proporcaoPraGanhar('facil')).toBeLessThan(0.28);
    expect(proporcaoPraGanhar('dificil')).toBeGreaterThan(0.5);
    expect(proporcaoPraGanhar('dificil')).toBeLessThan(0.7);
  });
});

describe('humano no meio da fila da rodada 6 (§3, §12)', () => {
  it('resolverBots para no humano; peça escolhida por bot antes dele decrementa cópias e some das 5 dele', () => {
    const botA: Jogador = { id: 'bot-a', tipo: 'bot', perfilBot: 'passeio' };
    const humano: Jogador = { id: 'humano-1', tipo: 'humano' };
    const botB: Jogador = { id: 'bot-b', tipo: 'bot', perfilBot: 'passeio' };

    const slotsCompletos = {
      pilotoId: 'redbull-2023-piloto-verstappen',
      chassiId: 'redbull-2023-chassi',
      motorId: 'redbull-2023-motor',
      estrategistaId: 'redbull-2023-estrategista',
      pitId: 'redbull-2023-pit',
    };

    // Só 6 peças com cópias disponíveis (1 cada) — a que o bot-a vai pegar
    // ("peca-esgotavel") e mais 5 outras, o suficiente pra revelação de 5.
    const pecasComCopia = [
      'peca-esgotavel',
      'peca-bargeboards',
      'peca-mapa-motor',
      'peca-composto-macio',
      'peca-geometria-ajustada',
      'peca-asa-flexivel',
    ];
    // peca-esgotavel não existe no dataset real — troca por uma id real do catálogo.
    const idEsgotavel = 'peca-das-mercedes';
    const copiasRestantes = Object.fromEntries(dataset.pecas.map((p) => [p.id, 0]));
    for (const id of [idEsgotavel, ...pecasComCopia.slice(1)]) {
      copiasRestantes[id] = 1;
    }

    const state = stateManual(dataset, {
      jogadores: [botA, humano, botB],
      fase: 'peca',
      progresso: {
        'bot-a': { rodada: 6, slots: slotsCompletos },
        'humano-1': { rodada: 6, slots: slotsCompletos },
        'bot-b': { rodada: 6, slots: slotsCompletos },
      },
      ordemPeca: ['bot-a', 'humano-1', 'bot-b'],
      indicePeca: 0,
      pecasReveladas: [idEsgotavel, ...pecasComCopia.slice(1)],
      copiasRestantes,
    });

    // bot-a escolhe explicitamente a peça que vai esgotar (state artificial —
    // não depende da lógica de decisão do bot pra montar o cenário).
    const apósBotA = aplicarEscolha(state, dataset, 'bot-a', {
      tipo: 'peca',
      pecaId: idEsgotavel,
    });

    expect(apósBotA.copiasRestantes[idEsgotavel]).toBe(0);
    expect(apósBotA.pecasReveladas).not.toBeNull();
    expect(apósBotA.pecasReveladas).not.toContain(idEsgotavel);

    const final = resolverBots(apósBotA, dataset);

    expect(final.fase).toBe('peca');
    expect(final.indicePeca).toBe(1);
    expect(final.ordemPeca[final.indicePeca]).toBe('humano-1');
    expect(final.pecasReveladas).not.toBeNull();
    expect(final.pecasReveladas).not.toContain(idEsgotavel);
  });
});

describe('campo Jogador.nome (PR 2.1a — exibição, nunca entra na lógica de draft)', () => {
  it('nome atravessa criarDraft intacto em state.jogadores', () => {
    const jogadores: Jogador[] = [
      { id: 'humano-1', tipo: 'humano', nome: 'Ana' },
      { id: 'humano-2', tipo: 'humano', nome: 'Beto' },
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `bot-${i + 1}`,
        tipo: 'bot' as const,
        perfilBot: 'passeio' as const,
      })),
    ];
    const state = criarDraft(dataset, jogadores, 321);

    expect(state.jogadores.find((j) => j.id === 'humano-1')?.nome).toBe('Ana');
    expect(state.jogadores.find((j) => j.id === 'humano-2')?.nome).toBe('Beto');
    // bots sem nome seguem sem nome — o campo é opcional e não é inventado pela engine.
    expect(state.jogadores.find((j) => j.id === 'bot-1')?.nome).toBeUndefined();
  });
});
