import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDataset } from '../engine/dataset';
import { criarDraft, resolverBots } from '../engine/draft';
import type { Jogador, ResultadoCorrida } from '../engine/types';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { hashDaCorrida } from '../net/hash-corrida';
import { caminhoDoBox } from './box';
import {
  acumularVoltas,
  classificacaoAoVivo,
  lutDoTracado,
  MS_REPLAY_POR_VOLTA,
  prepararCorrida,
  progressoNoReplay,
} from './fluxo-corrida';
import {
  custoPitEstimado,
  DISTANCIA_RAMPA,
  ESPACO_VAGA,
  limiteDoBox,
  linhaDoTempoDoPit,
  PISO_PARADO_MS,
  RAZAO_LIMITE_BOX,
} from './pit-replay';
import { VIEWBOX_ALTURA, VIEWBOX_LARGURA, VIEWBOX_X, VIEWBOX_Y } from './pista-camadas';
import { tracadoSuavizado } from './suavizacao';
import { BOXES_POR_PISTA } from './tracados';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const PISTAS = dataset.pistas.map((p) => p.id);

function corridaReal(seed: number, pistaId: string) {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const jogadores = atribuirPerfis(base, seed, 'dificil');
  const estado = resolverBots(criarDraft(dataset, jogadores, seed), dataset);
  return prepararCorrida(dataset, estado, pistaId, seed);
}

/** Corrida sintética de carros idênticos, com `pits[id] = [[volta, custoMs]]`. */
function sintetica(
  voltas: number,
  voltaMs: number,
  pits: Record<string, [number, number][]>,
): ResultadoCorrida {
  const historicoVoltas: Record<string, number[]> = {};
  const voltasDePit: Record<string, number[]> = {};
  for (const [id, lista] of Object.entries(pits)) {
    historicoVoltas[id] = Array.from(
      { length: voltas },
      (_, i) => voltaMs + (lista.find(([v]) => v === i + 1)?.[1] ?? 0),
    );
    voltasDePit[id] = lista.map(([v]) => v);
  }
  const ids = Object.keys(pits);
  return {
    seed: 1,
    classificacao: ids.map((jogadorId, i) => ({
      jogadorId,
      posicao: i + 1,
      pontos: 0,
      tempoTotal: historicoVoltas[jogadorId].reduce((s, x) => s + x, 0),
      paradas: voltasDePit[jogadorId].length,
      status: 'terminou' as const,
      voltasCompletadas: voltas,
    })),
    voltaMaisRapida: { jogadorId: ids[0], tempo: voltaMs },
    eventos: [],
    chuva: false,
    historicoVoltas,
    voltasDePit,
  };
}

function geometria(pistaId: string) {
  const curva = tracadoSuavizado(pistaId);
  const cam = caminhoDoBox(curva, BOXES_POR_PISTA[pistaId]);
  const pontos = cam.amostras.map((a) => a.p);
  let box = 0;
  for (let i = 1; i < pontos.length; i++) box += Math.hypot(pontos[i].x - pontos[i - 1].x, pontos[i].y - pontos[i - 1].y);
  return { perimetro: lutDoTracado(curva).comprimentoTotal, arco: cam.janela.fim - cam.janela.inicio, box, cam };
}

const SPA = { id: 'pista-spa', voltas: 12, tempoBaseMs: 106000 };

describe('fórmula do tempo parado (decisão do Marcos, 2026-11-01)', () => {
  it('parado = custo + trecho de pista substituído − tempo no box (no limite, e as rampas)', () => {
    const volta = SPA.tempoBaseMs;
    const r = sintetica(SPA.voltas, volta, { a: [[5, 22000]] });
    const parada = linhaDoTempoDoPit(r, SPA).paradas('a')[0];
    const { perimetro, arco, box } = geometria(SPA.id);
    const v = perimetro / volta;
    const razao = RAZAO_LIMITE_BOX;
    const trecho = (arco / perimetro) * volta;
    const noBox = box / (razao * v);
    const rampas = ((2 * DISTANCIA_RAMPA) / v) * ((1 - razao) / (1 + razao));
    expect(parada.partida - parada.chegada).toBeCloseTo(22000 + trecho - noBox - rampas, 4);
  });

  it('a diferença de custo entre dois carros fica TODA no tempo parado', () => {
    const r = sintetica(SPA.voltas, SPA.tempoBaseMs, { a: [[5, 21000]], b: [[5, 27000]] });
    const linha = linhaDoTempoDoPit(r, SPA);
    const [a] = linha.paradas('a');
    const [b] = linha.paradas('b');
    expect(b.partida - b.chegada - (a.partida - a.chegada)).toBeCloseTo(6000, 4);
    expect(b.entrada - b.inicio).toBeCloseTo(a.entrada - a.inicio, 6);
    expect(b.retorno - b.partida + (b.chegada - b.entrada)).toBeCloseTo(a.retorno - a.partida + (a.chegada - a.entrada), 6);
  });

  it('a trava segura o parado em 4 s simulados, acelerando o carro no box', () => {
    expect(PISO_PARADO_MS).toBe(4000);
    const r = sintetica(14, 76000, { a: [[5, 1000]] });
    const parada = linhaDoTempoDoPit(r, { id: 'pista-imola', voltas: 14, tempoBaseMs: 76000 }).paradas('a')[0];
    expect(parada.partida - parada.chegada).toBeCloseTo(4000, 6);
    expect(parada.fim).toBeGreaterThan(parada.inicio);
  });
});

describe('limite de velocidade (opção A)', () => {
  it('50% em 8 pistas; Imola e Montreal só no paralelo', () => {
    const excecoes = PISTAS.filter((id) => limiteDoBox(id).soParalelo).sort();
    expect(excecoes).toEqual(['pista-imola', 'pista-montreal']);
    expect(limiteDoBox('pista-imola').razao).toBe(0.55);
    expect(limiteDoBox('pista-montreal').razao).toBe(0.5);
    for (const id of PISTAS.filter((x) => !limiteDoBox(x).soParalelo)) expect(limiteDoBox(id).razao).toBe(0.5);
  });

  it.each([
    ['pista-spa', 12, 106000],
    ['pista-imola', 14, 76000],
  ])('%s: anda no limite nos trechos que a decisão manda, e para na vaga', (id, voltas, tempoBaseMs) => {
    const pista = { id, voltas, tempoBaseMs };
    const r = sintetica(voltas, tempoBaseMs, { a: [[5, 24000]] });
    const linha = linhaDoTempoDoPit(r, pista);
    const p = linha.paradas('a')[0];
    const hist = r.historicoVoltas.a;
    const { perimetro } = geometria(id);
    const limite = limiteDoBox(id).razao * (perimetro / tempoBaseMs);
    const velocidade = (t: number) => {
      const a = linha.posicao('a', hist, 'terminou', t - 50, false).ponto;
      const b = linha.posicao('a', hist, 'terminou', t + 50, false).ponto;
      return Math.hypot(b.x - a.x, b.y - a.y) / 100;
    };
    // Logo antes de parar, sempre no paralelo: limite.
    expect(velocidade(p.chegada - 200)).toBeCloseTo(limite, 3);
    expect(velocidade((p.chegada + p.partida) / 2)).toBe(0);
    expect(velocidade(p.partida + 200)).toBeCloseTo(limite, 3);
    // Depois da junção de saída, acelera: mais rápido no fim da janela que no retorno.
    expect(velocidade(p.fim - 100)).toBeGreaterThan(velocidade(p.retorno + 100) * 1.02);
    if (!limiteDoBox(id).soParalelo) {
      expect(velocidade(p.entrada + 200)).toBeCloseTo(limite, 3);
      expect(velocidade(p.retorno - 200)).toBeCloseTo(limite, 3);
    } else {
      expect(velocidade(p.entrada + 200)).toBeGreaterThan(limite * 1.2);
      expect(velocidade(p.retorno - 200)).toBeGreaterThan(limite * 1.2);
    }
  });
});

describe('vagas dinâmicas', () => {
  it('primeira livre, a 13 u, dentro do trecho paralelo das 10 pistas', () => {
    expect(ESPACO_VAGA).toBe(13);
    for (const id of PISTAS) {
      const pista = dataset.pistasById.get(id)!;
      const r = sintetica(pista.voltas, pista.tempoBaseMs, { a: [[5, 22000]] });
      const linha = linhaDoTempoDoPit(r, pista);
      const { cam } = geometria(id);
      const paralelos = cam.amostras.filter((a) => a.paralelo).map((a) => a.p);
      let trecho = 0;
      for (let i = 1; i < paralelos.length; i++)
        trecho += Math.hypot(paralelos[i].x - paralelos[i - 1].x, paralelos[i].y - paralelos[i - 1].y);
      expect(linha.totalDeVagas).toBe(Math.floor(trecho / ESPACO_VAGA));
      expect(linha.totalDeVagas).toBeGreaterThanOrEqual(5);
      for (let k = 0; k < linha.totalDeVagas; k++) {
        const v = linha.vagaEmX(k);
        expect(Math.min(...paralelos.map((p) => Math.hypot(p.x - v.x, p.y - v.y)))).toBeLessThan(4);
      }
      expect(Math.hypot(linha.vagaEmX(1).x - linha.vagaEmX(0).x, linha.vagaEmX(1).y - linha.vagaEmX(0).y)).toBeGreaterThan(11);
    }
  });

  it('dois carros juntos pegam vagas diferentes, e a vaga livre volta a ser a primeira', () => {
    const r = sintetica(12, 106000, { a: [[3, 22000]], b: [[3, 23000]], c: [[8, 22000]] });
    const linha = linhaDoTempoDoPit(r, SPA);
    const [a, b, c] = ['a', 'b', 'c'].map((id) => linha.paradas(id)[0]);
    expect(a.vaga).toBe(0);
    expect(b.vaga).toBe(1);
    expect(c.vaga).toBe(0);
  });

  it('box cheio: sobrepõe na vaga que libera primeiro, sem sumir com ninguém', () => {
    const pits = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [`c${i}`, [[3, 26000 - i * 100]] as [number, number][]]),
    );
    const r = sintetica(12, 106000, pits);
    const linha = linhaDoTempoDoPit(r, SPA);
    const vagas = Object.keys(pits).map((id) => linha.paradas(id)[0].vaga);
    expect(linha.totalDeVagas).toBeLessThan(8);
    expect(new Set(vagas).size).toBe(linha.totalDeVagas);
  });

  it('box cheio: quem sobra vai para a vaga que libera antes, não para a primeira', () => {
    // c0 chega primeiro e fica 6 s a mais: a vaga 0 libera DEPOIS da vaga 1.
    const pits: Record<string, [number, number][]> = { c0: [[3, 27000]] };
    for (let i = 1; i < 6; i++) pits[`c${i}`] = [[3, 21000]];
    const r = sintetica(12, 106000, pits);
    const linha = linhaDoTempoDoPit(r, SPA);
    expect(linha.totalDeVagas).toBe(5);
    expect(linha.paradas('c0')[0].vaga).toBe(0);
    expect(linha.paradas('c1')[0].vaga).toBe(1);
    expect(linha.paradas('c5')[0].vaga).toBe(1);
  });

  it('box declarado cabe no viewBox nas 10 pistas (pendência 0(av))', () => {
    for (const id of PISTAS) {
      const { cam } = geometria(id);
      for (const { p } of cam.amostras) {
        expect(p.x).toBeGreaterThanOrEqual(VIEWBOX_X + cam.largura / 2);
        expect(p.x).toBeLessThanOrEqual(VIEWBOX_X + VIEWBOX_LARGURA - cam.largura / 2);
        expect(p.y).toBeGreaterThanOrEqual(VIEWBOX_Y + cam.largura / 2);
        expect(p.y).toBeLessThanOrEqual(VIEWBOX_Y + VIEWBOX_ALTURA - cam.largura / 2);
      }
    }
  });
});

describe('progresso do replay', () => {
  it.each(PISTAS)('%s: contínuo, nunca recua, e igual ao antigo fora das paradas', (id) => {
    const { pista, resultado } = corridaReal(4242, id);
    const linha = linhaDoTempoDoPit(resultado, pista);
    expect(Object.values(resultado.voltasDePit).flat().length).toBeGreaterThan(0);
    const fim = resultado.classificacao[0].tempoTotal;
    const passo = (fim / (pista.voltas * MS_REPLAY_POR_VOLTA.rapida)) * (1000 / 60);
    for (const { jogadorId } of resultado.classificacao) {
      const hist = resultado.historicoVoltas[jogadorId];
      const paradas = linha.paradas(jogadorId);
      const acum = [0, ...acumularVoltas(hist)];
      const dentro = (t: number) => paradas.some((p) => t >= acum[p.volta - 1] && t < p.fim);
      let anterior = 0;
      for (let t = 0; t < fim; t += passo) {
        const novo = linha.progresso(jogadorId, hist, t);
        expect(novo).toBeGreaterThanOrEqual(anterior - 1e-12);
        expect(novo - anterior).toBeLessThan(0.01);
        if (!dentro(t)) expect(novo).toBe(progressoNoReplay(hist, t, pista.voltas));
        anterior = novo;
      }
    }
  });

  it.each(PISTAS)('%s: a janela cruza a largada e fecha na linha do tempo do motor, sem teleporte', (id) => {
    const pista = dataset.pistasById.get(id)!;
    const r = sintetica(pista.voltas, pista.tempoBaseMs, { a: [[5, 22000]] });
    const linha = linhaDoTempoDoPit(r, pista);
    const p = linha.paradas('a')[0];
    const hist = r.historicoVoltas.a;
    const acum = acumularVoltas(hist);
    expect(p.inicio).toBeGreaterThan(acum[3]);
    expect(p.fim).toBeGreaterThan(acum[4]);
    expect(p.fim).toBeLessThan(acum[5]);
    // Limite pela esquerda: em `p.fim` exato a função já é `progressoNoReplay`.
    expect(linha.progresso('a', hist, p.fim - 1e-6)).toBeCloseTo(progressoNoReplay(hist, p.fim, pista.voltas), 8);
    expect(linha.progresso('a', hist, p.inicio - 1e-6)).toBeCloseTo(linha.progresso('a', hist, p.inicio), 8);
  });

  it('parado, o progresso congela e os outros passam', () => {
    const r = sintetica(12, 106000, { a: [[5, 22000]], b: [] });
    const linha = linhaDoTempoDoPit(r, SPA);
    const p = linha.paradas('a')[0];
    const hist = r.historicoVoltas.a;
    const meio = (p.chegada + p.partida) / 2;
    expect(linha.progresso('a', hist, meio)).toBe(linha.progresso('a', hist, p.chegada + 1));
    expect(linha.progresso('a', hist, p.inicio)).toBeGreaterThan(progressoNoReplay(hist, p.inicio, SPA.voltas));
  });
});

describe('custo estimado', () => {
  it('vizinhas sem incidente: lê o custo dentro de 1 s na corrida real', () => {
    const { resultado } = corridaReal(4242, 'pista-monza');
    let conferidas = 0;
    for (const { jogadorId } of resultado.classificacao) {
      for (const v of resultado.voltasDePit[jogadorId]) {
        const custo = custoPitEstimado(resultado, jogadorId, v);
        expect(custo).toBeGreaterThan(19000);
        expect(custo).toBeLessThan(30000);
        conferidas++;
      }
    }
    expect(conferidas).toBeGreaterThan(0);
  });

  it('parada na volta 2 não usa a volta 1, que carrega o atraso de grid', () => {
    const r = sintetica(12, 100000, { a: [[2, 22000]] });
    r.historicoVoltas.a[0] += 15000;
    expect(custoPitEstimado(r, 'a', 2)).toBeCloseTo(22000, 6);
  });

  it('desconta incidente nas voltas vizinhas e na própria', () => {
    const r = sintetica(12, 100000, { a: [[5, 22000]] });
    r.historicoVoltas.a[3] += 3000;
    r.historicoVoltas.a[5] += 8000;
    r.eventos = [
      { volta: 4, jogadorId: 'a', tipo: 'erro-piloto', custoMs: 3000 },
      { volta: 6, jogadorId: 'a', tipo: 'problema-tecnico', custoMs: 8000 },
    ];
    expect(custoPitEstimado(r, 'a', 5)).toBeCloseTo(22000, 6);
  });
});

describe('classificação e badge (contrato novo do PR 2c)', () => {
  const r = sintetica(12, 106000, { a: [[5, 22000]], b: [] });
  const grid = ['a', 'b'];

  it('badge só na janela do box, inclusive na volta seguinte, depois da largada', () => {
    const linha = linhaDoTempoDoPit(r, SPA);
    const p = linha.paradas('a')[0];
    const status = (t: number) =>
      classificacaoAoVivo(r, grid, t, SPA.voltas, linha).find((i) => i.jogadorId === 'a')!.status;
    const inicioDaVolta = 4 * 106000;
    expect(status(inicioDaVolta + 1000)).toBe('correndo');
    expect(status(p.entrada - 1)).toBe('correndo');
    expect(status(p.entrada + 1)).toBe('pit');
    expect(status((p.chegada + p.partida) / 2)).toBe('pit');
    expect(p.retorno).toBeGreaterThan(acumularVoltas(r.historicoVoltas.a)[4]);
    expect(status(p.retorno - 1)).toBe('pit');
    expect(status(p.retorno + 1)).toBe('correndo');
  });

  it('com a linha do pit, o painel ainda converge para a classificação final', () => {
    const { resultado, grid: g, pista } = corridaReal(4242, 'pista-monza');
    const linha = linhaDoTempoDoPit(resultado, pista);
    const depois = resultado.classificacao[0].tempoTotal * 10;
    const ordem = classificacaoAoVivo(resultado, g.grid.map((i) => i.jogadorId), depois, pista.voltas, linha);
    const terminaram = resultado.classificacao.filter((c) => c.status === 'terminou').map((c) => c.jogadorId);
    expect(ordem.slice(0, terminaram.length).map((i) => i.jogadorId)).toEqual(terminaram);
  });

  it('a ordem usa o progresso do mapa: quem vai parar segue na frente até a janela', () => {
    const atrasado = sintetica(12, 106000, { a: [[5, 22000]], b: [] });
    atrasado.historicoVoltas.b = atrasado.historicoVoltas.b.map((v) => v + 200);
    const linha = linhaDoTempoDoPit(atrasado, SPA);
    const p = linha.paradas('a')[0];
    const ordem = (t: number) => classificacaoAoVivo(atrasado, grid, t, SPA.voltas, linha).map((i) => i.jogadorId);
    expect(ordem(p.inicio - 1000)[0]).toBe('a');
    expect(ordem(p.fim + 1000)[0]).toBe('b');
  });
});

describe('prefers-reduced-motion', () => {
  it('aparece direto na vaga, fica o mesmo tempo e reaparece na saída', () => {
    const r = sintetica(12, 106000, { a: [[5, 22000]] });
    const linha = linhaDoTempoDoPit(r, SPA);
    const p = linha.paradas('a')[0];
    const hist = r.historicoVoltas.a;
    const vaga = linha.vagaEmX(p.vaga);
    const em = (t: number, reduzido: boolean) => linha.posicao('a', hist, 'terminou', t, reduzido).ponto;
    expect(em(p.entrada + 1, true)).toEqual(vaga);
    expect(em(p.chegada - 1, true)).toEqual(vaga);
    expect(em(p.partida + 1, true)).toEqual(vaga);
    expect(em(p.retorno - 1, true)).toEqual(vaga);
    expect(em(p.entrada + 1, false)).not.toEqual(vaga);
    expect(em(p.retorno + 1, true)).toEqual(em(p.retorno + 1, false));
    expect(em(p.entrada - 1, true)).toEqual(em(p.entrada - 1, false));
  });
});

describe('o resultado não muda (zero engine)', () => {
  /**
   * Calculados com `hashDaCorrida` sobre a `main` `d9e8916`, antes de qualquer linha do PR 2c.
   * Mudar o formato de `hash-corrida.ts` também os quebra: aí a falha não acusa o replay.
   */
  const HASHES: Record<string, string> = {
    'pista-monaco': 'cfcc69eb1c72038b',
    'pista-spa': '302abd4d6c544254',
    'pista-monza': '26e38c22535fea13',
    'pista-silverstone': 'c0314f3ddf8ef948',
    'pista-suzuka': '714ae70882bb6f22',
    'pista-interlagos': 'a91303646c5883ae',
    'pista-nurburgring': '0896a2f5888a669e',
    'pista-imola': '763021926b0e1e82',
    'pista-red-bull-ring': 'fdd5f289f64ce7ae',
    'pista-montreal': '7303159f70279aa0',
  };

  it.each(PISTAS)('%s: hash golden, e o replay inteiro não toca no resultado congelado', (id) => {
    const preparada = corridaReal(777, id);
    const corrida = { pistaId: id, ...preparada };
    const antes = JSON.stringify(preparada.resultado);
    const congelar = <T>(o: T): T => {
      if (typeof o === 'object' && o !== null) {
        Object.values(o).forEach(congelar);
        Object.freeze(o);
      }
      return o;
    };
    congelar(preparada.resultado);
    const linha = linhaDoTempoDoPit(preparada.resultado, preparada.pista);
    const fim = preparada.resultado.classificacao[0].tempoTotal;
    const grid = preparada.grid.grid.map((g) => g.jogadorId);
    for (let t = 0; t < fim; t += fim / 400) {
      classificacaoAoVivo(preparada.resultado, grid, t, preparada.pista.voltas, linha);
      for (const c of preparada.resultado.classificacao)
        linha.posicao(c.jogadorId, preparada.resultado.historicoVoltas[c.jogadorId], c.status, t, false);
    }
    expect(JSON.stringify(preparada.resultado)).toBe(antes);
    expect(hashDaCorrida(corrida)).toBe(HASHES[id]);
  });
});

describe('rumo do carro (PR 2a)', () => {
  /** Diferença entre dois ângulos em graus, no menor sentido. */
  const giro = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

  it.each(PISTAS)('%s: aponta para onde o carro anda, na pista e no box', (id) => {
    const { pista, resultado } = corridaReal(3, id);
    const linha = linhaDoTempoDoPit(resultado, pista);
    const { jogadorId, status } = resultado.classificacao[0];
    const historico = resultado.historicoVoltas[jogadorId];
    const paradas = Object.keys(resultado.voltasDePit).flatMap((j) =>
      linha.paradas(j).map((p) => ({ j, p })),
    );
    const casos: [string, number, 'terminou' | 'dnf'][] = [
      [jogadorId, acumularVoltas(historico)[1] * 0.3, status],
      [jogadorId, acumularVoltas(historico)[1] * 0.8, status],
    ];
    if (paradas.length > 0) {
      const { j, p } = paradas[0];
      casos.push([j, (p.entrada + p.chegada) / 2, 'terminou'], [j, (p.partida + p.retorno) / 2, 'terminou']);
    }
    for (const [j, t, st] of casos) {
      const h = resultado.historicoVoltas[j];
      const antes = linha.posicao(j, h, st, t - 400, false).ponto;
      const depois = linha.posicao(j, h, st, t + 400, false).ponto;
      const andado = (Math.atan2(depois.y - antes.y, depois.x - antes.x) * 180) / Math.PI;
      expect(giro(linha.posicao(j, h, st, t, false).rumo, andado)).toBeLessThan(25);
    }
  });

  it.each(PISTAS)('%s: atravessa a janela do pit sem girar de repente', (id) => {
    const { pista, resultado } = corridaReal(3, id);
    const linha = linhaDoTempoDoPit(resultado, pista);
    for (const j of Object.keys(resultado.voltasDePit)) {
      const h = resultado.historicoVoltas[j];
      for (const p of linha.paradas(j)) {
        let anterior = linha.posicao(j, h, 'terminou', p.inicio, false);
        for (let t = p.inicio; t <= p.fim; t += 150) {
          const agora = linha.posicao(j, h, 'terminou', t, false);
          const andado = Math.hypot(agora.ponto.x - anterior.ponto.x, agora.ponto.y - anterior.ponto.y);
          // Girar exige andar: 4° por u cobre a curva mais fechada do box e pega um salto.
          expect(giro(agora.rumo, anterior.rumo)).toBeLessThanOrEqual(12 + andado * 4);
          anterior = agora;
        }
      }
    }
  });

  it('parado na vaga mantém o rumo, com e sem movimento reduzido', () => {
    const { pista, resultado } = corridaReal(3, 'pista-spa');
    const linha = linhaDoTempoDoPit(resultado, pista);
    const j = Object.keys(resultado.voltasDePit).find((x) => linha.paradas(x).length > 0)!;
    const h = resultado.historicoVoltas[j];
    const p = linha.paradas(j)[0];
    const meio = (p.chegada + p.partida) / 2;
    const parado = linha.posicao(j, h, 'terminou', meio, false);
    expect(linha.posicao(j, h, 'terminou', p.chegada + 1, false).rumo).toBe(parado.rumo);
    expect(linha.posicao(j, h, 'terminou', p.partida - 1, false).rumo).toBe(parado.rumo);
    // Reduzido: o carro já aparece na vaga, e aponta como quem está nela.
    expect(linha.posicao(j, h, 'terminou', p.entrada + 1, true).rumo).toBe(parado.rumo);
  });

  it('só o carro na pista tem fração de pista: no box ela é nula', () => {
    const { pista, resultado } = corridaReal(3, 'pista-spa');
    const linha = linhaDoTempoDoPit(resultado, pista);
    const j = Object.keys(resultado.voltasDePit).find((x) => linha.paradas(x).length > 0)!;
    const h = resultado.historicoVoltas[j];
    const p = linha.paradas(j)[0];
    expect(linha.posicao(j, h, 'terminou', (p.chegada + p.partida) / 2, false).fracaoNaPista).toBeNull();
    expect(linha.posicao(j, h, 'terminou', p.inicio + 1, false).fracaoNaPista).not.toBeNull();
    expect(linha.posicao(j, h, 'terminou', p.fim + 1, false).fracaoNaPista).not.toBeNull();
  });

  it('o DNF parado e o carro na chegada seguem com rumo definido', () => {
    const { pista, resultado } = corridaReal(3, 'pista-spa');
    const linha = linhaDoTempoDoPit(resultado, pista);
    const { jogadorId } = resultado.classificacao[0];
    const h = resultado.historicoVoltas[jogadorId];
    const fim = acumularVoltas(h).at(-1)! + 1000;
    expect(Number.isFinite(linha.posicao(jogadorId, h, 'terminou', fim, false).rumo)).toBe(true);
    expect(Number.isFinite(linha.posicao(jogadorId, h, 'dnf', fim, false).rumo)).toBe(true);
  });
});
