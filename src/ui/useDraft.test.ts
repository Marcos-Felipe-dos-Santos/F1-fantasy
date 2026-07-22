/**
 * Smoke-test do fluxo de draft do modo Single, sem DOM (PR 1.7a). Exercita as
 * transições puras de `fluxo-draft.ts` — as mesmas que o hook `useDraft`
 * usa — simulando um jogador humano que sempre escolhe o primeiro slot
 * disponível.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { Dificuldade, EscolhaDraft } from '../engine/types';
import {
  aplicarEscolhaDoJogador,
  aplicarEscolhaHumano,
  ID_HUMANO,
  iniciarDraft,
  iniciarDraftSingle,
  seedDeTexto,
} from './fluxo-draft';
import { seedFromString } from '../engine/rng';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Joga as 5 rodadas de sorteio do humano, sempre escolhendo o primeiro slot disponível. */
function jogarSorteiosDoHumano(estadoInicial: ReturnType<typeof iniciarDraftSingle>) {
  let atual = estadoInicial;
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, ID_HUMANO);
    if (revelacao.fase !== 'sorteios') break;
    const slot = revelacao.slotsDisponiveis[0];
    const escolha: EscolhaDraft =
      slot === 'piloto'
        ? { tipo: 'piloto', pilotoId: (() => {
            const equipeAno = dataset.equipeAnos.find(
              (ea) => ea.equipe === revelacao.equipeAno.equipe && ea.ano === revelacao.equipeAno.ano,
            );
            if (!equipeAno) throw new Error('equipe/ano sorteada não encontrada no dataset de teste');
            return equipeAno.pilotos[0].id;
          })() }
        : { tipo: 'componente', slot };
    atual = aplicarEscolhaHumano(dataset, atual, escolha);
  }
  return atual;
}

describe('fluxo do draft modo Single (PR 1.7a)', () => {
  it('iniciarDraftSingle: seed "demo" gera 22 jogadores, humano na rodada 1', () => {
    const estado = iniciarDraftSingle(dataset, 'demo', 'facil');
    expect(estado.fase).toBe('sorteios');
    expect(estado.jogadores).toHaveLength(22);
    expect(estado.jogadores.find((j) => j.id === ID_HUMANO)?.tipo).toBe('humano');
    expect(estado.progresso[ID_HUMANO].rodada).toBe(1);
  });

  it('joga as 5 rodadas do humano e chega na fase peça, na vez dele, com 5 peças reveladas', () => {
    const inicial = iniciarDraftSingle(dataset, 'demo', 'facil');
    const apos5 = jogarSorteiosDoHumano(inicial);

    expect(apos5.fase).toBe('peca');
    const revelacao = revelarRodada(apos5, ID_HUMANO);
    expect(revelacao.fase).toBe('peca');
    if (revelacao.fase !== 'peca') throw new Error('esperado fase peca');
    expect(revelacao.suaVez).toBe(true);
    expect(revelacao.pecasReveladas).not.toBeNull();
    expect(revelacao.pecasReveladas).toHaveLength(5);
  });

  it('escolhe a primeira peça revelada e o draft conclui com 22 loadouts', () => {
    const inicial = iniciarDraftSingle(dataset, 'demo', 'facil');
    const apos5 = jogarSorteiosDoHumano(inicial);
    const revelacao = revelarRodada(apos5, ID_HUMANO);
    if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) {
      throw new Error('esperado fase peca com peças reveladas');
    }
    const final = aplicarEscolhaHumano(dataset, apos5, {
      tipo: 'peca',
      pecaId: revelacao.pecasReveladas[0],
    });

    expect(final.fase).toBe('concluido');
    expect(Object.keys(final.loadouts)).toHaveLength(22);
    expect(final.loadouts[ID_HUMANO]).toBeDefined();
  });

  it('determinismo: a mesma seed produz sempre os mesmos loadouts', () => {
    function jogarAteConcluir(seedTexto: string) {
      const inicial = iniciarDraftSingle(dataset, seedTexto, 'facil');
      const apos5 = jogarSorteiosDoHumano(inicial);
      const revelacao = revelarRodada(apos5, ID_HUMANO);
      if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) {
        throw new Error('esperado fase peca com peças reveladas');
      }
      return aplicarEscolhaHumano(dataset, apos5, {
        tipo: 'peca',
        pecaId: revelacao.pecasReveladas[0],
      });
    }

    const primeira = jogarAteConcluir('semente-fixa');
    const segunda = jogarAteConcluir('semente-fixa');

    expect(segunda.loadouts).toEqual(primeira.loadouts);
  });
});

describe('seedDeTexto', () => {
  it('texto só de dígitos vira o próprio número; texto livre passa por seedFromString', () => {
    expect(seedDeTexto('42')).toBe(42);
    expect(seedDeTexto('abc')).toBe(seedFromString('abc'));
    expect(seedDeTexto('senna1988')).toBe(seedFromString('senna1988'));
  });
});

/** Joga as 5 rodadas de sorteio de `jogadorId`, sempre escolhendo o primeiro slot disponível. */
function jogarSorteiosDoJogador(
  estadoInicial: ReturnType<typeof iniciarDraft>,
  jogadorId: string,
  aplicarEscolha: (state: ReturnType<typeof iniciarDraft>, escolha: EscolhaDraft) => ReturnType<typeof iniciarDraft>,
) {
  let atual = estadoInicial;
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, jogadorId);
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
    atual = aplicarEscolha(atual, escolha);
  }
  return atual;
}

describe('equivalência: fluxo genérico (N humanos) vs wrappers do modo Single (PR 2.1a)', () => {
  // 1 caso com dificuldade 'dificil' (correção N1 da revisão) — o resto
  // fica em 'facil' pra não duplicar cobertura à toa.
  const casos: [string, Dificuldade][] = [
    ['demo', 'facil'],
    ['semente-fixa', 'facil'],
    ['2024', 'facil'],
    ['demo', 'dificil'],
  ];

  it.each(casos)(
    'iniciarDraft com 1 humano "voce" == iniciarDraftSingle pra seed "%s" / dificuldade "%s"',
    (seedTexto, dificuldade) => {
      const generico = iniciarDraft(dataset, seedTexto, dificuldade, [{ id: 'voce', nome: 'Você' }]);
      const single = iniciarDraftSingle(dataset, seedTexto, dificuldade);

      expect(generico.sorteios).toEqual(single.sorteios);
      expect(generico.progresso).toEqual(single.progresso);
      expect(generico.ordemPeca).toEqual(single.ordemPeca);
      expect(generico.copiasRestantes).toEqual(single.copiasRestantes);
      expect(generico.fase).toBe(single.fase);
      expect(generico.indicePeca).toBe(single.indicePeca);
    },
  );

  it.each(casos)(
    'sequência de escolhas via aplicarEscolhaDoJogador == via aplicarEscolhaHumano pra seed "%s" / dificuldade "%s"',
    (seedTexto, dificuldade) => {
      const genericoInicial = iniciarDraft(dataset, seedTexto, dificuldade, [{ id: 'voce', nome: 'Você' }]);
      const singleInicial = iniciarDraftSingle(dataset, seedTexto, dificuldade);

      const genericoApos5 = jogarSorteiosDoJogador(genericoInicial, ID_HUMANO, (state, escolha) =>
        aplicarEscolhaDoJogador(dataset, state, ID_HUMANO, escolha),
      );
      const singleApos5 = jogarSorteiosDoJogador(singleInicial, ID_HUMANO, (state, escolha) =>
        aplicarEscolhaHumano(dataset, state, escolha),
      );

      expect(genericoApos5.fase).toBe('peca');
      expect(singleApos5.fase).toBe('peca');

      const revelacaoGenerico = revelarRodada(genericoApos5, ID_HUMANO);
      const revelacaoSingle = revelarRodada(singleApos5, ID_HUMANO);
      if (revelacaoGenerico.fase !== 'peca' || !revelacaoGenerico.pecasReveladas) {
        throw new Error('esperado fase peca com peças reveladas (genérico)');
      }
      if (revelacaoSingle.fase !== 'peca' || !revelacaoSingle.pecasReveladas) {
        throw new Error('esperado fase peca com peças reveladas (single)');
      }
      expect(revelacaoGenerico.pecasReveladas).toEqual(revelacaoSingle.pecasReveladas);

      const genericoFinal = aplicarEscolhaDoJogador(dataset, genericoApos5, ID_HUMANO, {
        tipo: 'peca',
        pecaId: revelacaoGenerico.pecasReveladas[0],
      });
      const singleFinal = aplicarEscolhaHumano(dataset, singleApos5, {
        tipo: 'peca',
        pecaId: revelacaoSingle.pecasReveladas[0],
      });

      expect(genericoFinal.sorteios).toEqual(singleFinal.sorteios);
      expect(genericoFinal.progresso).toEqual(singleFinal.progresso);
      expect(genericoFinal.ordemPeca).toEqual(singleFinal.ordemPeca);
      expect(genericoFinal.copiasRestantes).toEqual(singleFinal.copiasRestantes);
      expect(genericoFinal.fase).toBe(singleFinal.fase);
      expect(genericoFinal.indicePeca).toBe(singleFinal.indicePeca);
      expect(genericoFinal.loadouts).toEqual(singleFinal.loadouts);
    },
  );
});

describe('iniciarDraft com N>1 humanos (PR 2.1a — capacidade nova, modo Local usa no PR 2.1b)', () => {
  it('2 humanos + 20 bots totalizam 22 jogadores, nomes preservados, resto bots', () => {
    const estado = iniciarDraft(dataset, 'demo', 'facil', [
      { id: 'humano-1', nome: 'Ana' },
      { id: 'humano-2', nome: 'Beto' },
    ]);

    expect(estado.jogadores).toHaveLength(22);
    const humanos = estado.jogadores.filter((j) => j.tipo === 'humano');
    expect(humanos).toHaveLength(2);
    expect(humanos.map((j) => [j.id, j.nome])).toEqual([
      ['humano-1', 'Ana'],
      ['humano-2', 'Beto'],
    ]);
    expect(estado.jogadores.filter((j) => j.tipo === 'bot')).toHaveLength(20);
    expect(estado.sorteios['humano-1']).toHaveLength(5);
    expect(estado.sorteios['humano-2']).toHaveLength(5);
  });
});

describe('iniciarDraft: guardas de input em humanos (PR 2.1a, correção A2 da revisão)', () => {
  it('id de humano duplicado lança erro', () => {
    expect(() =>
      iniciarDraft(dataset, 'demo', 'facil', [
        { id: 'humano-1', nome: 'Ana' },
        { id: 'humano-1', nome: 'Ana de novo' },
      ]),
    ).toThrow();
  });

  it('id de humano vazio lança erro', () => {
    expect(() => iniciarDraft(dataset, 'demo', 'facil', [{ id: '' }])).toThrow();
  });

  it('id de humano só de espaços lança erro', () => {
    expect(() => iniciarDraft(dataset, 'demo', 'facil', [{ id: '   ' }])).toThrow();
  });

  it('0 humanos lança erro', () => {
    expect(() => iniciarDraft(dataset, 'demo', 'facil', [])).toThrow();
  });

  it('23 humanos (mais que QTD_JOGADORES) lança erro', () => {
    const humanos = Array.from({ length: 23 }, (_, i) => ({ id: `humano-${i + 1}` }));
    expect(() => iniciarDraft(dataset, 'demo', 'facil', humanos)).toThrow();
  });

  it('22 humanos (limite exato) é aceito — sem bots', () => {
    const humanos = Array.from({ length: 22 }, (_, i) => ({ id: `humano-${i + 1}` }));
    const estado = iniciarDraft(dataset, 'demo', 'facil', humanos);
    expect(estado.jogadores).toHaveLength(22);
    expect(estado.jogadores.every((j) => j.tipo === 'humano')).toBe(true);
  });
});

describe('dificuldade', () => {
  it('mesma seed com facil vs dificil gera perfis de bot distintos (o parâmetro flui até atribuirPerfis)', () => {
    const facil = iniciarDraftSingle(dataset, 'demo', 'facil');
    const dificil = iniciarDraftSingle(dataset, 'demo', 'dificil');
    const perfis = (estado: typeof facil) =>
      estado.jogadores.filter((j) => j.tipo === 'bot').map((j) => j.perfilBot);
    expect(perfis(dificil)).not.toEqual(perfis(facil));
    // dificil tem proporção maior de bots 'praGanhar' (GDD §12).
    const contarPraGanhar = (estado: typeof facil) =>
      estado.jogadores.filter((j) => j.perfilBot === 'praGanhar').length;
    expect(contarPraGanhar(dificil)).toBeGreaterThan(contarPraGanhar(facil));
  });
});
