import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDataset } from '../engine/dataset';
import { criarDraft, resolverBots } from '../engine/draft';
import type { Jogador, ResultadoCorrida } from '../engine/types';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { diferencasParaLider } from './diferenca-lider';
import { avancarRelogio, RAZAO_VOLTA_LENTA, replayDaCorrida } from './fim-da-corrida';
import { classificacaoAoVivo, pontoNoTracado, prepararCorrida } from './fluxo-corrida';
import { linhaDoTempoDoPit } from './pit-replay';
import { tracadoSuavizado } from './suavizacao';

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

interface CarroSintetico {
  ms: number;
  voltas?: number;
  punicao?: number;
  dnf?: boolean;
}

/** Carros de volta constante. A classificação segue a regra da engine: quem terminou, por `tempoTotal`. */
function sintetica(carros: Record<string, CarroSintetico>): ResultadoCorrida {
  const lista = Object.entries(carros).map(([jogadorId, c]) => {
    const voltas = c.voltas ?? PISTA.voltas;
    return {
      jogadorId,
      posicao: 0,
      pontos: 0,
      tempoTotal: c.ms * voltas + (c.punicao ?? 0),
      paradas: 0,
      status: c.dnf === true ? ('dnf' as const) : ('terminou' as const),
      voltasCompletadas: voltas,
    };
  });
  const classificacao = [
    ...lista.filter((c) => c.status === 'terminou').sort((a, b) => a.tempoTotal - b.tempoTotal),
    ...lista.filter((c) => c.status === 'dnf').sort((a, b) => b.voltasCompletadas - a.voltasCompletadas),
  ].map((c, i) => ({ ...c, posicao: i + 1 }));
  return {
    seed: 1,
    classificacao,
    voltaMaisRapida: { jogadorId: classificacao[0].jogadorId, tempo: 1 },
    historicoVoltas: Object.fromEntries(
      Object.entries(carros).map(([id, c]) => [id, Array<number>(c.voltas ?? PISTA.voltas).fill(c.ms)]),
    ),
    voltasDePit: Object.fromEntries(Object.keys(carros).map((id) => [id, []])),
    eventos: Object.entries(carros)
      .filter(([, c]) => c.punicao !== undefined)
      .map(([jogadorId, c]) => ({ volta: PISTA.voltas, jogadorId, tipo: 'investigacao' as const, custoMs: c.punicao ?? 0 })),
    chuva: false,
  } as ResultadoCorrida;
}

const ids = (r: ResultadoCorrida) => Object.keys(r.historicoVoltas);
const painel = (r: ResultadoCorrida, t: number) =>
  classificacaoAoVivo(r, ids(r), t, PISTA.voltas, replayDaCorrida(r, PISTA));

describe('quem termina, e quando (PR 2e)', () => {
  it('quem está na volta do líder faz as N voltas; o retardatário, até a próxima passagem pela linha', () => {
    const r = sintetica({ a: { ms: 1000 }, b: { ms: 1050 }, c: { ms: 1150 } });
    const replay = replayDaCorrida(r, PISTA);
    expect(replay.bandeirada).toBe(10_000);
    expect(replay.chegada('a')).toMatchObject({ voltas: 10, instante: 10_000 });
    expect(replay.chegada('b')).toMatchObject({ voltas: 10, instante: 10_500 });
    expect(replay.chegada('c')).toMatchObject({ voltas: 9, instante: 10_350 });
    expect(replay.fim).toBe(10_500);
  });

  it('o fim é a passagem do último pela linha, não a soma do histórico dele', () => {
    const r = sintetica({ a: { ms: 1000 }, c: { ms: 1290 } });
    const replay = replayDaCorrida(r, PISTA);
    expect(replay.chegada('c')).toMatchObject({ voltas: 8, instante: 10_320 });
    expect(replay.fim).toBe(10_320);
  });

  it('com duas ou mais voltas a menos, vale a mesma regra', () => {
    const r = sintetica({ a: { ms: 1000 }, c: { ms: 2100 } });
    expect(replayDaCorrida(r, PISTA).chegada('c')).toMatchObject({ voltas: 5, instante: 10_500 });
  });

  it('o DNF fica de fora, mesmo quebrando depois do último', () => {
    const r = sintetica({ a: { ms: 1000 }, b: { ms: 1020 }, d: { ms: 1500, voltas: 8, dnf: true } });
    const replay = replayDaCorrida(r, PISTA);
    expect(replay.chegada('d')).toBeUndefined();
    expect(replay.chegou('d', 999_999)).toBe(false);
    expect(replay.fim).toBe(10_200);
  });

  it('a bandeirada é do primeiro a completar as voltas NA PISTA, mesmo punido', () => {
    const r = sintetica({ a: { ms: 1000, punicao: 5000 }, b: { ms: 1010 } });
    expect(r.classificacao[0].jogadorId).toBe('b');
    const replay = replayDaCorrida(r, PISTA);
    expect(replay.bandeirada).toBe(10_000);
    expect(replay.fim).toBe(10_100);
  });

  it('sem ninguém terminar, o replay acaba onde sempre acabou', () => {
    const r = sintetica({ a: { ms: 1000, voltas: 3, dnf: true }, b: { ms: 1000, voltas: 2, dnf: true } });
    expect(replayDaCorrida(r, PISTA).fim).toBe(r.classificacao[0].tempoTotal);
  });

  it('a punição vem dos eventos da engine', () => {
    const r = sintetica({ a: { ms: 1000, punicao: 7300 }, b: { ms: 1010 } });
    const comErro = {
      ...r,
      eventos: [...r.eventos, { volta: 3, jogadorId: 'b', tipo: 'erro-piloto' as const, custoMs: 900 }],
    };
    const replay = replayDaCorrida(comErro, PISTA);
    expect(replay.punicaoMs('a')).toBe(7300);
    expect(replay.punicaoMs('b')).toBe(0);
  });

  it('o selo usa a tinta de erro: `--erro` é preenchimento e some no tema claro', () => {
    const css = readFileSync('src/ui/estilos.css', 'utf8');
    expect(/\.badge-punicao \{[^}]*color: var\(--cor-erro\);/.exec(css)).not.toBeNull();
  });
});

describe('relógio do replay', () => {
  it('avança pela escala, sem passar do fim', () => {
    expect(avancarRelogio(100, 16, 10, 1000)).toEqual({ tempoMs: 260, acabou: false });
    expect(avancarRelogio(990, 16, 10, 1000)).toEqual({ tempoMs: 1000, acabou: true });
    expect(avancarRelogio(840, 16, 10, 1000)).toEqual({ tempoMs: 1000, acabou: true });
  });

  it('useCorrida para no fim novo e mantém a escala pelo tempo do vencedor', () => {
    // Sem jsdom, `useCorrida` não roda aqui: a ligação fica nesta cerca e no preview.
    const fonte = readFileSync('src/ui/useCorrida.ts', 'utf8').replace(/\s+/g, ' ');
    expect(fonte).toContain('replayDaCorrida(resultado, pista).fim');
    expect(fonte).toMatch(/avancarRelogio\( ?tempoSimRef\.current, deltaRealMs, fatorEscalaRef\.current, tempoFimMs,? ?\)/);
    expect(fonte.match(/escalaReplay\(tempoVencedorMs/g)).toHaveLength(2);
  });
});

describe('painel depois da bandeirada', () => {
  const comRetardatario = sintetica({ a: { ms: 1000 }, b: { ms: 1050 }, c: { ms: 1150 } });

  it('a 🏁 aparece quando o carro cruza, não quando o histórico dele acaba', () => {
    const status = (t: number) => painel(comRetardatario, t).find((i) => i.jogadorId === 'c')?.status;
    expect(status(10_349)).toBe('correndo');
    expect(status(10_350)).toBe('terminou');
  });

  it('o progresso congela na bandeirada, mesmo com histórico sobrando', () => {
    const replay = replayDaCorrida(comRetardatario, PISTA);
    const h = comRetardatario.historicoVoltas.c;
    expect(replay.progresso('c', h, 10_350)).toBeCloseTo(0.9, 10);
    expect(replay.progresso('c', h, 10_500)).toBeCloseTo(0.9, 10);
  });

  it('no fim do replay a ordem é a oficial, com punição', () => {
    const r = sintetica({ a: { ms: 1000, punicao: 5000 }, b: { ms: 1010 }, c: { ms: 1020 } });
    expect(painel(r, 10_050).map((i) => i.jogadorId)).toEqual(['a', 'b', 'c']);
    expect(painel(r, 10_100).map((i) => i.jogadorId)).toEqual(['b', 'a', 'c']);
    expect(painel(r, 10_200).map((i) => i.jogadorId)).toEqual(['b', 'c', 'a']);
  });

  it('a ordem oficial vale mesmo quando o punido fez mais voltas que o retardatário à frente dele', () => {
    const r = sintetica({ a: { ms: 1000 }, b: { ms: 1010, punicao: 9000 }, c: { ms: 1350 } });
    expect(r.classificacao.map((c) => c.jogadorId)).toEqual(['a', 'c', 'b']);
    const replay = replayDaCorrida(r, PISTA);
    expect(replay.chegada('c')?.voltas).toBe(8);
    expect(painel(r, replay.fim).map((i) => i.jogadorId)).toEqual(['a', 'c', 'b']);
  });

  it('o DNF da última volta fica atrás de quem terminou', () => {
    const r = sintetica({ a: { ms: 1000 }, d: { ms: 1001, dnf: true }, b: { ms: 1010 } });
    expect(painel(r, 10_100)).toEqual([
      { jogadorId: 'a', status: 'terminou' },
      { jogadorId: 'b', status: 'terminou' },
      { jogadorId: 'd', status: 'dnf' },
    ]);
  });

  it('depois da bandeirada, o DNF da última volta não empurra o retardatário para cima de quem corre', () => {
    const r = sintetica({ a: { ms: 1000 }, d: { ms: 1001, dnf: true }, b: { ms: 1040 }, c: { ms: 1150 } });
    // `c` já cruzou com 9 voltas; `b`, na volta do líder, ainda corre.
    expect(painel(r, 10_360).map((i) => i.jogadorId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('antes da bandeirada, o DNF segue onde parou', () => {
    const r = sintetica({ a: { ms: 1000, voltas: 3, dnf: true }, b: { ms: 1050 }, c: { ms: 1100 } });
    expect(painel(r, 3050)[0]).toEqual({ jogadorId: 'a', status: 'dnf' });
  });

  it('o retardatário que chegou segue +1 V, e quem está na volta do líder segue no tempo total', () => {
    const replay = replayDaCorrida(comRetardatario, PISTA);
    const ordem = classificacaoAoVivo(comRetardatario, ['a', 'b', 'c'], replay.fim, PISTA.voltas, replay);
    expect(ordem.map((i) => i.jogadorId)).toEqual(['a', 'b', 'c']);
    expect(diferencasParaLider(comRetardatario, ordem, replay.fim, PISTA.voltas, replay)).toEqual([
      { tipo: 'lider' },
      { tipo: 'tempo', ms: 500 },
      { tipo: 'voltas', voltas: 1 },
    ]);
  });

  it.each(PISTAS)('%s: no fim, terminados e abandonos estão na ordem oficial', (id) => {
    const { pista, grid, resultado } = corridaReal(777, id);
    const replay = replayDaCorrida(resultado, pista);
    const ordem = classificacaoAoVivo(resultado, grid.grid.map((g) => g.jogadorId), replay.fim, pista.voltas, replay);
    const parados = new Set(ordem.filter((i) => i.status !== 'correndo').map((i) => i.jogadorId));
    expect(ordem.filter((i) => i.status === 'terminou').length).toBe(
      resultado.classificacao.filter((c) => c.status === 'terminou').length,
    );
    expect(ordem.filter((i) => parados.has(i.jogadorId)).map((i) => i.jogadorId)).toEqual(
      resultado.classificacao.filter((c) => parados.has(c.jogadorId)).map((c) => c.jogadorId),
    );
  });
});

describe('volta lenta', () => {
  const r = sintetica({ a: { ms: 1000 }, b: { ms: 1150 } });
  const replay = replayDaCorrida(r, PISTA);
  const na = (id: string, t: number, reduzido = false) =>
    replay.posicao(id, r.historicoVoltas[id], 'terminou', t, reduzido);

  it('sai da linha sem salto e segue andando', () => {
    const antes = na('a', 9_999);
    const depois = na('a', 10_001);
    // Nesta pista sintética o carro anda 2,5 u por ms: 2 ms dão menos de 6 u.
    expect(Math.hypot(antes.ponto.x - depois.ponto.x, antes.ponto.y - depois.ponto.y)).toBeLessThan(6);
    expect(na('a', 10_300).fracaoNaPista ?? 0).toBeGreaterThan(depois.fracaoNaPista ?? 0);
  });

  it('cruza a linha na velocidade da pista e desacelera aos poucos, sem degrau', () => {
    const noComeco = na('a', 10_002).fracaoNaPista ?? 0;
    // 2 ms a 1/1000 de volta por ms: 60% daria 0,0012.
    expect(noComeco).toBeGreaterThan(0.0019);
  });

  it('o retardatário também desacelera, em vez de seguir o histórico que sobrou', () => {
    const c = replay.chegada('b');
    expect(c?.voltas).toBe(9);
    const t = (c?.instante ?? 0) + 200;
    const pista = { ...PISTA, tempoBaseMs: 1000 };
    expect(linhaDoTempoDoPit(r, pista).posicao('b', r.historicoVoltas.b, 'terminou', t, false).ponto).not.toEqual(
      na('b', t).ponto,
    );
    expect(na('b', t).fracaoNaPista ?? 1).toBeLessThan(200 / 1000);
  });

  it(`depois da rampa anda a ${RAZAO_VOLTA_LENTA * 100}% da velocidade da pista`, () => {
    const de = na('a', 10_500).fracaoNaPista ?? 0;
    const ate = na('a', 10_600).fracaoNaPista ?? 0;
    expect(RAZAO_VOLTA_LENTA).toBe(0.6);
    expect(ate - de).toBeCloseTo((0.6 * 100) / PISTA.tempoBaseMs, 6);
  });

  it('com movimento reduzido fica parado na linha, também o retardatário', () => {
    const linha = pontoNoTracado(tracadoSuavizado(PISTA.id), 0);
    expect(na('a', 10_300, true).ponto).toEqual(linha);
    expect(na('b', 10_400, true).ponto).toEqual(linha);
  });
});

describe('sem ultrapassar depois da bandeirada', () => {
  it('dois carros colados na linha seguem na ordem em que cruzaram', () => {
    const r = sintetica({ a: { ms: 1000 }, b: { ms: 1000.5 }, c: { ms: 1001 } });
    const replay = replayDaCorrida(r, PISTA);
    for (let t = replay.fim; t < replay.fim + 1200; t += 10) {
      const [a, b, c] = ['a', 'b', 'c'].map(
        (id) => replay.posicao(id, r.historicoVoltas[id], 'terminou', t, false).fracaoNaPista ?? 0,
      );
      expect(a).toBeGreaterThan(b);
      expect(b).toBeGreaterThan(c);
    }
  });

  it.each(PISTAS)('%s: nenhum carro na volta lenta passa outro que cruzou antes dele', (id) => {
    const { pista, resultado } = corridaReal(777, id);
    const replay = replayDaCorrida(resultado, pista);
    const carros = resultado.classificacao
      .map((c) => ({ id: c.jogadorId, chegada: replay.chegada(c.jogadorId) }))
      .filter((c) => c.chegada !== undefined && c.chegada.inicioLenta === c.chegada.instante)
      .sort((a, b) => (a.chegada?.instante ?? 0) - (b.chegada?.instante ?? 0));
    let pares = 0;
    for (let t = replay.bandeirada; t <= replay.fim; t += Math.max(1, (replay.fim - replay.bandeirada) / 60)) {
      const andaram = carros
        .filter((c) => t >= (c.chegada?.instante ?? Infinity))
        .map((c) => replay.posicao(c.id, resultado.historicoVoltas[c.id], 'terminou', t, false).fracaoNaPista ?? 0);
      for (let i = 1; i < andaram.length; i++) {
        expect(andaram[i - 1]).toBeGreaterThanOrEqual(andaram[i]);
        pares++;
      }
    }
    expect(pares).toBeGreaterThan(50);
  });
});

describe('bandeirada dentro do box', () => {
  const pista = { id: 'pista-monza', voltas: 10, tempoBaseMs: 90_000 };
  const a = Array<number>(10).fill(90_000);
  const b = Array.from({ length: 10 }, (_, i) => (i === 8 ? 131_000 : 101_000));
  const soma = (h: number[]) => h.reduce((s, x) => s + x, 0);
  const r = {
    seed: 1,
    classificacao: [
      { jogadorId: 'a', posicao: 1, pontos: 0, tempoTotal: soma(a), paradas: 0, status: 'terminou', voltasCompletadas: 10 },
      { jogadorId: 'b', posicao: 2, pontos: 0, tempoTotal: soma(b), paradas: 1, status: 'terminou', voltasCompletadas: 10 },
    ],
    voltaMaisRapida: { jogadorId: 'a', tempo: 90_000 },
    eventos: [],
    chuva: false,
    historicoVoltas: { a, b },
    voltasDePit: { a: [], b: [9] },
  } as unknown as ResultadoCorrida;
  const replay = replayDaCorrida(r, pista);
  const linha = linhaDoTempoDoPit(r, pista);
  const parada = linha.paradas('b')[0];
  const chegada = replay.chegada('b');
  const instante = chegada?.instante ?? 0;

  it('pré-condição: o carro recebe a bandeirada dentro do box', () => {
    expect(chegada?.voltas).toBe(9);
    expect(instante).toBeGreaterThanOrEqual(parada.entrada);
    expect(instante).toBeLessThan(parada.retorno);
  });

  it('conta como chegada ao cruzar a linha no box, e completa a saída antes da volta lenta', () => {
    expect(replay.chegou('b', instante)).toBe(true);
    expect(chegada?.inicioLenta).toBe(parada.fim);
    const t = (instante + parada.fim) / 2;
    expect(replay.posicao('b', b, 'terminou', t, false)).toEqual(linha.posicao('b', b, 'terminou', t, false));
  });

  it('entra na volta lenta sem salto', () => {
    const antes = replay.posicao('b', b, 'terminou', parada.fim - 1, false);
    const depois = replay.posicao('b', b, 'terminou', parada.fim + 1, false);
    expect(Math.hypot(antes.ponto.x - depois.ponto.x, antes.ponto.y - depois.ponto.y)).toBeLessThan(1);
    expect(depois.fracaoNaPista).toBeCloseTo(chegada?.fracaoInicial ?? -1, 3);
  });
});
