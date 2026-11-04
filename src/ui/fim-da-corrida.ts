/**
 * Fim da corrida no replay (PR 2e). Só apresentação: lê `ResultadoCorrida` e nada
 * aqui altera resultado, hash ou tempo de corrida.
 *
 * A engine dá as N voltas a todo carro que termina, sem bandeirada. O replay
 * corta essa história como na F1: o primeiro a completar as voltas NA PISTA recebe
 * a bandeirada, e cada carro termina na passagem seguinte pela linha. O retardatário
 * fica com uma volta a menos na tela e o resto do histórico dele nunca aparece. O
 * DNF fica de fora: segue a própria história até quebrar.
 *
 * BANDEIRADA NA PISTA: `classificacao[0].tempoTotal` traz a punição, que
 * `historicoVoltas` não tem. ~~Em 28 de 1000 corridas o primeiro a cruzar nem é o
 * vencedor oficial (`docs/pr2e-medicao.json`).~~ Desde o PR 2f a punição é cumprida
 * no box (`punicao-replay.ts`) e o punido cruza a linha no tempo total oficial: o
 * primeiro a cruzar só não é o vencedor oficial quando a punição fica no selo.
 *
 * PIT DA PUNIÇÃO (decisão do Marcos, 2026-11-03): o último pit visível pela chegada
 * ANTES da punição. A ordem importa: a punição cumprida move a bandeirada, e um
 * retardatário pode ganhar uma volta na tela (2 em 1000 corridas, aceito pelo Marcos).
 * Por isso as chegadas são contadas duas vezes, sem e com a punição.
 *
 * PASSAGEM PELA LINHA: vem do progresso do MAPA (`instanteDoProgresso`), não da soma
 * do histórico. O box cruza a linha, e na volta do pit as duas diferem.
 *
 * VOLTA LENTA (decisão do Marcos, 2026-11-02): depois da linha, o carro desacelera a
 * 60% da velocidade da pista. O perfil é UM SÓ, função do tempo desde a passagem do
 * próprio carro pela linha, e é isso que impede a ultrapassagem: dois carros no mesmo
 * perfil mantêm a diferença de tempo. Sem box depois da linha: a entrada fica a 84-99% da volta, e em 1000
 * corridas ninguém chegaria à vaga antes do fim do replay.
 *
 * BANDEIRADA NO BOX: o carro conta como chegado ao cruzar a linha, e só entra na
 * volta lenta quando a parada termina (1 caso em 1000 corridas). Ele sai na frente
 * ou atrás de quem já passou: é a única exceção ao perfil único.
 */

import type { Pista, ResultadoCorrida } from '../engine/types';
import { acumularVoltas, lutDoTracado } from './fluxo-corrida';
import { linhaDeIncidentes, type LinhaDeIncidentes } from './incidentes-replay';
import { DISTANCIA_RAMPA, linhaDoTempoDoPit, posicaoNaPista, type EsperaNaVaga } from './pit-replay';
import { linhaComPunicoes, type LinhaComPunicoes, type PunicaoACumprir } from './punicao-replay';
import { tracadoSuavizado } from './suavizacao';

/** Fração da velocidade de corrida da pista (decisão do Marcos). */
export const RAZAO_VOLTA_LENTA = 0.6;

export interface ChegadaDoCarro {
  /** Voltas que o carro fez na tela: uma a menos para o retardatário. */
  voltas: number;
  /** Quando ele cruzou a linha depois da bandeirada. */
  instante: number;
  /** Quando a volta lenta começa: `instante`, ou o fim da parada se cruzou no box. */
  inicioLenta: number;
  /** Fração da volta em que a volta lenta começa. */
  fracaoInicial: number;
}

export interface ReplayDaCorrida extends LinhaComPunicoes {
  /** Quando o primeiro completa as voltas na pista. `Infinity` se ninguém terminou. */
  bandeirada: number;
  /** Onde o replay para: a passagem do último pela linha. */
  fim: number;
  chegada(jogadorId: string): ChegadaDoCarro | undefined;
  chegou(jogadorId: string, tempoSimMs: number): boolean;
  /** Punição somada na chegada, com o selo `+Xs`: só a de quem não tem pit para cumpri-la (PR 2f). */
  punicaoMs(jogadorId: string): number;
}

/** Arco percorrido `decorrido` ms depois da linha: rampa até a velocidade lenta, depois constante. */
function distanciaNaVoltaLenta(decorrido: number, velocidade: number): number {
  const lenta = RAZAO_VOLTA_LENTA * velocidade;
  const rampa = (2 * DISTANCIA_RAMPA) / (velocidade + lenta);
  if (decorrido >= rampa) return DISTANCIA_RAMPA + lenta * (decorrido - rampa);
  return velocidade * decorrido + (((lenta - velocidade) / rampa) * decorrido * decorrido) / 2;
}

function chegadaDoCarro(
  linha: LinhaDeIncidentes,
  jogadorId: string,
  historico: number[],
  bandeirada: number,
): ChegadaDoCarro {
  // Termina: quem completa as voltas tem soma >= bandeirada, e a última passagem é a soma.
  let voltas = 1;
  let instante = linha.instanteDoProgresso(jogadorId, historico, voltas);
  while (instante < bandeirada) {
    voltas++;
    // Uma passagem que nunca alcança a bandeirada penduraria a aba (revisão do PR 2f).
    if (voltas > historico.length) throw new Error(`replay: ${jogadorId} não alcança a bandeirada`);
    instante = linha.instanteDoProgresso(jogadorId, historico, voltas);
  }
  const parada = linha.paradas(jogadorId).find((p) => instante >= p.inicio && instante < p.fim);
  if (parada === undefined) return { voltas, instante, inicioLenta: instante, fracaoInicial: 0 };
  return {
    voltas,
    instante,
    inicioLenta: parada.fim,
    fracaoInicial:
      linha.posicao(jogadorId, historico, 'terminou', parada.fim, false).fracaoNaPista ?? 0,
  };
}

const CACHE_REPLAY = new WeakMap<ResultadoCorrida, { pistaId: string; replay: ReplayDaCorrida }>();

/** Memoizado pela identidade de `resultado`, como `linhaDoTempoDoPit`: a tela pede isto a cada frame. */
export function replayDaCorrida(
  resultado: ResultadoCorrida,
  pista: Pick<Pista, 'id' | 'voltas' | 'tempoBaseMs'>,
): ReplayDaCorrida {
  const cache = CACHE_REPLAY.get(resultado);
  if (cache !== undefined && cache.pistaId === pista.id) return cache.replay;

  const semPunicao = linhaDeIncidentes(resultado, pista, linhaDoTempoDoPit(resultado, pista));
  const terminaram = resultado.classificacao.filter((c) => c.status === 'terminou');
  const somaDe = (id: string) => acumularVoltas(resultado.historicoVoltas[id]).at(-1) ?? 0;
  const chegadasEm = (linha: LinhaDeIncidentes, bandeirada: number) =>
    new Map(
      terminaram.map((c) => [
        c.jogadorId,
        chegadaDoCarro(linha, c.jogadorId, resultado.historicoVoltas[c.jogadorId], bandeirada),
      ]),
    );
  const chegadasAntes = chegadasEm(semPunicao, Math.min(...terminaram.map((c) => somaDe(c.jogadorId))));

  const cumprir = new Map<string, PunicaoACumprir>();
  const selos = new Map<string, number>();
  for (const e of resultado.eventos) {
    if (e.tipo !== 'investigacao') continue;
    const chegada = chegadasAntes.get(e.jogadorId);
    const pit = semPunicao.paradas(e.jogadorId).filter((p) => chegada !== undefined && p.inicio < chegada.instante).at(-1);
    if (pit !== undefined && !cumprir.has(e.jogadorId)) cumprir.set(e.jogadorId, { evento: e, volta: pit.volta });
    else selos.set(e.jogadorId, (selos.get(e.jogadorId) ?? 0) + e.custoMs);
  }
  const esperas = new Map<string, EsperaNaVaga>(
    [...cumprir].map(([id, { evento, volta }]) => [id, { volta, ms: evento.custoMs }]),
  );
  const linha = linhaComPunicoes(
    resultado,
    pista,
    cumprir.size === 0 ? semPunicao : linhaDeIncidentes(resultado, pista, linhaDoTempoDoPit(resultado, pista, esperas)),
    cumprir,
  );
  // Da mesma fonte que atrasa a passagem pela linha: as duas não têm como divergir.
  const bandeirada = Math.min(...terminaram.map((c) => somaDe(c.jogadorId) + (linha.punicao(c.jogadorId)?.ms ?? 0)));
  const chegadas = chegadasEm(linha, bandeirada);

  const perimetro = lutDoTracado(tracadoSuavizado(pista.id)).comprimentoTotal;
  const velocidade = perimetro / pista.tempoBaseMs;

  const replay: ReplayDaCorrida = {
    // De propósito: `instanteDoProgresso` segue no progresso NÃO congelado, que é o que
    // `chegadaDoCarro` e `diferencasParaLider` precisam inverter.
    ...linha,
    bandeirada,
    fim:
      terminaram.length === 0
        ? (resultado.classificacao[0]?.tempoTotal ?? 0)
        : Math.max(...[...chegadas.values()].map((c) => c.instante)),
    chegada: (jogadorId) => chegadas.get(jogadorId),
    chegou(jogadorId, tempoSimMs) {
      const chegada = chegadas.get(jogadorId);
      return chegada !== undefined && tempoSimMs >= chegada.instante;
    },
    punicaoMs: (jogadorId) => selos.get(jogadorId) ?? 0,
    // Depois da linha o carro não anda mais na história dele: o incidente não acontece.
    incidentes(jogadorId) {
      const todos = linha.incidentes(jogadorId);
      const chegada = chegadas.get(jogadorId);
      return chegada === undefined ? todos : todos.filter((i) => i.inicio < chegada.instante);
    },

    progresso(jogadorId, historico, tempoSimMs) {
      const chegada = chegadas.get(jogadorId);
      return chegada !== undefined && tempoSimMs >= chegada.instante
        ? chegada.voltas / pista.voltas
        : linha.progresso(jogadorId, historico, tempoSimMs);
    },

    posicao(jogadorId, historico, status, tempoSimMs, reduzido) {
      const chegada = chegadas.get(jogadorId);
      if (chegada === undefined || tempoSimMs < chegada.inicioLenta) {
        return linha.posicao(jogadorId, historico, status, tempoSimMs, reduzido);
      }
      // Movimento reduzido: quem chegou fica parado na linha.
      const decorrido = tempoSimMs - chegada.inicioLenta;
      const andou = reduzido ? 0 : distanciaNaVoltaLenta(decorrido, velocidade);
      return posicaoNaPista(pista.id, chegada.fracaoInicial + andou / perimetro);
    },
  };
  CACHE_REPLAY.set(resultado, { pistaId: pista.id, replay });
  return replay;
}

/** Um passo do relógio do replay: pura, porque `useCorrida` não roda sem jsdom. */
export function avancarRelogio(
  tempoMs: number,
  deltaRealMs: number,
  escala: number,
  fimMs: number,
): { tempoMs: number; acabou: boolean } {
  const proximo = tempoMs + deltaRealMs * escala;
  return proximo >= fimMs ? { tempoMs: fimMs, acabou: true } : { tempoMs: proximo, acabou: false };
}
