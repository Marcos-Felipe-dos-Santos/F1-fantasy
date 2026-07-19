/**
 * Smoke-test do fluxo de draft do modo Single, sem DOM (PR 1.7a). Exercita as
 * transições puras de `fluxo-draft.ts` — as mesmas que o hook `useDraft`
 * usa — simulando um jogador humano que sempre escolhe o primeiro slot
 * disponível.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle, seedDeTexto } from './fluxo-draft';
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
