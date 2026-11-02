import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDataset } from '../engine/dataset';
import { criarDraft, resolverBots } from '../engine/draft';
import type { Jogador, ResultadoCorrida } from '../engine/types';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { diferencasParaLider, formatarDiferenca, type DiferencaAoLider } from './diferenca-lider';
import { classificacaoAoVivo, prepararCorrida } from './fluxo-corrida';
import { linhaDoTempoDoPit } from './pit-replay';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

function corridaReal(seed: number, pistaId: string) {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const jogadores = atribuirPerfis(base, seed, 'dificil');
  const estado = resolverBots(criarDraft(dataset, jogadores, seed), dataset);
  return prepararCorrida(dataset, estado, pistaId, seed);
}

/** Corrida de carros com volta constante: `carros[id] = [voltaMs, voltas, punicaoMs]`. */
function sintetica(carros: Record<string, [number, number, number?]>): ResultadoCorrida {
  const historicoVoltas = Object.fromEntries(
    Object.entries(carros).map(([id, [ms, voltas]]) => [id, Array<number>(voltas).fill(ms)]),
  );
  const maiorVoltas = Math.max(...Object.values(carros).map((c) => c[1]));
  const classificacao = Object.entries(carros)
    .map(([jogadorId, [ms, voltas, punicao]]) => ({
      jogadorId,
      posicao: 0,
      pontos: 0,
      tempoTotal: ms * voltas + (punicao ?? 0),
      paradas: 0,
      status: voltas < maiorVoltas ? ('dnf' as const) : ('terminou' as const),
      voltasCompletadas: voltas,
    }))
    .sort((a, b) => a.tempoTotal - b.tempoTotal)
    .map((c, i) => ({ ...c, posicao: i + 1 }));
  return {
    seed: 1,
    classificacao,
    historicoVoltas,
    eventos: [],
    chuva: false,
    voltasDePit: {},
  } as unknown as ResultadoCorrida;
}

const noInstante = (r: ResultadoCorrida, t: number, voltas: number) => {
  const ordem = classificacaoAoVivo(r, Object.keys(r.historicoVoltas), t, voltas);
  const d = diferencasParaLider(r, ordem, t, voltas);
  return Object.fromEntries(ordem.map((item, i) => [item.jogadorId, d[i]]));
};

describe('diferença para o líder (PR 2a)', () => {
  it('é o tempo que o líder levou para estar onde o carro está agora', () => {
    const r = sintetica({ a: [1000, 10], b: [1100, 10] });
    // Em 2200 ms, B fez 2 voltas: A esteve ali em 2000 ms.
    expect(noInstante(r, 2200, 10)).toEqual({ a: { tipo: 'lider' }, b: { tipo: 'tempo', ms: 200 } });
  });

  it('com o líder uma volta ou mais à frente, conta voltas inteiras', () => {
    const r = sintetica({ a: [1000, 10], b: [1500, 10], c: [3100, 10] });
    const d = noInstante(r, 6200, 10);
    expect(d.b).toEqual({ tipo: 'voltas', voltas: 2 });
    expect(d.c).toEqual({ tipo: 'voltas', voltas: 4 });
    expect(noInstante(r, 1999, 10).b).toEqual({ tipo: 'tempo', ms: expect.closeTo(666.33, 1) });
  });

  it('na chegada vale o tempo total, que traz a punição que o histórico não tem', () => {
    const r = sintetica({ a: [1000, 5], b: [1010, 5, 5000], c: [1020, 5] });
    const d = noInstante(r, 999_999, 5);
    expect(d.a).toEqual({ tipo: 'lider' });
    expect(d.c).toEqual({ tipo: 'tempo', ms: 100 });
    expect(d.b).toEqual({ tipo: 'tempo', ms: 5050 });
  });

  it('o carro que já chegou com punição não fica atrás do número de quem vem depois', () => {
    const r = sintetica({ a: [1000, 5], b: [1010, 5, 5000], c: [1020, 5] });
    // B e A já cruzaram a linha, C ainda não: o painel põe B na frente até C chegar.
    const t = 5060;
    const ordem = classificacaoAoVivo(r, ['a', 'b', 'c'], t, 5);
    expect(ordem.map((i) => i.jogadorId)).toEqual(['a', 'b', 'c']);
    const [, , c] = diferencasParaLider(r, ordem, t, 5);
    expect(c).toEqual({ tipo: 'tempo', ms: 5050 });
  });

  it('DNF fica sem valor e nunca é a referência', () => {
    const r = sintetica({ a: [1000, 3], b: [1050, 10], c: [1100, 10] });
    const d = noInstante(r, 3500, 10);
    expect(d.a).toBeNull();
    expect(d.b).toEqual({ tipo: 'lider' });
    expect(d.c).toEqual({ tipo: 'tempo', ms: expect.any(Number) });
  });

  it('o DNF ainda na frente do painel não vira a referência de quem corre', () => {
    const r = sintetica({ a: [1000, 3], b: [1050, 10], c: [1100, 10] });
    // A parou em 3000 com 3 voltas; em 3050 ainda não foi alcançado por B.
    const ordem = classificacaoAoVivo(r, ['a', 'b', 'c'], 3050, 10);
    expect(ordem[0]).toEqual({ jogadorId: 'a', status: 'dnf' });
    const [a, b] = diferencasParaLider(r, ordem, 3050, 10);
    expect(a).toBeNull();
    expect(b).toEqual({ tipo: 'lider' });
  });

  it.each(['pista-suzuka', 'pista-spa', 'pista-monaco', 'pista-imola'])(
    '%s: em qualquer instante o número nunca contradiz a ordem do painel',
    (id) => {
      const { pista, grid, resultado } = corridaReal(6, id);
      const linha = linhaDoTempoDoPit(resultado, pista);
      const ordemGrid = grid.grid.map((g) => g.jogadorId);
      const fim = Math.max(...resultado.classificacao.map((c) => c.tempoTotal));
      for (let t = 0; t <= fim * 1.01; t += fim / 400) {
        const ordem = classificacaoAoVivo(resultado, ordemGrid, t, pista.voltas, linha);
        const d = diferencasParaLider(resultado, ordem, t, pista.voltas, linha);
        expect(d.length).toBe(ordem.length);
        expect(d.filter((x) => x?.tipo === 'lider').length).toBe(1);
        let ms = 0;
        let voltas = 0;
        for (const [i, x] of d.entries()) {
          expect(x === null).toBe(ordem[i].status === 'dnf');
          if (x?.tipo === 'tempo') {
            expect(x.ms).toBeGreaterThanOrEqual(ms);
            ms = x.ms;
          }
          if (x?.tipo === 'voltas') {
            expect(x.voltas).toBeGreaterThanOrEqual(Math.max(1, voltas));
            voltas = x.voltas;
          }
        }
      }
    },
  );

  it('com a linha do pit, o carro parado perde tempo: a referência é o progresso do mapa', () => {
    const { pista, resultado } = corridaReal(3, 'pista-spa');
    const linha = linhaDoTempoDoPit(resultado, pista);
    const ids = resultado.classificacao.map((c) => c.jogadorId);
    const gap = (j: string, t: number) => {
      const ordem = classificacaoAoVivo(resultado, ids, t, pista.voltas, linha);
      const d = diferencasParaLider(resultado, ordem, t, pista.voltas, linha);
      const x = d[ordem.findIndex((i) => i.jogadorId === j)];
      return x?.tipo === 'tempo' ? x.ms : null;
    };
    const paradas = Object.keys(resultado.voltasDePit).flatMap((j) =>
      linha.paradas(j).map((p) => ({ j, p })),
    );
    // Quem parou liderando não tem diferença: vale o primeiro que parou atrás de alguém.
    const caso = paradas.find(({ j, p }) => gap(j, p.chegada + 10) !== null);
    expect(caso).toBeDefined();
    const { j, p } = caso!;
    const a = gap(j, p.chegada + 10)!;
    const b = gap(j, p.partida - 10)!;
    // Parado, a diferença cresce no ritmo do relógio.
    expect(b - a).toBeGreaterThan((p.partida - p.chegada - 20) * 0.8);
  });
});

describe('diferença com o LÍDER na janela do pit', () => {
  it.each(['pista-spa', 'pista-monaco', 'pista-imola'])(
    '%s: é o tempo real até o líder ter estado ali, pela mesma linha do mapa',
    (id) => {
      const { pista, resultado } = corridaReal(3, id);
      const linha = linhaDoTempoDoPit(resultado, pista);
      const ids = resultado.classificacao.map((c) => c.jogadorId);
      const fim = resultado.classificacao[0].tempoTotal;
      let casos = 0;
      for (let t = 1000; t < fim; t += 1500) {
        const ordem = classificacaoAoVivo(resultado, ids, t, pista.voltas, linha);
        const lider = ordem.find((i) => i.status !== 'dnf')!.jogadorId;
        const hL = resultado.historicoVoltas[lider];
        if (!linha.paradas(lider).some((p) => t >= p.inicio && t < p.fim)) continue;
        const d = diferencasParaLider(resultado, ordem, t, pista.voltas, linha);
        for (const [i, x] of d.entries()) {
          if (x?.tipo !== 'tempo') continue;
          const j = ordem[i].jogadorId;
          const v = linha.progresso(j, resultado.historicoVoltas[j], t);
          // A diferença crua passa no piso; só a primeira da fila é garantidamente a própria.
          const anterior = i > 1 && d[i - 1]?.tipo === 'tempo' ? (d[i - 1] as { ms: number }).ms : 0;
          if (x.ms > anterior) {
            expect(linha.progresso(lider, hL, t - x.ms) * pista.voltas).toBeCloseTo(v * pista.voltas, 3);
            casos++;
          }
        }
      }
      expect(casos).toBeGreaterThan(0);
    },
  );
});

describe('formatarDiferenca', () => {
  it.each<[DiferencaAoLider, string]>([
    [{ tipo: 'lider' }, 'Líder'],
    [{ tipo: 'tempo', ms: 3249 }, '+3,2s'],
    [{ tipo: 'tempo', ms: 0 }, '+0,0s'],
    [{ tipo: 'tempo', ms: 62300 }, '+62,3s'],
    [{ tipo: 'voltas', voltas: 1 }, '+1 V'],
    [{ tipo: 'voltas', voltas: 3 }, '+3 V'],
    [null, ''],
  ])('%j vira %s', (d, texto) => {
    expect(formatarDiferenca(d)).toBe(texto);
  });
});
