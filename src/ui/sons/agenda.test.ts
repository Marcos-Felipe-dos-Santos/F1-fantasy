import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../../engine/bots';
import { criarDataset } from '../../engine/dataset';
import { criarDraft, resolverBots } from '../../engine/draft';
import type { Jogador } from '../../engine/types';
import equipeAnosReal from '../../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../../fixtures/dataset-semente/pecas.json';
import pistasReal from '../../fixtures/dataset-semente/pistas.json';
import { replayDaCorrida } from '../fim-da-corrida';
import { prepararCorrida } from '../fluxo-corrida';
import {
  admitir,
  ALCANCE_U,
  ANTERIOR_MAX_REAL_MS,
  distanciaAoMaisProximo,
  DURACAO_PROBLEMA_MS,
  ehPrioritario,
  somDaCategoria,
  FATOR_OUTROS_NAO_PASSAGEM,
  GANHO_CATEGORIA,
  HORIZONTE_REAL_MS,
  SIM_ANTES_DA_LARGADA,
  sonsDaPassagem,
  BONUS_PRIORITARIO,
  DELTA_SALTO_MS,
  detectarPassagens,
  duracaoRealMs,
  eventosDaCorrida,
  eventosNoIntervalo,
  focoDoSom,
  ganhoDoEvento,
  GANHO_LENTA,
  GANHO_MAX_OUTROS,
  GANHO_MIN,
  GANHO_MOTOR,
  GANHO_SEM_FOCO,
  HISTERESE,
  JANELA_AGRUPAR_MS,
  mixerVazio,
  passagensVazias,
  PERTO_U,
  prioritarios,
  PRIORIDADE,
  somDoMotor,
  TETO_VOZES,
  velocidadeEntre,
  type EventoSom,
  type EstadoMixer,
} from './agenda';
import { CATALOGO_SONS } from './catalogo';
import { DURACAO_EFEITO_MS } from '../incidentes-replay';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

function corridaReal(seed: number, pistaId: string) {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({ id: `j${String(i + 1).padStart(2, '0')}`, tipo: 'bot' as const }));
  const estado = resolverBots(criarDraft(dataset, atribuirPerfis(base, seed, 'dificil'), seed), dataset);
  return prepararCorrida(dataset, estado, pistaId, seed);
}

/** Primeira corrida real com pit, incidente E abandono: assim cada categoria tem o que conferir. */
function corridaCompleta() {
  for (const pista of dataset.pistas) {
    for (let seed = 1; seed < 300; seed++) {
      const c = corridaReal(seed, pista.id);
      const r = replayDaCorrida(c.resultado, c.pista);
      const ids = c.resultado.classificacao.map((x) => x.jogadorId);
      const temPit = ids.some((id) => r.paradas(id).length > 0);
      const tipos = new Set(ids.flatMap((id) => r.incidentes(id).map((x) => x.evento.tipo)));
      const temIncidente = tipos.has('erro-piloto') && tipos.has('problema-tecnico');
      const temAbandono = ids.some((id) => r.abandono(id) !== undefined);
      if (temPit && temIncidente && temAbandono && Number.isFinite(r.bandeirada)) return { c, r, ids };
    }
  }
  throw new Error('sem corrida completa no dataset-semente');
}

describe('eventosDaCorrida', () => {
  const { r, ids } = corridaCompleta();
  const ev = eventosDaCorrida(r, ids);

  it('uma largada, sem carro, no instante 0', () => {
    const largadas = ev.filter((e) => e.cat === 'largada');
    expect(largadas).toEqual([{ cat: 'largada', carro: null, t: 0 }]);
  });

  it('uma pistola por parada, da chegada à partida da vaga', () => {
    const esperadas = ids.flatMap((id) => r.paradas(id).map((p) => ({ cat: 'pistola', carro: id, t: p.chegada, fim: p.partida })));
    const pistolas = ev.filter((e) => e.cat === 'pistola');
    expect(pistolas).toHaveLength(esperadas.length);
    expect(pistolas).toEqual(expect.arrayContaining(esperadas));
    expect(pistolas.every((p) => p.fim! > p.t)).toBe(true);
  });

  it('derrapagem só no erro de pilotagem; problema técnico tem som próprio (decisão do Marcos, 2026-11-06)', () => {
    const doTipo = (tipo: string, cat: string) =>
      ids.flatMap((id) => r.incidentes(id).filter((x) => x.evento.tipo === tipo).map((x) => ({ cat, carro: id, t: x.inicio })));
    const derrapagens = doTipo('erro-piloto', 'derrapagem');
    const problemas = doTipo('problema-tecnico', 'problema');
    expect(derrapagens.length).toBeGreaterThan(0);
    expect(problemas.length).toBeGreaterThan(0);
    expect(ev.filter((e) => e.cat === 'derrapagem')).toEqual(expect.arrayContaining(derrapagens));
    expect(ev.filter((e) => e.cat === 'derrapagem')).toHaveLength(derrapagens.length);
    expect(ev.filter((e) => e.cat === 'problema')).toEqual(expect.arrayContaining(problemas));
    expect(ev.filter((e) => e.cat === 'problema')).toHaveLength(problemas.length);
  });

  it('um abandono no instante de cada DNF', () => {
    const esperados = ids.flatMap((id) => {
      const a = r.abandono(id);
      return a ? [{ cat: 'abandono', carro: id, t: a.instante }] : [];
    });
    expect(esperados.length).toBeGreaterThan(0);
    expect(ev.filter((e) => e.cat === 'abandono')).toEqual(expect.arrayContaining(esperados));
    expect(ev.filter((e) => e.cat === 'abandono')).toHaveLength(esperados.length);
  });

  it('a torcida vai da bandeirada ao fim do replay', () => {
    expect(ev.filter((e) => e.cat === 'torcida')).toEqual([{ cat: 'torcida', carro: null, t: r.bandeirada, fim: r.fim }]);
  });

  it('em ordem de tempo e determinística', () => {
    for (let i = 1; i < ev.length; i++) expect(ev[i].t).toBeGreaterThanOrEqual(ev[i - 1].t);
    expect(eventosDaCorrida(r, ids)).toEqual(ev);
    // A ordem dos ids não muda a lista: empate no tempo se desfaz por categoria e carro.
    expect(eventosDaCorrida(r, [...ids].reverse())).toEqual(ev);
  });

  it('empate no tempo: categoria, depois carro por code unit (sem collation do host)', () => {
    const ev3 = {
      ...r,
      paradas: () => [],
      incidentes: (id: string) => (id === 'B' || id === 'a' ? [{ inicio: 50, evento: { tipo: 'erro-piloto' } } as never] : []),
      abandono: (id: string) => (id === 'a' ? ({ instante: 50 } as never) : undefined),
      bandeirada: Infinity,
      fim: 100,
    };
    // 'B' (66) vem antes de 'a' (97) por code unit; a collation ICU diria o contrário.
    expect(eventosDaCorrida(ev3, ['a', 'B']).map((e) => `${e.cat}:${e.carro}`)).toEqual([
      'largada:null',
      'derrapagem:B',
      'derrapagem:a',
      'abandono:a',
    ]);
  });

  it('sem bandeirada (ninguém terminou), sem torcida', () => {
    const semFim = { ...r, paradas: () => [], incidentes: () => [], abandono: () => undefined, bandeirada: Infinity, fim: 5000 };
    expect(eventosDaCorrida(semFim, ['a'])).toEqual([{ cat: 'largada', carro: null, t: 0 }]);
  });
});

describe('foco e prioridade (decisão do Marcos, 2026-11-06)', () => {
  it('um humano no aparelho: o motor é o dele', () => {
    expect(focoDoSom(['h1'], undefined)).toBe('h1');
  });
  it('dois ou mais humanos no aparelho: nenhum motor em destaque', () => {
    expect(focoDoSom(['h1', 'h2'], undefined)).toBeNull();
  });
  it('online: o jogador local; espectador: nenhum', () => {
    expect(focoDoSom(['h1', 'h2'], 'h2')).toBe('h2');
    expect(focoDoSom(['h1', 'h2'], null)).toBeNull();
    // Espectador numa sala com um humano só: continua sem motor (não cai na regra do Single).
    expect(focoDoSom(['h1'], null)).toBeNull();
  });
  it('sem humano: nenhum', () => {
    expect(focoDoSom([], undefined)).toBeNull();
  });
  it('prioridade: todo humano no aparelho; online, só o local; espectador, ninguém', () => {
    expect([...prioritarios(['h1', 'h2'], undefined)].sort()).toEqual(['h1', 'h2']);
    expect([...prioritarios(['h1', 'h2'], 'h1')]).toEqual(['h1']);
    expect([...prioritarios(['h1', 'h2'], null)]).toEqual([]);
  });
  it('no mixer, largada e torcida (da corrida) e os eventos de quem joga aqui são prioritários', () => {
    const prio = new Set(['h1']);
    expect(ehPrioritario({ cat: 'largada', carro: null, t: 0 }, prio)).toBe(true);
    expect(ehPrioritario({ cat: 'torcida', carro: null, t: 0 }, prio)).toBe(true);
    expect(ehPrioritario({ cat: 'pistola', carro: 'h1', t: 0 }, prio)).toBe(true);
    expect(ehPrioritario({ cat: 'pistola', carro: 'b1', t: 0 }, prio)).toBe(false);
  });
  it('na chuva, a passagem leva o spray junto', () => {
    expect(sonsDaPassagem(false)).toEqual(['passagem']);
    expect(sonsDaPassagem(true)).toEqual(['passagem', 'spray']);
  });
});

describe('ganhoDoEvento', () => {
  const ev = (cat: EventoSom['cat'], carro: string | null): EventoSom => ({ cat, carro, t: 0 });
  const prio = new Set(['h1']);
  it('os ajustes por categoria são os do preview aprovado; o problema técnico, mais baixo', () => {
    expect(GANHO_CATEGORIA).toEqual({ largada: 1, torcida: 0.9, abandono: 1, derrapagem: 1, problema: 0.6, pistola: 0.9, passagem: 0.75, spray: 0.5 });
    expect(FATOR_OUTROS_NAO_PASSAGEM).toBe(0.8);
  });
  it('largada e torcida: só o ajuste da categoria', () => {
    expect(ganhoDoEvento(ev('largada', null), prio, null)).toBe(1);
    expect(ganhoDoEvento(ev('torcida', null), prio, 900)).toBe(0.9);
  });
  it('evento de humano prioritário: cheio, longe ou perto (só o ajuste da categoria)', () => {
    expect(ganhoDoEvento(ev('pistola', 'h1'), prio, ALCANCE_U * 3)).toBe(0.9);
    expect(ganhoDoEvento(ev('pistola', 'h1'), prio, null)).toBe(0.9);
    expect(ganhoDoEvento(ev('derrapagem', 'h1'), prio, ALCANCE_U * 3)).toBe(1);
  });
  it('dos outros: atenuado pela distância ao humano mais próximo, entre o mínimo e o máximo, × 0,8 fora da passagem', () => {
    expect(ganhoDoEvento(ev('derrapagem', 'b1'), prio, 0)).toBeCloseTo(GANHO_MAX_OUTROS * 0.8, 10);
    expect(ganhoDoEvento(ev('derrapagem', 'b1'), prio, ALCANCE_U / 2)).toBeCloseTo(0.5 * 0.8, 10);
    expect(ganhoDoEvento(ev('derrapagem', 'b1'), prio, ALCANCE_U * 2)).toBeCloseTo(GANHO_MIN * 0.8, 10);
    expect(ganhoDoEvento(ev('pistola', 'b1'), prio, 0)).toBeCloseTo(GANHO_MAX_OUTROS * 0.8 * 0.9, 10);
    expect(ganhoDoEvento(ev('problema', 'b1'), prio, 0)).toBeCloseTo(GANHO_MAX_OUTROS * 0.8 * 0.6, 10);
    expect(ganhoDoEvento(ev('passagem', 'b1'), prio, 0)).toBeCloseTo(GANHO_MAX_OUTROS * 0.75, 10);
    expect(ganhoDoEvento(ev('spray', 'b1'), prio, 0)).toBeCloseTo(GANHO_MAX_OUTROS * 0.5, 10);
  });
  it('sem humano em pista (espectador online, todos fora): volume médio fixo', () => {
    expect(ganhoDoEvento(ev('derrapagem', 'b1'), new Set(), null)).toBe(GANHO_SEM_FOCO);
    expect(ganhoDoEvento(ev('derrapagem', 'b1'), prio, null)).toBe(GANHO_SEM_FOCO);
    expect(ganhoDoEvento(ev('pistola', 'b1'), prio, null)).toBeCloseTo(GANHO_SEM_FOCO * 0.9, 10);
  });
  it('distância ao humano mais próximo (decisão do Marcos, 2026-11-06)', () => {
    expect(distanciaAoMaisProximo({ x: 0, y: 0 }, [])).toBeNull();
    expect(distanciaAoMaisProximo({ x: 0, y: 0 }, [{ x: 300, y: 400 }])).toBe(500);
    expect(distanciaAoMaisProximo({ x: 0, y: 0 }, [{ x: 300, y: 400 }, { x: 0, y: 30 }, { x: 600, y: 0 }])).toBe(30);
  });
});

describe('eventosNoIntervalo', () => {
  const ev: EventoSom[] = [
    { cat: 'largada', carro: null, t: 0 },
    { cat: 'derrapagem', carro: 'a', t: 100 },
    { cat: 'abandono', carro: 'b', t: 200 },
  ];
  it('meio-aberto: exclui o início, inclui o fim', () => {
    expect(eventosNoIntervalo(ev, 100, 200, 16).map((e) => e.t)).toEqual([200]);
    expect(eventosNoIntervalo(ev, 99, 100, 16).map((e) => e.t)).toEqual([100]);
  });
  it('a largada entra quando a corrida parte de SIM_ANTES_DA_LARGADA, e se perderia partindo de 0', () => {
    expect(eventosNoIntervalo(ev, SIM_ANTES_DA_LARGADA, 0, 16).map((e) => e.cat)).toEqual(['largada']);
    expect(eventosNoIntervalo(ev, 0, 16, 16)).toEqual([]);
  });
  it('salto de relógio (aba voltando do segundo plano): descarta o que foi atravessado', () => {
    expect(eventosNoIntervalo(ev, -1, 300, DELTA_SALTO_MS + 1)).toEqual([]);
    expect(eventosNoIntervalo(ev, -1, 300, DELTA_SALTO_MS)).toHaveLength(3);
  });
});

describe('mixer (proposta medida em medir-pr3)', () => {
  const tocar = (e: EstadoMixer, cat: EventoSom['cat'], agoraMs: number, prioritario = false, durMs = 1000) =>
    admitir(e, { cat, prioritario, agoraMs, durMs });

  it('mesma categoria a menos de 250 ms do último que tocou é absorvida; a 250 ms, toca', () => {
    let e = mixerVazio();
    let r = tocar(e, 'pistola', 0);
    expect(r.decisao.tipo).toBe('tocar');
    e = r.estado;
    r = tocar(e, 'pistola', JANELA_AGRUPAR_MS - 1);
    expect(r.decisao.tipo).toBe('absorvida');
    // A absorvida não conta como "último que tocou".
    r = tocar(r.estado, 'pistola', JANELA_AGRUPAR_MS);
    expect(r.decisao.tipo).toBe('tocar');
  });

  it('o prioritário nunca é absorvido', () => {
    const e = tocar(mixerVazio(), 'pistola', 0).estado;
    expect(tocar(e, 'pistola', 10, true).decisao.tipo).toBe('tocar');
  });

  it('outra categoria no mesmo instante não é absorvida', () => {
    const e = tocar(mixerVazio(), 'pistola', 0).estado;
    expect(tocar(e, 'derrapagem', 0).decisao.tipo).toBe('tocar');
  });

  it('teto de vozes: o sétimo de prioridade igual ou menor é recusado', () => {
    let e = mixerVazio();
    const cats: EventoSom['cat'][] = ['pistola', 'derrapagem', 'abandono', 'largada', 'torcida', 'passagem'];
    cats.forEach((c, i) => (e = tocar(e, c, i).estado));
    expect(e.vozes).toHaveLength(TETO_VOZES);
    expect(tocar(e, 'passagem', 300).decisao.tipo).toBe('recusada');
  });

  it('teto cheio: maior prioridade rouba a voz de menor prioridade, a mais velha no empate', () => {
    let e = mixerVazio();
    const ids: number[] = [];
    for (let i = 0; i < TETO_VOZES; i++) {
      const r = tocar(e, 'passagem', i * JANELA_AGRUPAR_MS, false, 10_000);
      e = r.estado;
      if (r.decisao.tipo === 'tocar') ids.push(r.decisao.id);
    }
    const r = tocar(e, 'derrapagem', 2000);
    expect(r.decisao).toEqual({ tipo: 'tocar', id: expect.any(Number), roubada: ids[0] });
    expect(r.estado.vozes).toHaveLength(TETO_VOZES);
    expect(r.estado.vozes.some((v) => v.id === ids[0])).toBe(false);
  });

  it('teto cheio com prioridades misturadas: rouba a de MENOR prioridade, mesmo sendo a mais nova', () => {
    let e = mixerVazio();
    let idPassagem = -1;
    for (let i = 0; i < TETO_VOZES; i++) {
      // A mais velha é derrapagem (3); a passagem (1) entra por último.
      const cat = i === TETO_VOZES - 1 ? 'passagem' : 'derrapagem';
      const r = tocar(e, cat, i * JANELA_AGRUPAR_MS, false, 10_000);
      e = r.estado;
      if (cat === 'passagem' && r.decisao.tipo === 'tocar') idPassagem = r.decisao.id;
    }
    expect(tocar(e, 'abandono', 2000).decisao).toEqual({ tipo: 'tocar', id: expect.any(Number), roubada: idPassagem });
  });

  it('som de duração nula não ocupa voz (torcida com fim = bandeirada)', () => {
    const r = tocar(mixerVazio(), 'torcida', 0, true, 0);
    expect(r.decisao.tipo).toBe('recusada');
    expect(r.estado.vozes).toHaveLength(0);
  });

  it('o bônus do prioritário passa à frente de categoria mais forte', () => {
    let e = mixerVazio();
    for (let i = 0; i < TETO_VOZES; i++) e = tocar(e, 'abandono', i * JANELA_AGRUPAR_MS, false, 10_000).estado;
    expect(PRIORIDADE.pistola + BONUS_PRIORITARIO).toBeGreaterThan(PRIORIDADE.abandono);
    expect(tocar(e, 'pistola', 2000, true).decisao.tipo).toBe('tocar');
    expect(tocar(e, 'pistola', 2000, false).decisao.tipo).toBe('recusada');
  });

  it('voz que acabou libera o lugar', () => {
    let e = mixerVazio();
    for (let i = 0; i < TETO_VOZES; i++) e = tocar(e, 'abandono', i * JANELA_AGRUPAR_MS, false, 100).estado;
    const r = tocar(e, 'passagem', 5000);
    expect(r.decisao).toEqual({ tipo: 'tocar', id: expect.any(Number) });
    expect(r.estado.vozes).toHaveLength(1);
  });

  it('não muta o estado recebido', () => {
    const e = mixerVazio();
    tocar(e, 'pistola', 0);
    expect(e).toEqual(mixerVazio());
  });
});

describe('detectarPassagens', () => {
  const foco = { x: 0, y: 0 };
  const FOCO = { id: 'h', ponto: foco, ativo: true };
  /** 10 ms simulados por ms real: horizonte de 5000 ms simulados, quadro anterior válido até 1000. */
  const ESC = 10;
  /** Outro carro em linha reta: passa a 10 u do foco no instante 1000 (x = 0). */
  const emLinha = (t: number) => ({ x: (t - 1000) * 0.1, y: 10 });

  it('dispara uma vez ao entrar no limiar, prevendo o instante da menor distância', () => {
    let e = passagensVazias();
    const novas: { carro: string; humano: string; tMinimo: number }[] = [];
    for (let t = 0; t <= 2000; t += 20) {
      const r = detectarPassagens(e, t, ESC, [FOCO], [{ id: 'b1', ponto: emLinha(t), ativo: true }]);
      e = r.estado;
      novas.push(...r.novas);
    }
    expect(novas).toHaveLength(1);
    expect(novas[0].carro).toBe('b1');
    expect(novas[0].tMinimo).toBeCloseTo(1000, 6);
  });

  it('não redispara enquanto não sair além da histerese', () => {
    let e = passagensVazias();
    let n = 0;
    // Oscila entre dentro do limiar e logo acima dele, sem passar de PERTO_U × HISTERESE.
    for (let t = 0; t < 40; t++) {
      const d = t % 2 === 0 ? PERTO_U - 1 : PERTO_U * HISTERESE - 1;
      const r = detectarPassagens(e, t * 16, ESC, [FOCO], [{ id: 'b1', ponto: { x: d, y: 0 }, ativo: true }]);
      e = r.estado;
      n += r.novas.length;
    }
    expect(n).toBe(1);
    // Saiu além da histerese e voltou: nova passagem.
    e = detectarPassagens(e, 700, ESC, [FOCO], [{ id: 'b1', ponto: { x: PERTO_U * HISTERESE + 1, y: 0 }, ativo: true }]).estado;
    expect(detectarPassagens(e, 716, ESC, [FOCO], [{ id: 'b1', ponto: { x: PERTO_U - 1, y: 0 }, ativo: true }]).novas).toHaveLength(1);
  });

  it('sem quadro anterior válido, o mínimo é agora', () => {
    const r = detectarPassagens(passagensVazias(), 500, ESC, [FOCO], [{ id: 'b1', ponto: { x: 10, y: 0 }, ativo: true }]);
    expect(r.novas).toEqual([{ carro: 'b1', humano: 'h', tMinimo: 500 }]);
    // Quadro anterior com o carro no box (inativo): a posição de lá não vale para estimar a velocidade.
    const e = detectarPassagens(passagensVazias(), 0, ESC, [FOCO], [{ id: 'b2', ponto: { x: 300, y: 0 }, ativo: false }]).estado;
    expect(detectarPassagens(e, 16, ESC, [FOCO], [{ id: 'b2', ponto: { x: 10, y: 0 }, ativo: true }]).novas).toEqual([{ carro: 'b2', humano: 'h', tMinimo: 16 }]);
  });

  it('foco inativo (box, parado, abandonado): nada dispara e o estado zera, como na cena real', () => {
    let e = detectarPassagens(passagensVazias(), 0, ESC, [FOCO], [{ id: 'b1', ponto: { x: 100, y: 0 }, ativo: true }]).estado;
    const r = detectarPassagens(e, 16, ESC, [{ ...FOCO, ativo: false }], [{ id: 'b1', ponto: { x: 10, y: 0 }, ativo: true }]);
    expect(r.novas).toEqual([]);
    expect(r.estado).toEqual(passagensVazias());
    e = r.estado;
    expect(detectarPassagens(e, 32, ESC, [FOCO], [{ id: 'b1', ponto: { x: 10, y: 0 }, ativo: true }]).novas).toHaveLength(1);
  });

  it('mínimo além do horizonte (carro andando junto): soa agora, não segundos depois', () => {
    // Aproxima ~0,005 u por ms simulado: o mínimo ficaria ~8,8 s simulados à frente, além dos 5 s do horizonte.
    let e = detectarPassagens(passagensVazias(), 0, ESC, [FOCO], [{ id: 'b1', ponto: { x: 45.5, y: 0 }, ativo: true }]).estado;
    const r = detectarPassagens(e, 100, ESC, [FOCO], [{ id: 'b1', ponto: { x: 44.99, y: 0 }, ativo: true }]);
    expect(r.novas).toEqual([{ carro: 'b1', humano: 'h', tMinimo: 100 }]);
    // Dentro do horizonte: previsto.
    e = detectarPassagens(passagensVazias(), 0, ESC, [FOCO], [{ id: 'b2', ponto: { x: 60, y: 0 }, ativo: true }]).estado;
    const r2 = detectarPassagens(e, 100, ESC, [FOCO], [{ id: 'b2', ponto: { x: 40, y: 0 }, ativo: true }]);
    expect(r2.novas[0].tMinimo).toBeCloseTo(300, 6);
    expect(HORIZONTE_REAL_MS * ESC).toBeGreaterThan(200);
  });

  it('entrando com a projeção já para trás (salto lateral de quadro grande, em curva): o mínimo é agora', () => {
    // De (0, 50) para (40, 0): a distância caiu de 50 para 40, mas r·v > 0, o mínimo ficou no passado.
    const e = detectarPassagens(passagensVazias(), 0, ESC, [FOCO], [{ id: 'b1', ponto: { x: 0, y: 50 }, ativo: true }]).estado;
    expect(detectarPassagens(e, 100, ESC, [FOCO], [{ id: 'b1', ponto: { x: 40, y: 0 }, ativo: true }]).novas).toEqual([{ carro: 'b1', humano: 'h', tMinimo: 100 }]);
  });

  it('quadro anterior velho (aba voltando) não serve para prever', () => {
    const velho = ANTERIOR_MAX_REAL_MS * ESC + 1;
    const e = detectarPassagens(passagensVazias(), 0, ESC, [FOCO], [{ id: 'b1', ponto: { x: 60, y: 0 }, ativo: true }]).estado;
    expect(detectarPassagens(e, velho, ESC, [FOCO], [{ id: 'b1', ponto: { x: 40, y: 0 }, ativo: true }]).novas).toEqual([{ carro: 'b1', humano: 'h', tMinimo: velho }]);
  });

  it('o foco andando conta: a velocidade é relativa', () => {
    // Os dois andam juntos para +x, o outro 1 u à frente por quadro de aproximação: mínimo no instante 1000.
    let e = passagensVazias();
    const novas: { carro: string; humano: string; tMinimo: number }[] = [];
    for (let t = 0; t <= 2000; t += 20) {
      const meu = { x: t * 0.5, y: 0 };
      const outro = { x: t * 0.5 + (t - 1000) * 0.1, y: 5 };
      const r = detectarPassagens(e, t, ESC, [{ id: 'h', ponto: meu, ativo: true }], [{ id: 'b1', ponto: outro, ativo: true }]);
      e = r.estado;
      novas.push(...r.novas);
    }
    expect(novas).toHaveLength(1);
    expect(novas[0].tMinimo).toBeCloseTo(1000, 6);
  });

  it('dois humanos: a passagem é perto de QUALQUER um, uma por humano (decisão do Marcos, 2026-11-06)', () => {
    const h1 = { id: 'h1', ponto: { x: 0, y: 0 }, ativo: true };
    const h2 = { id: 'h2', ponto: { x: 1000, y: 0 }, ativo: true };
    let e = passagensVazias();
    const novas: { carro: string; humano: string; tMinimo: number }[] = [];
    // b1 vai de x = -200 a 1200 em y = 10: passa perto de h1 (t = 200) e depois de h2 (t = 1200).
    for (let t = 0; t <= 1400; t += 20) {
      const r = detectarPassagens(e, t, ESC, [h1, h2], [{ id: 'b1', ponto: { x: t - 200, y: 10 }, ativo: true }]);
      e = r.estado;
      novas.push(...r.novas);
    }
    expect(novas.map((n) => n.humano)).toEqual(['h1', 'h2']);
    expect(novas[0].tMinimo).toBeCloseTo(200, 6);
    expect(novas[1].tMinimo).toBeCloseTo(1200, 6);
  });

  it('perto só de um dos humanos: só esse conta; humano inativo não conta', () => {
    const h1 = { id: 'h1', ponto: { x: 0, y: 0 }, ativo: true };
    const h2 = { id: 'h2', ponto: { x: 1000, y: 0 }, ativo: true };
    const perto = [{ id: 'b1', ponto: { x: 1010, y: 0 }, ativo: true }];
    expect(detectarPassagens(passagensVazias(), 0, ESC, [h1, h2], perto).novas.map((n) => n.humano)).toEqual(['h2']);
    expect(detectarPassagens(passagensVazias(), 0, ESC, [h1, { ...h2, ativo: false }], perto).novas).toEqual([]);
  });

  it('um humano inativo zera só os episódios dele', () => {
    const h1 = { id: 'h1', ponto: { x: 0, y: 0 }, ativo: true };
    const h2 = { id: 'h2', ponto: { x: 1000, y: 0 }, ativo: true };
    const b = [{ id: 'b1', ponto: { x: 1010, y: 0 }, ativo: true }];
    let e = detectarPassagens(passagensVazias(), 0, ESC, [h1, h2], b).estado;
    // h1 sai da pista; b1 continua perto de h2: não redispara.
    e = detectarPassagens(e, 16, ESC, [{ ...h1, ativo: false }, h2], b).estado;
    expect(detectarPassagens(e, 32, ESC, [h1, h2], b).novas).toEqual([]);
  });

  it('dois humanos que se cruzam: uma passagem só, não duas; e ninguém passa por si mesmo', () => {
    const h1 = { id: 'h1', ponto: { x: 0, y: 0 }, ativo: true };
    const h2 = { id: 'h2', ponto: { x: 10, y: 0 }, ativo: true };
    const r = detectarPassagens(passagensVazias(), 0, ESC, [h1, h2], [h1, h2]);
    expect(r.novas).toEqual([{ carro: 'h2', humano: 'h1', tMinimo: 0 }]);
  });

  it('carro inativo (box, parado) não dispara; sem foco, nada dispara e o estado zera', () => {
    let e = passagensVazias();
    const r = detectarPassagens(e, 0, ESC, [FOCO], [{ id: 'b1', ponto: { x: 1, y: 0 }, ativo: false }]);
    expect(r.novas).toEqual([]);
    e = detectarPassagens(e, 0, ESC, [FOCO], [{ id: 'b1', ponto: { x: 1, y: 0 }, ativo: true }]).estado;
    const semFoco = detectarPassagens(e, 16, ESC, [], [{ id: 'b1', ponto: { x: 1, y: 0 }, ativo: true }]);
    expect(semFoco.novas).toEqual([]);
    expect(semFoco.estado).toEqual(passagensVazias());
  });
});

describe('motor', () => {
  it('ganho do motor audível limitado a 15% em toda a faixa', () => {
    for (const velocidade of [1, 15, 30, 60, 1000]) {
      expect(somDoMotor(velocidade, 30).ganhoMotor).toBeGreaterThan(0);
      expect(somDoMotor(velocidade, 30).ganhoMotor).toBeLessThanOrEqual(0.15);
    }
  });
  it('velocidade em u por segundo simulado', () => {
    expect(velocidadeEntre({ x: 0, y: 0 }, { x: 3, y: 4 }, 500)).toBe(10);
    expect(velocidadeEntre({ x: 0, y: 0 }, { x: 3, y: 4 }, 0)).toBe(0);
  });
  it('parado: o motor some e a marcha lenta assume', () => {
    expect(somDoMotor(0, 30)).toEqual({ taxa: expect.any(Number), ganhoMotor: 0, ganhoLenta: GANHO_LENTA });
  });
  it('andando: o tom vai de 0,6 a 1,1 com a velocidade, sem marcha lenta', () => {
    expect(somDoMotor(30, 30)).toEqual({ taxa: 1.1, ganhoMotor: GANHO_MOTOR, ganhoLenta: 0 });
    expect(somDoMotor(15, 30).taxa).toBeCloseTo(0.85, 10);
    expect(somDoMotor(60, 30).taxa).toBe(1.1);
  });
  it('sem referência de velocidade, o tom mais grave (não o mais agudo)', () => {
    expect(somDoMotor(5, 0).taxa).toBe(0.6);
  });
  it('depois do abandono do foco, motor e marcha lenta calam', () => {
    expect(somDoMotor(0, 30, true)).toEqual({ taxa: expect.any(Number), ganhoMotor: 0, ganhoLenta: 0 });
    expect(somDoMotor(30, 30, true)).toEqual({ taxa: expect.any(Number), ganhoMotor: 0, ganhoLenta: 0 });
  });
});

describe('duracaoRealMs', () => {
  const escala = 20;
  it('derrapagem 700 ms (a constante do PR 2d) e abandono 900 ms em qualquer velocidade', () => {
    expect(DURACAO_EFEITO_MS).toBe(700);
    for (const v of ['lenta', 'media', 'rapida'] as const) {
      expect(duracaoRealMs({ cat: 'derrapagem', carro: 'a', t: 0 }, escala, v)).toBe(700);
      expect(duracaoRealMs({ cat: 'abandono', carro: 'a', t: 0 }, escala, v)).toBe(900);
    }
  });
  it('pistola e torcida: o intervalo do evento, em tempo real', () => {
    expect(duracaoRealMs({ cat: 'pistola', carro: 'a', t: 1000, fim: 3000 }, escala, 'media')).toBe(100);
    expect(duracaoRealMs({ cat: 'torcida', carro: null, t: 0, fim: 40000 }, escala, 'lenta')).toBe(2000);
  });
  it('a torcida não passa do arquivo (sem laço, o resto seria voz muda ocupando o teto)', () => {
    const arquivoMs = Math.round(CATALOGO_SONS.torcida.durS * 1000);
    expect(duracaoRealMs({ cat: 'torcida', carro: null, t: 0, fim: (arquivoMs + 5000) * escala }, escala, 'lenta')).toBe(arquivoMs);
  });
  it('problema técnico: mais curto que o abandono, em qualquer velocidade', () => {
    expect(DURACAO_PROBLEMA_MS).toBeLessThan(900);
    for (const v of ['lenta', 'media', 'rapida'] as const) {
      expect(duracaoRealMs({ cat: 'problema', carro: 'a', t: 0 }, escala, v)).toBe(DURACAO_PROBLEMA_MS);
    }
  });
  it('o problema técnico toca o chocalho (o arquivo do abandono, abandono-v3)', () => {
    expect(somDaCategoria('problema', 'media')).toBe(CATALOGO_SONS.abandono);
    expect(CATALOGO_SONS.abandono.origem).toBe('abandono-v3');
    expect(somDaCategoria('derrapagem', 'lenta')).toBe(CATALOGO_SONS.derrapagem);
    expect(somDaCategoria('passagem', 'rapida')).toBe(CATALOGO_SONS.passagem.rapida);
    expect(somDaCategoria('largada', 'lenta')).toBe(CATALOGO_SONS.largada.lenta);
  });
  it('spray: o arquivo da velocidade', () => {
    expect(duracaoRealMs({ cat: 'spray', carro: 'a', t: 0 }, escala, 'media')).toBe(Math.round(CATALOGO_SONS.spray.media.durS * 1000));
  });
  it('passagem e largada: o arquivo da velocidade', () => {
    expect(duracaoRealMs({ cat: 'passagem', carro: 'a', t: 0 }, escala, 'rapida')).toBe(Math.round(CATALOGO_SONS.passagem.rapida.durS * 1000));
    expect(duracaoRealMs({ cat: 'largada', carro: null, t: 0 }, escala, 'lenta')).toBe(Math.round(CATALOGO_SONS.largada.lenta.durS * 1000));
  });
});
