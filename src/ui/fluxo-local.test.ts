/**
 * Testes do fluxo de turnos hotseat do modo Local (PR 2.1b), 100% sem DOM —
 * exercita `alvoHumano`/`decisaoLocal` sobre `DraftState`s reais produzidos
 * por `iniciarDraft`/`aplicarEscolhaDoJogador` (mesmas funções que o
 * `useDraft` usa), com o dataset real e seeds fixas.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaDoJogador, iniciarDraft } from './fluxo-draft';
import { alvoHumano, decisaoLocal } from './fluxo-local';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Joga 1 rodada de sorteio de `jogadorId` (primeiro slot disponível), devolvendo o novo estado. */
function jogarUmaRodada(state: DraftState, jogadorId: string): DraftState {
  const revelacao = revelarRodada(state, jogadorId);
  if (revelacao.fase !== 'sorteios') {
    throw new Error(`jogarUmaRodada: jogador "${jogadorId}" não está na fase sorteios`);
  }
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
  return aplicarEscolhaDoJogador(dataset, state, jogadorId, escolha);
}

/** Joga as 5 rodadas de sorteio de `jogadorId`. */
function jogarCincoRodadas(state: DraftState, jogadorId: string): DraftState {
  let atual = state;
  for (let i = 0; i < 5; i++) atual = jogarUmaRodada(atual, jogadorId);
  return atual;
}

/** Joga a rodada 6 (peça) de `jogadorId`, escolhendo a primeira peça revelada. */
function jogarPeca(state: DraftState, jogadorId: string): DraftState {
  const revelacao = revelarRodada(state, jogadorId);
  if (revelacao.fase !== 'peca' || !revelacao.suaVez || !revelacao.pecasReveladas) {
    throw new Error(`jogarPeca: não é a vez de "${jogadorId}" ou peças não reveladas`);
  }
  return aplicarEscolhaDoJogador(dataset, state, jogadorId, {
    tipo: 'peca',
    pecaId: revelacao.pecasReveladas[0],
  });
}

describe('alvoHumano / decisaoLocal — 2 humanos (PR 2.1b)', () => {
  const idsHumanos = ['humano-1', 'humano-2'];

  it('alvo inicial é humano-1, e decisaoLocal pede handoff (confirmadoId null)', () => {
    const estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));
    expect(alvoHumano(estado, idsHumanos)).toBe('humano-1');
    expect(decisaoLocal(estado, idsHumanos, null)).toEqual({ tipo: 'handoff', alvo: 'humano-1' });
  });

  it('depois de confirmar humano-1, decisaoLocal devolve "jogar" com jogadorId humano-1', () => {
    const estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));
    expect(decisaoLocal(estado, idsHumanos, 'humano-1')).toEqual({
      tipo: 'jogar',
      jogadorId: 'humano-1',
    });
  });

  it('alvo segue humano-1 até ele completar a rodada 5; então passa pra humano-2', () => {
    let estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));
    for (let i = 0; i < 4; i++) {
      estado = jogarUmaRodada(estado, 'humano-1');
      expect(alvoHumano(estado, idsHumanos)).toBe('humano-1');
    }
    // 5ª rodada de humano-1: agora sim o alvo deve virar humano-2.
    estado = jogarUmaRodada(estado, 'humano-1');
    expect(estado.fase).toBe('sorteios');
    expect(alvoHumano(estado, idsHumanos)).toBe('humano-2');
    expect(decisaoLocal(estado, idsHumanos, 'humano-1')).toEqual({ tipo: 'handoff', alvo: 'humano-2' });
  });

  it('quando ambos completam as 5 rodadas, fase vira "peca" e o alvo salta pro primeiro HUMANO de ordemPeca', () => {
    let estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));
    estado = jogarCincoRodadas(estado, 'humano-1');
    estado = jogarCincoRodadas(estado, 'humano-2');

    expect(estado.fase).toBe('peca');
    const primeiroHumanoEsperado = estado.ordemPeca.find((id) => idsHumanos.includes(id));
    expect(primeiroHumanoEsperado).toBeDefined();
    expect(alvoHumano(estado, idsHumanos)).toBe(primeiroHumanoEsperado);
  });

  it('sem handoff redundante: se quem fecha a rodada 5 já é o primeiro humano de ordemPeca, decisaoLocal com o confirmadoId corrente devolve "jogar" direto (seed "busca-1")', () => {
    let estado = iniciarDraft(dataset, 'busca-1', 'facil', idsHumanos.map((id) => ({ id })));
    estado = jogarCincoRodadas(estado, 'humano-1');
    estado = jogarCincoRodadas(estado, 'humano-2');

    expect(estado.fase).toBe('peca');
    // Confirmado nessa seed: humano-2 fecha a rodada 5 (última do bloco) e é
    // também o primeiro humano da ordemPeca — sem handoff no meio.
    expect(alvoHumano(estado, idsHumanos)).toBe('humano-2');
    expect(decisaoLocal(estado, idsHumanos, 'humano-2')).toEqual({
      tipo: 'jogar',
      jogadorId: 'humano-2',
    });
  });
  it('dentro da fase peça, depois de humano-1 escolher, o alvo passa pro próximo HUMANO de ordemPeca (handoff explícito)', () => {
    let estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));
    estado = jogarCincoRodadas(estado, 'humano-1');
    estado = jogarCincoRodadas(estado, 'humano-2');
    expect(estado.fase).toBe('peca');
    expect(alvoHumano(estado, idsHumanos)).toBe('humano-1');

    estado = jogarPeca(estado, 'humano-1');

    // humano-1 continua "confirmado" (segurava o aparelho) mas o alvo já é
    // outro humano — decisaoLocal precisa pedir handoff, sem efeito, sem
    // depender de nenhum estado de revelação.
    expect(estado.fase).toBe('peca');
    expect(alvoHumano(estado, idsHumanos)).toBe('humano-2');
    expect(decisaoLocal(estado, idsHumanos, 'humano-1')).toEqual({
      tipo: 'handoff',
      alvo: 'humano-2',
    });
  });
});

describe('decisaoLocal — fase concluída', () => {
  it('devolve "concluido" quando o draft termina', () => {
    const idsHumanos = ['humano-1', 'humano-2'];
    let estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));
    estado = jogarCincoRodadas(estado, 'humano-1');
    estado = jogarCincoRodadas(estado, 'humano-2');

    while (estado.fase === 'peca') {
      const alvo = alvoHumano(estado, idsHumanos);
      if (alvo === null) break; // só bots restantes; resolverBots já cuidou disso via aplicarEscolhaDoJogador
      estado = jogarPeca(estado, alvo);
    }

    expect(estado.fase).toBe('concluido');
    expect(alvoHumano(estado, idsHumanos)).toBeNull();
    expect(decisaoLocal(estado, idsHumanos, 'humano-2')).toEqual({ tipo: 'concluido' });
    expect(decisaoLocal(estado, idsHumanos, null)).toEqual({ tipo: 'concluido' });
  });
});

describe('decisaoLocal — handoff sempre que confirmadoId difere do alvo', () => {
  it('confirmadoId de outro jogador (não o alvo) sempre produz handoff, inclusive null', () => {
    const idsHumanos = ['humano-1', 'humano-2'];
    const estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));

    expect(decisaoLocal(estado, idsHumanos, null)).toEqual({ tipo: 'handoff', alvo: 'humano-1' });
    expect(decisaoLocal(estado, idsHumanos, 'humano-2')).toEqual({ tipo: 'handoff', alvo: 'humano-1' });
  });
});

describe('alvoHumano / decisaoLocal — 3 e 4 humanos: ordem de bloco respeitada', () => {
  it('3 humanos: humano-1 -> humano-2 -> humano-3', () => {
    const idsHumanos = ['humano-1', 'humano-2', 'humano-3'];
    let estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));

    expect(alvoHumano(estado, idsHumanos)).toBe('humano-1');
    estado = jogarCincoRodadas(estado, 'humano-1');
    expect(alvoHumano(estado, idsHumanos)).toBe('humano-2');
    estado = jogarCincoRodadas(estado, 'humano-2');
    expect(alvoHumano(estado, idsHumanos)).toBe('humano-3');
    estado = jogarCincoRodadas(estado, 'humano-3');
    expect(estado.fase).toBe('peca');
  });

  it('4 humanos: humano-1 -> humano-2 -> humano-3 -> humano-4', () => {
    const idsHumanos = ['humano-1', 'humano-2', 'humano-3', 'humano-4'];
    let estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));

    for (const id of idsHumanos) {
      expect(alvoHumano(estado, idsHumanos)).toBe(id);
      estado = jogarCincoRodadas(estado, id);
    }
    expect(estado.fase).toBe('peca');
  });
});

describe('anti-vazamento estrutural: decisaoLocal não consulta pecasReveladas', () => {
  it('funciona (sem lançar) com pecasReveladas forçado a null, mesmo na fase peça na vez de um humano', () => {
    const idsHumanos = ['humano-1', 'humano-2'];
    let estado = iniciarDraft(dataset, 'demo', 'facil', idsHumanos.map((id) => ({ id })));
    estado = jogarCincoRodadas(estado, 'humano-1');
    estado = jogarCincoRodadas(estado, 'humano-2');
    expect(estado.fase).toBe('peca');

    const estadoSemRevelacao: DraftState = { ...estado, pecasReveladas: null };
    const alvoOriginal = alvoHumano(estado, idsHumanos);
    const alvoSemRevelacao = alvoHumano(estadoSemRevelacao, idsHumanos);
    expect(alvoSemRevelacao).toBe(alvoOriginal);

    expect(() => decisaoLocal(estadoSemRevelacao, idsHumanos, null)).not.toThrow();
    expect(decisaoLocal(estadoSemRevelacao, idsHumanos, null)).toEqual(
      decisaoLocal(estado, idsHumanos, null),
    );
  });
});

describe('Single: humanos = ["voce"] nunca produz handoff em nenhum ponto de um draft completo', () => {
  it('confirmadoId inicial "voce" mantém "jogar"/"concluido" do início ao fim', () => {
    const idsHumanos = ['voce'];
    let estado = iniciarDraft(dataset, 'demo', 'facil', [{ id: 'voce' }]);

    // Rodadas 1-5.
    for (let i = 0; i < 5; i++) {
      const decisao = decisaoLocal(estado, idsHumanos, 'voce');
      expect(decisao.tipo).not.toBe('handoff');
      estado = jogarUmaRodada(estado, 'voce');
    }

    // Rodada 6 (peça).
    expect(estado.fase).toBe('peca');
    const decisaoPeca = decisaoLocal(estado, idsHumanos, 'voce');
    expect(decisaoPeca).toEqual({ tipo: 'jogar', jogadorId: 'voce' });
    estado = jogarPeca(estado, 'voce');

    expect(estado.fase).toBe('concluido');
    expect(decisaoLocal(estado, idsHumanos, 'voce')).toEqual({ tipo: 'concluido' });
  });
});
