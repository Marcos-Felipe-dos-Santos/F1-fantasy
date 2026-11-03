import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDataset } from '../engine/dataset';
import { criarDraft, resolverBots } from '../engine/draft';
import type { EventoCorrida, Jogador, ResultadoCorrida } from '../engine/types';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { replayDaCorrida } from './fim-da-corrida';
import { acumularVoltas, classificacaoAoVivo, prepararCorrida } from './fluxo-corrida';
import {
  DURACAO_EFEITO_MS,
  DURACAO_GUINADA_MS,
  efeitosNoInstante,
  guinadaNoInstante,
  MARGEM_LOCAL,
} from './incidentes-replay';
import { linhaDoTempoDoPit } from './pit-replay';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const PISTAS = dataset.pistas.map((p) => p.id);
const PISTA = { id: 'pista-monza', voltas: 10, tempoBaseMs: 1000 };

function corridaReal(seed: number, pistaId: string) {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const estado = resolverBots(criarDraft(dataset, atribuirPerfis(base, seed, 'dificil'), seed), dataset);
  return prepararCorrida(dataset, estado, pistaId, seed);
}

/** Corridas reais até o critério achar um caso: `undefined` segue procurando. */
function achar<T>(criterio: (c: ReturnType<typeof corridaReal>, r: ReturnType<typeof replayDaCorrida>) => T | undefined) {
  for (const pistaId of PISTAS) {
    for (let seed = 1; seed < 300; seed++) {
      const corrida = corridaReal(seed, pistaId);
      const achado = criterio(corrida, replayDaCorrida(corrida.resultado, corrida.pista));
      if (achado !== undefined) return { corrida, achado, replay: replayDaCorrida(corrida.resultado, corrida.pista) };
    }
  }
  throw new Error('sem corrida com esse caso');
}

interface CarroSintetico {
  ms?: number;
  /** Tempo de cada volta, quando não é constante. */
  voltas?: number[];
  dnf?: boolean;
}

/** Carros de volta constante (1000 ms, 10 voltas), com os eventos passados à parte. */
function sintetica(carros: Record<string, CarroSintetico>, eventos: EventoCorrida[] = [], chuva = false): ResultadoCorrida {
  const lista = Object.entries(carros).map(([jogadorId, c]) => {
    const voltas = c.voltas ?? Array<number>(PISTA.voltas).fill(c.ms ?? 1000);
    return {
      jogadorId,
      voltas,
      posicao: 0,
      pontos: 0,
      tempoTotal: voltas.reduce((s, x) => s + x, 0),
      paradas: 0,
      status: c.dnf === true ? ('dnf' as const) : ('terminou' as const),
      voltasCompletadas: voltas.length,
    };
  });
  const classificacao = [
    ...lista.filter((c) => c.status === 'terminou').sort((a, b) => a.tempoTotal - b.tempoTotal),
    ...lista.filter((c) => c.status === 'dnf').sort((a, b) => b.voltasCompletadas - a.voltasCompletadas),
  ].map((c, i) => ({ ...c, posicao: i + 1 }));
  return {
    seed: 7,
    classificacao,
    voltaMaisRapida: { jogadorId: classificacao[0].jogadorId, tempo: 1 },
    historicoVoltas: Object.fromEntries(lista.map((c) => [c.jogadorId, c.voltas])),
    voltasDePit: Object.fromEntries(lista.map((c) => [c.jogadorId, []])),
    eventos,
    chuva,
  } as ResultadoCorrida;
}

const erro = (jogadorId: string, volta: number, custoMs: number): EventoCorrida => ({ volta, jogadorId, tipo: 'erro-piloto', custoMs });
const voltasCom = (extra: Record<number, number>) =>
  Array.from({ length: PISTA.voltas }, (_, i) => 1000 + (extra[i + 1] ?? 0));

describe('custo concentrado num ponto da volta (PR 2d)', () => {
  const r = sintetica({ a: { voltas: voltasCom({ 3: 200 }) }, b: { ms: 1010 } }, [erro('a', 3, 200)]);
  const replay = replayDaCorrida(r, PISTA);
  const h = r.historicoVoltas.a;
  const voltas = (t: number) => replay.progresso('a', h, t) * PISTA.voltas;

  it('o carro fica parado na fração sorteada pelo tempo exato do custo', () => {
    const [inc] = replay.incidentes('a');
    expect(inc.fim - inc.inicio).toBeCloseTo(200, 9);
    expect(inc.fracao).toBeGreaterThanOrEqual(MARGEM_LOCAL);
    expect(inc.fracao).toBeLessThanOrEqual(1 - MARGEM_LOCAL);
    for (const k of [0, 0.25, 0.5, 0.99]) {
      expect(voltas(inc.inicio + k * (inc.fim - inc.inicio))).toBeCloseTo(2 + inc.fracao, 9);
    }
  });

  it('fora da parada ele anda no ritmo limpo, não no da volta com o custo', () => {
    const [inc] = replay.incidentes('a');
    expect(inc.inicio).toBeCloseTo(2000 + inc.fracao * 1000, 9);
    expect(voltas(2000 + (inc.fracao * 1000) / 2)).toBeCloseTo(2 + inc.fracao / 2, 9);
    expect(voltas(inc.fim + 50)).toBeCloseTo(2 + inc.fracao + 0.05, 9);
  });

  it('termina a volta no mesmo instante do motor', () => {
    expect(voltas(3200)).toBeCloseTo(3, 9);
    expect(replay.instanteDoProgresso('a', h, 3)).toBeCloseTo(3200, 9);
  });

  it('o inverso do progresso pula a parada: antes dela, o início; depois, soma o custo', () => {
    const [inc] = replay.incidentes('a');
    expect(replay.instanteDoProgresso('a', h, 2 + inc.fracao - 0.05)).toBeCloseTo(inc.inicio - 50, 6);
    expect(replay.instanteDoProgresso('a', h, 2 + inc.fracao + 0.05)).toBeCloseTo(inc.fim + 50, 6);
  });

  it('o carro no ponto do incidente fica no mesmo lugar do mapa, com ou sem movimento reduzido', () => {
    const [inc] = replay.incidentes('a');
    const em = (t: number, reduzido: boolean) => replay.posicao('a', h, 'terminou', t, reduzido).ponto;
    expect(em(inc.inicio + 1, false)).toEqual(em(inc.fim - 1, false));
    expect(em(inc.inicio + 1, true)).toEqual(em(inc.fim - 1, false));
    expect(replay.parado('a', inc.inicio + 1)).toBe(true);
    expect(replay.parado('a', inc.inicio - 1)).toBe(false);
    expect(replay.parado('a', inc.fim)).toBe(false);
    expect(replay.parado('b', inc.inicio + 1)).toBe(false);
  });

  it('dois incidentes na mesma volta: duas paradas, e a volta fecha no tempo do motor', () => {
    const dois = sintetica({ a: { voltas: voltasCom({ 4: 500 }) } }, [
      erro('a', 4, 200),
      { volta: 4, jogadorId: 'a', tipo: 'problema-tecnico', custoMs: 300 },
    ]);
    const rep = replayDaCorrida(dois, PISTA);
    const [p, q] = rep.incidentes('a');
    expect(p.fim).toBeLessThanOrEqual(q.inicio);
    expect(rep.instanteDoProgresso('a', dois.historicoVoltas.a, 4)).toBeCloseTo(4500, 9);
  });

  it('o local é determinístico e sai do hash da corrida', () => {
    const local = (seed: number) => {
      const c = { ...r, seed };
      return replayDaCorrida(c, PISTA).incidentes('a')[0].fracao;
    };
    expect(local(7)).toBe(local(7));
    expect(new Set([1, 2, 3, 4, 5, 6].map(local)).size).toBeGreaterThan(1);
  });

  it('a volta seguinte não muda, e quem não teve incidente também não', () => {
    expect(replay.progresso('a', h, 3700)).toBeCloseTo(0.35, 9);
    const b = r.historicoVoltas.b;
    expect(replay.progresso('b', b, 2020)).toBeCloseTo(linhaDoTempoDoPit(r, PISTA).progresso('b', b, 2020), 12);
  });
});

describe('corridas reais: sem teleporte, e a linha é a do motor', () => {
  it.each(PISTAS)('%s: o progresso nunca volta nem salta', (id) => {
    const { resultado, pista } = corridaReal(31, id);
    const replay = replayDaCorrida(resultado, pista);
    const ritmoMax = 3 / pista.tempoBaseMs;
    for (const c of resultado.classificacao) {
      const h = resultado.historicoVoltas[c.jogadorId];
      let anterior = 0;
      for (let t = 0; t <= replay.fim; t += 500) {
        const atual = replay.progresso(c.jogadorId, h, t) * pista.voltas;
        expect(atual).toBeGreaterThanOrEqual(anterior - 1e-9);
        expect(atual - anterior).toBeLessThan(ritmoMax * 500);
        anterior = atual;
      }
    }
  });

  it.each(PISTAS)('%s: as passagens pela linha são as do replay sem incidente, carro a carro', (id) => {
    const { resultado, pista } = corridaReal(32, id);
    const replay = replayDaCorrida(resultado, pista);
    const linha = linhaDoTempoDoPit(resultado, pista);
    for (const c of resultado.classificacao) {
      const h = resultado.historicoVoltas[c.jogadorId];
      const voltasInteiras = c.status === 'dnf' ? h.length - 1 : h.length;
      for (let v = 1; v <= voltasInteiras; v++) {
        expect(replay.instanteDoProgresso(c.jogadorId, h, v)).toBeCloseTo(linha.instanteDoProgresso(c.jogadorId, h, v), 3);
      }
    }
  });

  it('incidente na volta de pit: acontece antes da janela do box, que não muda', () => {
    const { corrida, achado, replay } = achar((c, r) =>
      c.resultado.eventos.find(
        (e) => e.tipo === 'erro-piloto' && c.resultado.voltasDePit[e.jogadorId].includes(e.volta) && r.incidentes(e.jogadorId).some((i) => i.evento === e),
      ),
    );
    const parada = replay.paradas(achado.jogadorId).find((p) => p.volta === achado.volta)!;
    const pura = linhaDoTempoDoPit(corrida.resultado, corrida.pista).paradas(achado.jogadorId).find((p) => p.volta === achado.volta);
    expect(parada).toEqual(pura);
    const inc = replay.incidentes(achado.jogadorId).find((i) => i.evento === achado)!;
    expect(inc.fim).toBeLessThanOrEqual(parada.inicio);
  });

  it('incidente na volta seguinte ao pit: acontece depois da janela do box', () => {
    const { achado, replay } = achar((c, r) =>
      c.resultado.eventos.find(
        (e) => e.tipo === 'erro-piloto' && c.resultado.voltasDePit[e.jogadorId].includes(e.volta - 1) && r.incidentes(e.jogadorId).some((i) => i.evento === e),
      ),
    );
    const parada = replay.paradas(achado.jogadorId).find((p) => p.volta === achado.volta - 1)!;
    const inc = replay.incidentes(achado.jogadorId).find((i) => i.evento === achado)!;
    expect(inc.inicio).toBeGreaterThanOrEqual(parada.fim);
  });

  it('o carro no fim da parada segue dali: o custo sai todo no ponto', () => {
    const { resultado, pista } = corridaReal(33, PISTAS[2]);
    const replay = replayDaCorrida(resultado, pista);
    const com = resultado.classificacao.find((c) => replay.incidentes(c.jogadorId).length > 0)!;
    const h = resultado.historicoVoltas[com.jogadorId];
    const [inc] = replay.incidentes(com.jogadorId);
    expect(replay.progresso(com.jogadorId, h, inc.fim)).toBeCloseTo(replay.progresso(com.jogadorId, h, inc.inicio), 9);
  });
});

describe('DNF: para no ponto do abandono (PR 2d)', () => {
  const r = sintetica({ a: {}, d: { voltas: [1000, 1000, 1000] , dnf: true } }, [
    { volta: 3, jogadorId: 'd', tipo: 'quebra-motor', custoMs: 0 },
  ]);
  const replay = replayDaCorrida(r, PISTA);
  const h = r.historicoVoltas.d;
  const ab = replay.abandono('d')!;

  it('fica parado na fração sorteada, sem saltar: nem para a linha nem para o meio da pista', () => {
    expect(ab.fracao).toBeGreaterThanOrEqual(MARGEM_LOCAL);
    expect(ab.fracao).toBeLessThanOrEqual(1 - MARGEM_LOCAL);
    expect(ab.instante).toBeCloseTo(2000 + ab.fracao * 1000, 9);
    const em = (t: number) => replay.posicao('d', h, 'dnf', t, false);
    expect(em(ab.instante).ponto).toEqual(em(ab.instante + 5000).ponto);
    const antes = em(ab.instante - 2).ponto;
    expect(Math.hypot(antes.x - em(ab.instante).ponto.x, antes.y - em(ab.instante).ponto.y)).toBeLessThan(5);
    expect(em(ab.instante + 5000).fracaoNaPista).toBeCloseTo(ab.fracao, 9);
  });

  it('o progresso congela em voltas completas + fração, e não na volta inteira', () => {
    expect(replay.progresso('d', h, ab.instante + 9000) * PISTA.voltas).toBeCloseTo(2 + ab.fracao, 9);
  });

  it('no painel, vira DNF no instante da parada, não no fim do histórico', () => {
    const status = (t: number) => classificacaoAoVivo(r, ['a', 'd'], t, PISTA.voltas, replay).find((i) => i.jogadorId === 'd')?.status;
    expect(status(ab.instante - 1)).toBe('correndo');
    expect(status(ab.instante)).toBe('dnf');
    expect(replay.abandonou('d', ab.instante - 1)).toBe(false);
    expect(replay.abandonou('d', ab.instante)).toBe(true);
    expect(replay.abandonou('a', 1e9)).toBe(false);
    expect(replay.parado('d', ab.instante)).toBe(true);
  });

  it('DNF na volta seguinte ao pit: quebra depois de sair do box', () => {
    const { achado, replay: rep } = achar((c) =>
      c.resultado.classificacao.find(
        (x) => x.status === 'dnf' && c.resultado.voltasDePit[x.jogadorId].includes(c.resultado.historicoVoltas[x.jogadorId].length - 1),
      ),
    );
    const parada = rep.paradas(achado.jogadorId).at(-1)!;
    expect(rep.abandono(achado.jogadorId)!.instante).toBeGreaterThanOrEqual(parada.fim);
  });

  it('DNF com erro na mesma volta: o erro vem antes do abandono', () => {
    const { achado, replay: rep } = achar((c) =>
      c.resultado.classificacao.find(
        (x) =>
          x.status === 'dnf' &&
          c.resultado.eventos.some(
            (e) => e.jogadorId === x.jogadorId && e.tipo === 'erro-piloto' && e.volta === c.resultado.historicoVoltas[x.jogadorId].length,
          ),
      ),
    );
    expect(rep.incidentes(achado.jogadorId).at(-1)!.fim).toBeLessThanOrEqual(rep.abandono(achado.jogadorId)!.instante);
  });

  it('corridas reais: todo DNF para antes da soma do histórico e dentro do replay', () => {
    for (const id of PISTAS) {
      for (let seed = 1; seed <= 12; seed++) {
        const { resultado, pista } = corridaReal(seed, id);
        const rep = replayDaCorrida(resultado, pista);
        for (const c of resultado.classificacao.filter((x) => x.status === 'dnf')) {
          const h2 = resultado.historicoVoltas[c.jogadorId];
          const a = rep.abandono(c.jogadorId)!;
          expect(a.instante).toBeLessThan(acumularVoltas(h2).at(-1)!);
          expect(a.instante).toBeLessThan(rep.fim);
        }
      }
    }
  });

  it('a corrida sem ninguém terminando continua com fim', () => {
    const so = sintetica({ d: { voltas: [1000, 1000], dnf: true } });
    const rep = replayDaCorrida(so, PISTA);
    expect(rep.abandono('d')).toBeDefined();
    expect(rep.fim).toBe(2000);
  });
});

describe('efeito no momento: duração em tempo REAL (decisão do Marcos, ~700 ms)', () => {
  const r = sintetica({ a: { voltas: voltasCom({ 3: 200 }) } }, [erro('a', 3, 200)]);
  const replay = replayDaCorrida(r, PISTA);
  const [inc] = replay.incidentes('a');
  const efeitos = (t: number, simPorReal: number, res = r) => efeitosNoInstante(replayDaCorrida(res, PISTA), res, PISTA.id, t, simPorReal);

  it('dura 700 ms reais em qualquer velocidade, mesmo com o custo menor que isso', () => {
    for (const simPorReal of [0.5, 2, 5]) {
      expect(efeitos(inc.inicio - 1, simPorReal)).toHaveLength(0);
      expect(efeitos(inc.inicio, simPorReal)).toHaveLength(1);
      expect(efeitos(inc.inicio + (DURACAO_EFEITO_MS - 1) * simPorReal, simPorReal)).toHaveLength(1);
      expect(efeitos(inc.inicio + DURACAO_EFEITO_MS * simPorReal, simPorReal)).toHaveLength(0);
    }
  });

  it('a idade vai de 0 a 1 e o efeito fica no ponto do incidente, não no carro que já saiu', () => {
    const [noInicio] = efeitos(inc.inicio, 2);
    const [depois] = efeitos(inc.inicio + 1000, 2);
    expect(noInicio.idade).toBe(0);
    expect(depois.idade).toBeCloseTo(1000 / (DURACAO_EFEITO_MS * 2), 9);
    expect(depois.ponto).toEqual(noInicio.ponto);
  });

  it('erro no seco: fumaça; erro na chuva: spray; pane e quebra: fumaça também na chuva', () => {
    expect(efeitos(inc.inicio, 2)[0].tipo).toBe('fumaca');
    const molhada = sintetica({ a: { voltas: voltasCom({ 3: 200 }) } }, [erro('a', 3, 200)], true);
    const i = replayDaCorrida(molhada, PISTA).incidentes('a')[0];
    expect(efeitos(i.inicio, 2, molhada)[0].tipo).toBe('spray');
    const pane = sintetica({ a: { voltas: voltasCom({ 3: 200 }) } }, [{ volta: 3, jogadorId: 'a', tipo: 'problema-tecnico', custoMs: 200 }], true);
    const j = replayDaCorrida(pane, PISTA).incidentes('a')[0];
    expect(efeitos(j.inicio, 2, pane)[0].tipo).toBe('fumaca');
    const quebra = sintetica({ a: { voltas: [1000, 1000], dnf: true } }, [{ volta: 2, jogadorId: 'a', tipo: 'quebra-chassi', custoMs: 0 }], true);
    const q = replayDaCorrida(quebra, PISTA).abandono('a')!;
    expect(efeitos(q.instante, 2, quebra)[0].tipo).toBe('fumaca');
  });

  it('guinada: curta, volta a zero, e só no erro de piloto', () => {
    const fora = guinadaNoInstante(replay, 'a', inc.inicio - 1, 2);
    expect(fora).toBe(0);
    const meio = inc.inicio + (DURACAO_GUINADA_MS / 2) * 2;
    expect(Math.abs(guinadaNoInstante(replay, 'a', meio, 2))).toBeGreaterThan(20);
    expect(guinadaNoInstante(replay, 'a', inc.inicio + DURACAO_GUINADA_MS * 2, 2)).toBe(0);
    const pane = sintetica({ a: { voltas: voltasCom({ 3: 200 }) } }, [{ volta: 3, jogadorId: 'a', tipo: 'problema-tecnico', custoMs: 200 }]);
    const rep = replayDaCorrida(pane, PISTA);
    const i = rep.incidentes('a')[0];
    expect(guinadaNoInstante(rep, 'a', i.inicio + DURACAO_GUINADA_MS, 2)).toBe(0);
  });

  it('o retardatário que recebeu a bandeirada não tem incidente depois da linha', () => {
    // `c` cruza a linha na volta 9 depois da bandeirada: o erro da volta 10 nunca aconteceu na tela.
    const rel = sintetica({ a: {}, c: { voltas: Array.from({ length: 10 }, (_, i) => (i === 9 ? 1350 : 1150)) } }, [erro('c', 10, 200)]);
    const rep = replayDaCorrida(rel, PISTA);
    expect(rep.chegada('c')?.voltas).toBe(9);
    expect(rep.incidentes('c')).toHaveLength(0);
  });
});
