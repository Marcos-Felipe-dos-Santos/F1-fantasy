/**
 * Punição cumprida no box (PR 2f). Só apresentação: lê `ResultadoCorrida` e nada aqui
 * altera resultado, hash ou tempo de corrida.
 *
 * O MOTOR soma a punição no tempo total e não diz quando ela saiu: o evento vem com
 * `volta` = última, e a rolagem é anterior à largada. O replay antigo a somava na
 * passagem pela linha, com o selo `+Xs`. Aqui ela é cumprida como na F1 (decisão do
 * Marcos, 2026-11-02): no último pit do carro, X s a mais parado na vaga. Dali em
 * diante o carro é a corrida de antes atrasada X, e cruza a linha no tempo total oficial.
 *
 * PIT DA PUNIÇÃO (decisão do Marcos, 2026-11-03): o último pit visível pela chegada
 * ANTES da punição. Quem escolhe é `replayDaCorrida`; sem pit, fica o selo (reserva:
 * 0 em 1000 corridas, `docs/pr2f-medicao.json`).
 *
 * INFRAÇÃO: instante sorteado por hash `narracao:punicao:` entre o pit anterior (ou a
 * largada) e o início do pit da punição, que fica sendo o pit seguinte à infração. Em
 * `docs/pr2f-medicao.json` esse trecho tem pelo menos 301 s simulados.
 *
 * RELÓGIO: a camada só remapeia o tempo do punido. Antes da partida, igual; na espera,
 * o instante da chegada à vaga, onde a linha de baixo já o tem parado; depois, `t − X`.
 * A vaga presa na espera é de `linhaDoTempoDoPit` (`EsperaNaVaga`), que a recebe de
 * `replayDaCorrida`: aqui ninguém mais muda.
 */

import type { EventoCorrida, Pista, ResultadoCorrida } from '../engine/types';
import type { IncidenteNoReplay, LinhaDeIncidentes } from './incidentes-replay';
import { sorteioDeLocal } from './narracao';
import type { ParadaNoReplay } from './pit-replay';

/** A infração não sai colada na largada nem na entrada do box. */
const MARGEM_INFRACAO = 0.1;

export interface PunicaoACumprir {
  evento: EventoCorrida;
  /** Volta do pit em que é cumprida. */
  volta: number;
}

export interface PunicaoNoReplay {
  evento: EventoCorrida;
  ms: number;
  /** A parada da punição, já com a espera: partida, retorno e fim X s depois. */
  parada: ParadaNoReplay;
  /** A partida de antes: a espera vai daqui até `inicio + ms`. */
  inicio: number;
  /** Quando a infração sai, para o ticker. */
  infracao: number;
  /** Volta do carro na infração. */
  voltaDaInfracao: number;
}

export interface LinhaComPunicoes extends LinhaDeIncidentes {
  punicao(jogadorId: string): PunicaoNoReplay | undefined;
}

export function linhaComPunicoes(
  resultado: ResultadoCorrida,
  pista: Pick<Pista, 'voltas'>,
  base: LinhaDeIncidentes,
  cumprir: ReadonlyMap<string, PunicaoACumprir>,
): LinhaComPunicoes {
  const punicoes = new Map<string, PunicaoNoReplay>();
  /** Chegada à vaga, de antes: onde a linha de baixo tem o carro parado. */
  const naVaga = new Map<string, number>();
  const paradas = new Map<string, readonly ParadaNoReplay[]>();
  const incidentes = new Map<string, readonly IncidenteNoReplay[]>();

  for (const [jogadorId, { evento, volta }] of cumprir) {
    const doCarro = base.paradas(jogadorId);
    const indice = doCarro.findIndex((p) => p.volta === volta);
    if (indice === -1) continue;
    const p = doCarro[indice];
    const ms = evento.custoMs;
    const desloca = (t: number) => (t >= p.partida ? t + ms : t);
    const deslocada = (q: ParadaNoReplay): ParadaNoReplay => ({
      volta: q.volta,
      vaga: q.vaga,
      inicio: desloca(q.inicio),
      entrada: desloca(q.entrada),
      chegada: desloca(q.chegada),
      partida: desloca(q.partida),
      retorno: desloca(q.retorno),
      fim: desloca(q.fim),
      fracaoInicio: q.fracaoInicio,
      fracaoFim: q.fracaoFim,
      boxCheio: q.boxCheio,
    });
    paradas.set(jogadorId, doCarro.map(deslocada));
    incidentes.set(
      jogadorId,
      base.incidentes(jogadorId).map((i) => ({ ...i, inicio: desloca(i.inicio), fim: desloca(i.fim) })),
    );

    const de = doCarro[indice - 1]?.fim ?? 0;
    const sorteio = sorteioDeLocal(resultado.seed, 'punicao', jogadorId, volta, evento.tipo);
    const infracao = de + (MARGEM_INFRACAO + (1 - 2 * MARGEM_INFRACAO) * sorteio) * (p.inicio - de);
    const progresso = base.progresso(jogadorId, resultado.historicoVoltas[jogadorId], infracao);
    punicoes.set(jogadorId, {
      evento,
      ms,
      parada: deslocada(p),
      inicio: p.partida,
      infracao,
      voltaDaInfracao: Math.min(pista.voltas, Math.floor(progresso * pista.voltas) + 1),
    });
    naVaga.set(jogadorId, p.chegada);
  }

  /** O instante da linha de baixo: na espera, parado na vaga. */
  const relogio = (jogadorId: string, tempoSimMs: number) => {
    const punicao = punicoes.get(jogadorId);
    if (punicao === undefined || tempoSimMs < punicao.inicio) return tempoSimMs;
    return tempoSimMs < punicao.inicio + punicao.ms ? (naVaga.get(jogadorId) ?? punicao.inicio) : tempoSimMs - punicao.ms;
  };

  return {
    ...base,
    punicao: (jogadorId) => punicoes.get(jogadorId),
    paradas: (jogadorId) => paradas.get(jogadorId) ?? base.paradas(jogadorId),
    incidentes: (jogadorId) => incidentes.get(jogadorId) ?? base.incidentes(jogadorId),
    abandonou: (jogadorId, tempoSimMs) => base.abandonou(jogadorId, relogio(jogadorId, tempoSimMs)),
    parado: (jogadorId, tempoSimMs) => base.parado(jogadorId, relogio(jogadorId, tempoSimMs)),
    noBox: (jogadorId, tempoSimMs) => base.noBox(jogadorId, relogio(jogadorId, tempoSimMs)),
    progresso: (jogadorId, historico, tempoSimMs) => base.progresso(jogadorId, historico, relogio(jogadorId, tempoSimMs)),
    instanteDoProgresso(jogadorId, historico, voltas) {
      const instante = base.instanteDoProgresso(jogadorId, historico, voltas);
      const punicao = punicoes.get(jogadorId);
      return punicao !== undefined && instante >= punicao.inicio ? instante + punicao.ms : instante;
    },
    posicao: (jogadorId, historico, status, tempoSimMs, reduzido) =>
      base.posicao(jogadorId, historico, status, relogio(jogadorId, tempoSimMs), reduzido),
  };
}
