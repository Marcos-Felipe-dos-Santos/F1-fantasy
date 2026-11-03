import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDataset } from '../engine/dataset';
import { criarDraft, resolverBots } from '../engine/draft';
import type { Jogador, ResultadoCorrida } from '../engine/types';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { hashDaCorrida } from '../net/hash-corrida';
import { diferencasParaLider } from './diferenca-lider';
import { replayDaCorrida } from './fim-da-corrida';
import { acumularVoltas, classificacaoAoVivo, prepararCorrida } from './fluxo-corrida';
import { narrarEventos, textoDaConsequencia } from './narracao';
import { linhaDoTempoDoPit, type ParadaNoReplay } from './pit-replay';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const PISTAS = dataset.pistas.map((p) => p.id);
const PISTA = { id: 'pista-monza', voltas: 10, tempoBaseMs: 90_000 };
const CUSTO_PIT = 24_000;

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
  pits?: number[];
  punicao?: number;
}

/** Voltas constantes; a volta de pit custa `CUSTO_PIT` a mais. Classificação pela regra da engine. */
function sintetica(carros: Record<string, CarroSintetico>): ResultadoCorrida {
  const historico = Object.fromEntries(
    Object.entries(carros).map(([id, c]) => [
      id,
      Array.from({ length: PISTA.voltas }, (_, i) => c.ms + ((c.pits ?? []).includes(i + 1) ? CUSTO_PIT : 0)),
    ]),
  );
  const classificacao = Object.entries(carros)
    .map(([jogadorId, c]) => ({
      jogadorId,
      posicao: 0,
      pontos: 0,
      tempoTotal: historico[jogadorId].reduce((s, x) => s + x, 0) + (c.punicao ?? 0),
      paradas: (c.pits ?? []).length,
      status: 'terminou' as const,
      voltasCompletadas: PISTA.voltas,
    }))
    .sort((a, b) => a.tempoTotal - b.tempoTotal)
    .map((c, i) => ({ ...c, posicao: i + 1 }));
  return {
    seed: 11,
    classificacao,
    voltaMaisRapida: { jogadorId: classificacao[0].jogadorId, tempo: 1 },
    historicoVoltas: historico,
    voltasDePit: Object.fromEntries(Object.entries(carros).map(([id, c]) => [id, c.pits ?? []])),
    eventos: Object.entries(carros)
      .filter(([, c]) => c.punicao !== undefined)
      .map(([jogadorId, c]) => ({ volta: PISTA.voltas, jogadorId, tipo: 'investigacao' as const, custoMs: c.punicao ?? 0 })),
    chuva: false,
  } as ResultadoCorrida;
}

/** A mesma corrida sem a punição: o replay de antes do PR 2f, na mesma ordem oficial. */
const semPunicao = (r: ResultadoCorrida): ResultadoCorrida => ({
  ...r,
  eventos: r.eventos.filter((e) => e.tipo !== 'investigacao'),
});
const soma = (r: ResultadoCorrida, id: string) => acumularVoltas(r.historicoVoltas[id]).at(-1) ?? 0;
const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Pares na mesma vaga com ocupações [chegada, partida) sobrepostas, fora do box cheio. */
function colisoesForaDoBoxCheio(paradas: readonly (ParadaNoReplay & { id: string })[]): number {
  let n = 0;
  for (const q of paradas) {
    for (const p of paradas) {
      if (p === q || p.vaga !== q.vaga || p.chegada > q.chegada || (p.chegada === q.chegada && p.id >= q.id)) continue;
      if (q.chegada < p.partida && !q.boxCheio) n++;
    }
  }
  return n;
}

describe('punição cumprida no último pit (PR 2f)', () => {
  const r = sintetica({ a: { ms: 90_000 }, b: { ms: 91_000, pits: [3, 7], punicao: 7000 } });
  const replay = replayDaCorrida(r, PISTA);
  const antes = replayDaCorrida(semPunicao(r), PISTA);
  const h = r.historicoVoltas.b;
  const base = antes.paradas('b')[1];
  const punicao = () => replay.punicao('b');

  it('é cumprida no último pit, e o selo some', () => {
    expect(punicao()?.parada.volta).toBe(7);
    expect(punicao()?.ms).toBe(7000);
    expect(replay.punicaoMs('b')).toBe(0);
  });

  it('o carro fica X s a mais parado na vaga', () => {
    const parada = replay.paradas('b')[1];
    expect(parada.chegada).toBe(base.chegada);
    expect(parada.partida).toBe(base.partida + 7000);
    expect(parada.fim).toBe(base.fim + 7000);
    for (const t of [base.partida, base.partida + 3500, base.partida + 6999]) {
      expect(replay.noBox('b', t)).toBe(true);
      expect(replay.posicao('b', h, 'terminou', t, false).ponto).toEqual(replay.vagaEmX(parada.vaga));
      expect(replay.progresso('b', h, t)).toBe(antes.progresso('b', h, base.chegada));
    }
  });

  it('com movimento reduzido também fica na vaga', () => {
    const parada = replay.paradas('b')[1];
    expect(replay.posicao('b', h, 'terminou', base.partida + 3500, true).ponto).toEqual(replay.vagaEmX(parada.vaga));
  });

  it('sai da vaga sem salto, e dali em diante é a corrida de antes atrasada X', () => {
    const t0 = base.partida + 7000;
    const ponto = (t: number) => replay.posicao('b', h, 'terminou', t, false).ponto;
    expect(distancia(ponto(t0 - 1), ponto(t0 + 1))).toBeLessThan(1);
    for (const t of [t0, t0 + 10_000, t0 + 100_000, soma(r, 'b')]) {
      expect(replay.progresso('b', h, t)).toBe(antes.progresso('b', h, t - 7000));
    }
  });

  it('antes da espera, nada muda', () => {
    for (const t of [0, 100_000, base.inicio, base.chegada, base.partida - 1]) {
      expect(replay.progresso('b', h, t)).toBe(antes.progresso('b', h, t));
    }
  });

  it('cruza a linha no tempo total oficial', () => {
    expect(replay.chegada('b')?.instante).toBeCloseTo(soma(r, 'b') + 7000, 3);
    const oficial = r.classificacao.find((c) => c.jogadorId === 'b')?.tempoTotal ?? 0;
    expect(replay.chegada('b')?.instante).toBeCloseTo(oficial, 3);
  });

  it('a infração sai antes do pit da punição e depois do pit anterior', () => {
    const anterior = replay.paradas('b')[0];
    expect(punicao()?.infracao).toBeGreaterThanOrEqual(anterior.fim);
    expect(punicao()?.infracao).toBeLessThan(base.inicio);
    expect(punicao()?.voltaDaInfracao).toBeGreaterThanOrEqual(anterior.volta);
    expect(punicao()?.voltaDaInfracao).toBeLessThanOrEqual(7);
  });
});

describe('selo de reserva: punido sem pit', () => {
  const r = sintetica({ a: { ms: 90_000 }, b: { ms: 91_000, punicao: 6000 } });
  const replay = replayDaCorrida(r, PISTA);

  it('não há pit para cumprir: o selo leva a punição, e a linha é a de antes', () => {
    expect(replay.punicao('b')).toBeUndefined();
    expect(replay.punicaoMs('b')).toBe(6000);
    expect(replay.chegada('b')?.instante).toBe(soma(r, 'b'));
  });

  it('o ticker narra uma vez, na passagem pela linha', () => {
    const narradas = narrarEventos(r, replay).filter((n) => n.evento.tipo === 'investigacao');
    expect(narradas).toHaveLength(1);
    expect(narradas[0].instante).toBe(replay.chegada('b')?.instante);
    expect(textoDaConsequencia(narradas[0])).toBe(' e levou +6,0 s');
  });
});

describe('bandeirada com a punição cumprida', () => {
  // `a` é mais rápido na pista, mas a punição o põe atrás de `b` na classificação oficial.
  const r = sintetica({ a: { ms: 90_000, pits: [5], punicao: 9000 }, b: { ms: 90_500, pits: [5] } });
  const replay = replayDaCorrida(r, PISTA);

  it('pré-condição: o vencedor oficial não é o mais rápido na pista', () => {
    expect(r.classificacao[0].jogadorId).toBe('b');
    expect(soma(r, 'a')).toBeLessThan(soma(r, 'b'));
  });

  it('o primeiro a cruzar é o vencedor oficial', () => {
    expect(replay.bandeirada).toBeCloseTo(soma(r, 'b'), 3);
    expect(replay.chegada('b')?.instante).toBeLessThan(replay.chegada('a')?.instante ?? 0);
  });
});

describe('pit da punição: o último visível pela chegada ANTES da punição (decisão do Marcos)', () => {
  // `a` cumpre 10 s e atrasa a bandeirada. `c`, retardatário, cruzava a volta 8 logo depois da
  // bandeirada de antes, e com a nova faz a volta 9 inteira, com o pit dela.
  const r = sintetica({
    a: { ms: 90_000, pits: [5], punicao: 10_000 },
    c: { ms: 112_600, pits: [5, 9], punicao: 5000 },
  });
  const replay = replayDaCorrida(r, PISTA);
  const antes = replayDaCorrida(semPunicao(r), PISTA);

  it('pré-condição: sem punição, `c` termina na volta 8, antes do pit da volta 9', () => {
    expect(antes.chegada('c')?.voltas).toBe(8);
    expect(antes.paradas('c')[1].inicio).toBeGreaterThan(antes.chegada('c')?.instante ?? Infinity);
  });

  it('pré-condição: com a bandeirada nova, `c` faz a volta 9 e o pit dela aparece', () => {
    expect(replay.chegada('c')?.voltas).toBe(9);
    expect(replay.paradas('c')[1].inicio).toBeLessThan(replay.chegada('c')?.instante ?? 0);
  });

  it('a punição de `c` é cumprida no pit da volta 5', () => {
    expect(replay.punicao('c')?.parada.volta).toBe(5);
  });
});

describe('vagas', () => {
  // `c` chega à mesma região do box logo depois de `b` sair: com a espera, `b` ainda está lá.
  const r = sintetica({ b: { ms: 90_000, pits: [5], punicao: 10_000 }, c: { ms: 93_000, pits: [5] } });
  const replay = replayDaCorrida(r, PISTA);
  const antes = linhaDoTempoDoPit(semPunicao(r), PISTA);

  it('pré-condição: sem punição, `c` usa a vaga que `b` deixou', () => {
    expect(antes.paradas('c')[0].vaga).toBe(antes.paradas('b')[0].vaga);
    expect(antes.paradas('c')[0].chegada).toBeLessThan(antes.paradas('b')[0].partida + 10_000);
  });

  it('com a espera, `c` vai para outra vaga, e ninguém divide vaga fora do box cheio', () => {
    expect(replay.paradas('c')[0].vaga).not.toBe(replay.paradas('b')[0].vaga);
    const todas = ['b', 'c'].flatMap((id) => replay.paradas(id).map((p) => ({ ...p, id })));
    expect(colisoesForaDoBoxCheio(todas)).toBe(0);
  });

  it.each(PISTAS)('%s: corridas reais, sem colisão fora do box cheio', (pistaId) => {
    for (let seed = 1; seed <= 6; seed++) {
      const { resultado, pista } = corridaReal(seed, pistaId);
      const rep = replayDaCorrida(resultado, pista);
      const todas = Object.keys(resultado.historicoVoltas).flatMap((id) => rep.paradas(id).map((p) => ({ ...p, id })));
      expect(colisoesForaDoBoxCheio(todas)).toBe(0);
    }
  });
});

describe('diferença para o líder na chegada do punido', () => {
  const r = sintetica({ a: { ms: 90_000 }, b: { ms: 91_000, pits: [6], punicao: 8000 } });
  const replay = replayDaCorrida(r, PISTA);
  const ids = Object.keys(r.historicoVoltas);
  const diferenca = (t: number) => {
    const ordem = classificacaoAoVivo(r, ids, t, PISTA.voltas, replay);
    const d = diferencasParaLider(r, ordem, t, PISTA.voltas, replay)[ordem.findIndex((i) => i.jogadorId === 'b')];
    return d?.tipo === 'tempo' ? d.ms : NaN;
  };

  it('não salta X quando ele cruza a linha: a punição já foi paga na pista', () => {
    const t = replay.chegada('b')?.instante ?? 0;
    expect(Math.abs(diferenca(t + 1) - diferenca(t - 1))).toBeLessThan(500);
  });
});

describe('narração da punição cumprida', () => {
  const r = sintetica({ a: { ms: 90_000 }, b: { ms: 91_000, pits: [3, 7], punicao: 7400 } });
  const replay = replayDaCorrida(r, PISTA);
  const narradas = narrarEventos(r, replay).filter((n) => n.evento.tipo === 'investigacao');
  const punicao = () => replay.punicao('b');

  it('narra duas vezes: quando sai e quando é cumprida, nessa ordem', () => {
    expect(narradas).toHaveLength(2);
    expect(narradas[0].instante).toBe(punicao()?.infracao);
    expect(narradas[1].instante).toBe(punicao()?.parada.partida);
    expect(narradas[0].volta).toBe(punicao()?.voltaDaInfracao);
    expect(narradas[1].volta).toBe(7);
  });

  it('as duas linhas têm chave própria e dizem o valor', () => {
    expect(narradas[0].chave).not.toBe(narradas[1].chave);
    expect(textoDaConsequencia(narradas[0])).toBe(': +7,4 s, a cumprir no box');
    expect(narradas[1].frase).toBe('cumpriu a punição no box');
    expect(textoDaConsequencia(narradas[1])).toBe(' e ficou +7,4 s a mais parado');
    expect(narradas.every((n) => !n.foiParaOsBoxes)).toBe(true);
  });

  it('determinismo: mesma corrida, mesmo instante da infração', () => {
    const outra = replayDaCorrida(sintetica({ a: { ms: 90_000 }, b: { ms: 91_000, pits: [3, 7], punicao: 7400 } }), PISTA);
    expect(outra.punicao('b')?.infracao).toBe(punicao()?.infracao);
  });
});

describe('o resultado não muda (zero engine)', () => {
  /**
   * Seed 1: tem punição cumprida nas 10 pistas. Hashes calculados nesta branch, com
   * `git diff e1cfba8` (a `main` com o PR 2d) vazio em `src/engine/`, `src/data/`,
   * `src/fixtures/`, `hash-corrida.ts` e `fluxo-corrida.ts`, que é tudo o que o hash lê.
   */
  const HASHES: Record<string, string> = {
    'pista-monaco': 'fc9d8e2ad5bc9617',
    'pista-spa': '3359192ca897faca',
    'pista-monza': '4ba65c036f8e6076',
    'pista-silverstone': '7cd9afa893918c8e',
    'pista-suzuka': '9aa381e0895e4c8e',
    'pista-interlagos': 'a1ac4532c4ae5a2a',
    'pista-nurburgring': '537a0bb804a1cd9a',
    'pista-imola': '5622c0945fe80c27',
    'pista-red-bull-ring': 'e5ec62b1709b4ab3',
    'pista-montreal': 'e92ebcdea32b32a1',
  };

  it.each(PISTAS)('%s: com punição cumprida, o replay inteiro não toca no resultado, e o hash é o mesmo', (id) => {
    const preparada = corridaReal(1, id);
    const antes = JSON.stringify(preparada.resultado);
    const congelar = <T>(o: T): T => {
      if (typeof o === 'object' && o !== null) {
        Object.values(o).forEach(congelar);
        Object.freeze(o);
      }
      return o;
    };
    congelar(preparada.resultado);
    const replay = replayDaCorrida(preparada.resultado, preparada.pista);
    const ids = preparada.resultado.classificacao.map((c) => c.jogadorId);
    expect(ids.some((j) => replay.punicao(j) !== undefined)).toBe(true);
    narrarEventos(preparada.resultado, replay);
    for (let t = 0; t <= replay.fim; t += replay.fim / 300) {
      const ordem = classificacaoAoVivo(preparada.resultado, ids, t, preparada.pista.voltas, replay);
      diferencasParaLider(preparada.resultado, ordem, t, preparada.pista.voltas, replay);
      for (const c of preparada.resultado.classificacao) {
        replay.posicao(c.jogadorId, preparada.resultado.historicoVoltas[c.jogadorId], c.status, t, false);
      }
    }
    expect(JSON.stringify(preparada.resultado)).toBe(antes);
    expect(hashDaCorrida({ pistaId: id, ...preparada })).toBe(HASHES[id]);
  });
});
