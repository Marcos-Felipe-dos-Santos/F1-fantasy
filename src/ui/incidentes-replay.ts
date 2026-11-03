/**
 * Incidentes na pista e abandono no replay (PR 2d). Só apresentação: lê
 * `ResultadoCorrida` e nada aqui altera resultado, hash ou tempo de corrida.
 *
 * O MOTOR soma o custo do incidente na volta inteira, e o replay antigo o espalhava por
 * ela. Aqui o carro anda no ritmo limpo e fica parado `custoMs` num ponto da volta,
 * sorteado por hash `narracao:`. A volta fecha no mesmo instante do motor, então nenhuma
 * passagem pela linha muda: bandeirada, chegadas e fim do replay ficam iguais.
 *
 * TRECHO LIVRE: o ponto cai fora das janelas de pit (`linhaDoTempoDoPit`). Na volta do
 * pit o incidente vem antes da janela, na seguinte vem depois, e as janelas e as vagas
 * do PR 2c não mudam. Em `docs/pr2d-medicao.json` sobram pelo menos 0,65 de volta.
 *
 * ABANDONO: o motor conta a volta da quebra inteira, e o replay antigo a completava e
 * saltava para o meio da pista (797 de 800 DNFs). Aqui o carro para na fração sorteada
 * da última volta e o progresso congela ali.
 *
 * EFEITO: a parada dura de 29 a 1040 ms reais, conforme o custo e a velocidade. Por isso
 * fumaça, spray e guinada têm duração própria em tempo real (decisão do Marcos); a
 * parada segue sendo só o custo. O efeito é função do tempo simulado: `simPorReal` diz
 * quantos ms simulados cabem num ms real na velocidade do replay.
 */

import type { EventoCorrida, Pista, ResultadoCorrida } from '../engine/types';
import { acumularVoltas, type Ponto } from './fluxo-corrida';
import { sorteioDeLocal } from './narracao';
import { posicaoNaPista, type LinhaDoTempoPit, type PosicaoNoReplay } from './pit-replay';

/** O ponto fica longe da largada: quem vem do box e quem vai para ele ocupam as pontas. */
export const MARGEM_LOCAL = 0.08;
const FOLGA_DO_PIT = 0.02;
/** Decisão do Marcos: ~700 ms reais de efeito, em qualquer velocidade. */
export const DURACAO_EFEITO_MS = 700;
export const DURACAO_GUINADA_MS = 350;
const GUINADA_GRAUS = 35;

export interface IncidenteNoReplay {
  evento: EventoCorrida;
  /** Fração da volta `evento.volta` onde o carro para. */
  fracao: number;
  inicio: number;
  fim: number;
}

export interface AbandonoNoReplay {
  /** Ausente só em resultado sem o evento de quebra, como nas corridas sintéticas de teste. */
  evento?: EventoCorrida;
  volta: number;
  fracao: number;
  instante: number;
}

export interface LinhaDeIncidentes extends LinhaDoTempoPit {
  incidentes(jogadorId: string): readonly IncidenteNoReplay[];
  abandono(jogadorId: string): AbandonoNoReplay | undefined;
  abandonou(jogadorId: string, tempoSimMs: number): boolean;
  /** Parado na pista: num incidente, ou depois de abandonar. */
  parado(jogadorId: string, tempoSimMs: number): boolean;
}

/** O trecho da volta em que o carro anda no ritmo limpo, com as paradas dentro. */
interface Plano {
  volta: number;
  ta: number;
  tb: number;
  sa: number;
  sb: number;
  ritmo: number;
  incidentes: IncidenteNoReplay[];
}

const custaNaVolta = (e: EventoCorrida) => e.tipo === 'erro-piloto' || e.tipo === 'problema-tecnico';

function fracaoNoPlano(p: Plano, tempoSimMs: number): number {
  let fracao = p.sa;
  let desde = p.ta;
  for (const i of p.incidentes) {
    if (tempoSimMs < i.inicio) break;
    fracao = i.fracao;
    desde = i.fim;
    if (tempoSimMs < i.fim) return fracao;
  }
  return fracao + (tempoSimMs - desde) * p.ritmo;
}

/** O inverso de `fracaoNoPlano`: da parada para cima, soma o custo. */
function instanteNoPlano(p: Plano, fracao: number): number {
  let de = p.sa;
  let desde = p.ta;
  for (const i of p.incidentes) {
    if (fracao <= i.fracao) break;
    de = i.fracao;
    desde = i.fim;
  }
  return desde + (fracao - de) / p.ritmo;
}

export function linhaDeIncidentes(
  resultado: ResultadoCorrida,
  pista: Pick<Pista, 'id' | 'voltas'>,
  linha: LinhaDoTempoPit,
): LinhaDeIncidentes {
  const planos = new Map<string, Plano[]>();
  const abandonos = new Map<string, AbandonoNoReplay>();

  for (const { jogadorId, status } of resultado.classificacao) {
    const historico = resultado.historicoVoltas[jogadorId] ?? [];
    if (historico.length === 0) continue;
    const acumulado = acumularVoltas(historico);
    const paradas = linha.paradas(jogadorId);
    const doCarro = resultado.eventos.filter((e) => e.jogadorId === jogadorId);
    const voltaFinal = status === 'dnf' ? historico.length : null;
    const voltas = new Set(doCarro.filter(custaNaVolta).map((e) => e.volta));
    if (voltaFinal !== null) voltas.add(voltaFinal);

    const lista: Plano[] = [];
    for (const volta of [...voltas].sort((a, b) => a - b)) {
      const pitAntes = paradas.find((p) => p.volta === volta - 1);
      const pitNaVolta = paradas.find((p) => p.volta === volta);
      const ta = pitAntes?.fim ?? (volta >= 2 ? acumulado[volta - 2] : 0);
      const sa = pitAntes?.fracaoFim ?? 0;
      const tb = pitNaVolta?.inicio ?? acumulado[volta - 1];
      const sb = pitNaVolta?.fracaoInicio ?? 1;
      const de = Math.max(MARGEM_LOCAL, sa + FOLGA_DO_PIT);
      let ate = Math.min(1 - MARGEM_LOCAL, sb - FOLGA_DO_PIT);
      const daVolta = doCarro.filter((e) => e.volta === volta && custaNaVolta(e));
      const custo = daVolta.reduce((s, e) => s + e.custoMs, 0);
      // O ritmo limpo do trecho inteiro, antes de o abandono cortá-lo: o custo da volta
      // inteira sai das paradas, que caem todas antes do abandono.
      const ritmo = (sb - sa) / (tb - ta - custo);

      if (volta === voltaFinal) {
        const evento = doCarro.find((e) => e.volta === volta && e.tipo.startsWith('quebra'));
        const fracao = de + sorteioDeLocal(resultado.seed, 'abandono', jogadorId, volta, evento?.tipo ?? 'quebra') * (ate - de);
        const instante = ta + (fracao - sa) / ritmo + custo;
        abandonos.set(jogadorId, { evento, volta, fracao, instante });
        // Daqui em diante vale o abandono, que progresso, posição e `parado` olham antes do plano.
        ate = fracao - FOLGA_DO_PIT;
      }

      const sorteados = daVolta
        .map((evento) => ({
          evento,
          fracao: de + sorteioDeLocal(resultado.seed, 'local', jogadorId, volta, evento.tipo) * Math.max(0, ate - de),
        }))
        .sort((a, b) => a.fracao - b.fracao);
      let t = ta;
      let fracaoAtual = sa;
      const incidentes = sorteados.map(({ evento, fracao }): IncidenteNoReplay => {
        const inicio = t + (fracao - fracaoAtual) / ritmo;
        t = inicio + evento.custoMs;
        fracaoAtual = fracao;
        return { evento, fracao, inicio, fim: t };
      });
      lista.push({ volta, ta, tb, sa, sb, ritmo, incidentes });
    }
    planos.set(jogadorId, lista);
  }

  const planoEm = (jogadorId: string, tempoSimMs: number) =>
    planos.get(jogadorId)?.find((p) => tempoSimMs >= p.ta && tempoSimMs < p.tb);
  const abandonou = (jogadorId: string, tempoSimMs: number) => {
    const abandono = abandonos.get(jogadorId);
    return abandono !== undefined && tempoSimMs >= abandono.instante;
  };

  return {
    ...linha,
    incidentes: (jogadorId) => planos.get(jogadorId)?.flatMap((p) => p.incidentes) ?? [],
    abandono: (jogadorId) => abandonos.get(jogadorId),
    abandonou,
    parado(jogadorId, tempoSimMs) {
      return (
        abandonou(jogadorId, tempoSimMs) ||
        (planoEm(jogadorId, tempoSimMs)?.incidentes.some((i) => tempoSimMs >= i.inicio && tempoSimMs < i.fim) ?? false)
      );
    },

    progresso(jogadorId, historico, tempoSimMs) {
      const abandono = abandonos.get(jogadorId);
      if (abandono !== undefined && tempoSimMs >= abandono.instante) {
        return (abandono.volta - 1 + abandono.fracao) / pista.voltas;
      }
      const plano = planoEm(jogadorId, tempoSimMs);
      if (plano === undefined) return linha.progresso(jogadorId, historico, tempoSimMs);
      return (plano.volta - 1 + fracaoNoPlano(plano, tempoSimMs)) / pista.voltas;
    },

    instanteDoProgresso(jogadorId, historico, voltas) {
      const plano = planos
        .get(jogadorId)
        ?.find((p) => voltas >= p.volta - 1 + p.sa && voltas < p.volta - 1 + p.sb);
      if (plano === undefined) return linha.instanteDoProgresso(jogadorId, historico, voltas);
      return instanteNoPlano(plano, voltas - (plano.volta - 1));
    },

    posicao(jogadorId, historico, status, tempoSimMs, reduzido): PosicaoNoReplay {
      const abandono = abandonos.get(jogadorId);
      if (abandono !== undefined && tempoSimMs >= abandono.instante) return posicaoNaPista(pista.id, abandono.fracao);
      const plano = planoEm(jogadorId, tempoSimMs);
      if (plano === undefined) return linha.posicao(jogadorId, historico, status, tempoSimMs, reduzido);
      return posicaoNaPista(pista.id, fracaoNoPlano(plano, tempoSimMs));
    },
  };
}

export interface EfeitoNoReplay {
  chave: string;
  tipo: 'fumaca' | 'spray';
  ponto: Ponto;
  rumo: number;
  /** De 0 no início a 1 no fim do efeito. */
  idade: number;
}

/** Os efeitos vivos em `tempoSimMs`. `simPorReal` é o fator de `escalaReplay`. */
export function efeitosNoInstante(
  replay: Pick<LinhaDeIncidentes, 'incidentes' | 'abandono'>,
  resultado: ResultadoCorrida,
  pistaId: string,
  tempoSimMs: number,
  simPorReal: number,
): EfeitoNoReplay[] {
  const janela = DURACAO_EFEITO_MS * simPorReal;
  const efeitos: EfeitoNoReplay[] = [];
  const adicionar = (chave: string, tipo: EfeitoNoReplay['tipo'], fracao: number, inicio: number) => {
    if (tempoSimMs < inicio || tempoSimMs >= inicio + janela) return;
    const { ponto, rumo } = posicaoNaPista(pistaId, fracao);
    efeitos.push({ chave, tipo, ponto, rumo, idade: (tempoSimMs - inicio) / janela });
  };
  for (const { jogadorId } of resultado.classificacao) {
    for (const i of replay.incidentes(jogadorId)) {
      // Só o erro do piloto é molhado: a chuva não toca nas panes (ver `narracao.ts`).
      const molhado = resultado.chuva && i.evento.tipo === 'erro-piloto';
      adicionar(`${jogadorId}-${i.evento.volta}-${i.evento.tipo}`, molhado ? 'spray' : 'fumaca', i.fracao, i.inicio);
    }
    const abandono = replay.abandono(jogadorId);
    if (abandono !== undefined) adicionar(`${jogadorId}-abandono`, 'fumaca', abandono.fracao, abandono.instante);
  }
  return efeitos;
}

/** Graus somados ao rumo: um arco que volta a zero, só no erro do piloto. */
export function guinadaNoInstante(
  replay: Pick<LinhaDeIncidentes, 'incidentes'>,
  jogadorId: string,
  tempoSimMs: number,
  simPorReal: number,
): number {
  const janela = DURACAO_GUINADA_MS * simPorReal;
  const incidente = replay
    .incidentes(jogadorId)
    .find((i) => i.evento.tipo === 'erro-piloto' && tempoSimMs >= i.inicio && tempoSimMs < i.inicio + janela);
  if (incidente === undefined) return 0;
  // O lado sai do próprio ponto sorteado: determinístico, sem outro hash.
  const lado = Math.floor(incidente.fracao * 1000) % 2 === 0 ? 1 : -1;
  return lado * GUINADA_GRAUS * Math.sin((Math.PI * (tempoSimMs - incidente.inicio)) / janela);
}
