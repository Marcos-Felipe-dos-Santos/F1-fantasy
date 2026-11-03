/**
 * Testes da narração (PR A). Vitest puro, sem DOM — o módulo é função pura de
 * dados congelados pra texto, que é exatamente por que ele mora fora do
 * componente.
 *
 * NÃO existe golden de texto aqui, e é decisão consciente: o índice sai de
 * `hash % variantes.length`, então acrescentar UMA variante remexe o texto de
 * todos os eventos. Um golden viraria trava de conteúdo editorial — reprovaria
 * "escrevi uma frase nova", que não é regressão nenhuma. O que os testes
 * travam é o CONTRATO: determinismo, cobertura do pool, e o pool certo pra
 * cada condição.
 */

import { describe, expect, it } from 'vitest';
import type { EventoCorrida, ResultadoCorrida, TipoEvento } from '../engine/types';
import { replayDaCorrida } from './fim-da-corrida';
import {
  narrarEvento,
  narrarEventos,
  textoDaConsequencia,
  VARIANTES_CHUVA,
  VARIANTES_SECO,
  variantesDe,
} from './narracao';

const TIPOS: TipoEvento[] = [
  'erro-piloto',
  'quebra-chassi',
  'quebra-motor',
  'problema-tecnico',
  'investigacao',
];

function evento(parcial: Partial<EventoCorrida> = {}): EventoCorrida {
  return { volta: 5, jogadorId: 'jogador-1', tipo: 'erro-piloto', custoMs: 900, ...parcial };
}

describe('narrarEvento — determinismo', () => {
  it('mesma corrida e mesmo evento produzem SEMPRE o mesmo texto', () => {
    const ev = evento();
    const primeira = narrarEvento(ev, 42, false);
    for (let i = 0; i < 50; i++) expect(narrarEvento(ev, 42, false)).toBe(primeira);
  });

  it('a seed da corrida faz parte da escolha — corridas diferentes narram diferente', () => {
    // Não vale pra QUALQUER par de seeds (o pool é finito e colisões são
    // esperadas); a asserção é sobre a distribuição: entre 100 seeds, mais de
    // um texto aparece.
    const textos = new Set(Array.from({ length: 100 }, (_, s) => narrarEvento(evento(), s, false)));
    expect(textos.size).toBeGreaterThan(1);
  });

  it('jogador, volta e TIPO entram no hash — dois eventos do mesmo carro na mesma volta não ficam colados', () => {
    // O `tipo` na label é o que evita correlação entre um erro e um problema
    // técnico do mesmo carro na mesma volta.
    const base = { volta: 7, jogadorId: 'jogador-3' };
    const indiceDe = (tipo: TipoEvento, chuva: boolean) =>
      variantesDe(tipo, chuva).indexOf(narrarEvento(evento({ ...base, tipo }), 42, chuva));
    // Ambos existem no pool (não deu -1) — é o que garante que o texto veio do
    // pool do tipo certo.
    expect(indiceDe('erro-piloto', false)).toBeGreaterThanOrEqual(0);
    expect(indiceDe('problema-tecnico', false)).toBeGreaterThanOrEqual(0);

    // Volta e jogador também mudam a escolha ao longo de uma corrida.
    const porVolta = new Set(
      Array.from({ length: 40 }, (_, v) => narrarEvento(evento({ volta: v + 1 }), 42, false)),
    );
    expect(porVolta.size).toBeGreaterThan(1);
    const porJogador = new Set(
      Array.from({ length: 22 }, (_, i) => narrarEvento(evento({ jogadorId: `jogador-${i}` }), 42, false)),
    );
    expect(porJogador.size).toBeGreaterThan(1);
  });
});

describe('narrarEvento — variedade real', () => {
  it('o pool INTEIRO de erro-piloto é alcançável (nenhuma frase é letra morta)', () => {
    // A guarda contra "tem 8 variantes mas o hash só cai em 3".
    const vistos = new Set<string>();
    for (let seed = 0; seed < 500; seed++) {
      for (let volta = 1; volta <= 10; volta++) {
        vistos.add(narrarEvento(evento({ volta }), seed, false));
      }
    }
    expect(vistos.size).toBe(VARIANTES_SECO['erro-piloto'].length);
  });

  it('numa corrida real (muitos erros), o texto NÃO é sempre o mesmo — era o problema que o PR resolve', () => {
    const textos = new Set(
      Array.from({ length: 22 }, (_, i) =>
        narrarEvento(evento({ jogadorId: `jogador-${i}`, volta: 3 + (i % 9) }), 2026, false),
      ),
    );
    expect(textos.size).toBeGreaterThanOrEqual(4);
  });
});

describe('narrarEvento — chuva', () => {
  it('com chuva, erro-piloto usa o vocabulário MOLHADO', () => {
    const molhadas = VARIANTES_CHUVA['erro-piloto']!;
    for (let seed = 0; seed < 60; seed++) {
      expect(molhadas).toContain(narrarEvento(evento(), seed, true));
    }
  });

  it('sem chuva, erro-piloto usa o vocabulário SECO', () => {
    for (let seed = 0; seed < 60; seed++) {
      expect(VARIANTES_SECO['erro-piloto']).toContain(narrarEvento(evento(), seed, false));
    }
  });

  it('os dois pools de erro-piloto são DISJUNTOS — a chuva muda mesmo o que se lê', () => {
    const secas = new Set(VARIANTES_SECO['erro-piloto']);
    for (const molhada of VARIANTES_CHUVA['erro-piloto']!) expect(secas.has(molhada)).toBe(false);
  });

  it('quebra de motor/chassi NÃO ganham vocabulário de chuva — a engine não liga uma coisa à outra', () => {
    // Decisão de honestidade: `chuvaMultErro` só multiplica a chance de ERRO
    // DO PILOTO. Quebra rola contra CONF, que a chuva não toca. Texto molhado
    // numa quebra sugeriria causalidade inexistente.
    for (const tipo of ['quebra-motor', 'quebra-chassi', 'problema-tecnico', 'investigacao'] as const) {
      expect(VARIANTES_CHUVA[tipo]).toBeUndefined();
      expect(variantesDe(tipo, true)).toEqual(VARIANTES_SECO[tipo]);
    }
  });
});

describe('cobertura dos tipos', () => {
  it('TODO TipoEvento tem pool seco não vazio (um tipo novo sem texto reprova aqui)', () => {
    for (const tipo of TIPOS) {
      expect(VARIANTES_SECO[tipo].length).toBeGreaterThan(0);
      expect(narrarEvento(evento({ tipo }), 1, false)).toBeTruthy();
    }
  });

  it('nenhuma variante é vazia ou duplicada dentro do próprio pool', () => {
    for (const tipo of TIPOS) {
      const pool = VARIANTES_SECO[tipo];
      expect(new Set(pool).size).toBe(pool.length);
      for (const frase of pool) expect(frase.trim()).not.toBe('');
    }
    for (const pool of Object.values(VARIANTES_CHUVA)) {
      expect(new Set(pool!).size).toBe(pool!.length);
    }
  });

  it('nenhuma frase afirma manobra, local da pista ou clima evoluindo (a engine não modela nada disso)', () => {
    // Guarda editorial: a tentação neste módulo é escrever narração de
    // videogame. `ultrapass`/`curva N`/`começou a chover` seriam falsos por
    // construção — cada carro é simulado isoladamente e o clima é global.
    const proibidos = /ultrapass|passou (?:o|a) |disputa|roda a roda|começou a chover|parou de chover|secando|pneu de chuva/i;
    const todas = [
      ...TIPOS.flatMap((tipo) => [...VARIANTES_SECO[tipo]]),
      ...Object.values(VARIANTES_CHUVA).flatMap((pool) => [...pool!]),
    ];
    for (const frase of todas) expect(frase).not.toMatch(proibidos);
  });
});

/**
 * PR 2d — consequência contada na parada, no instante do carro. Substitui o "caiu
 * atrás de Y" do PR B, por decisão do Marcos: quem passa o carro parado passa por causa
 * da parada, e a conta é o mesmo progresso que ordena o painel. Segue valendo o que o
 * PR B garantia: nada de posição absoluta, nada de consequência em punição ou quebra.
 */
describe('narrarEventos — consequência na parada (PR 2d)', () => {
  const PISTA = { id: 'pista-monza', voltas: 10, tempoBaseMs: 1000 };

  function resultadoDe(
    historicoVoltas: Record<string, number[]>,
    eventos: EventoCorrida[],
    voltasDePit: Record<string, number[]> = {},
    chuva = false,
    dnfs: string[] = [],
  ): ResultadoCorrida {
    const ordem = Object.keys(historicoVoltas).sort((a, b) => Number(dnfs.includes(a)) - Number(dnfs.includes(b)));
    return {
      seed: 42,
      classificacao: ordem.map((jogadorId, i) => ({
        jogadorId,
        posicao: i + 1,
        pontos: 0,
        tempoTotal: historicoVoltas[jogadorId].reduce((a, b) => a + b, 0),
        paradas: (voltasDePit[jogadorId] ?? []).length,
        status: dnfs.includes(jogadorId) ? ('dnf' as const) : ('terminou' as const),
        voltasCompletadas: historicoVoltas[jogadorId].length,
      })),
      voltaMaisRapida: { jogadorId: ordem[0], tempo: 900 },
      eventos,
      chuva,
      historicoVoltas,
      voltasDePit: Object.fromEntries(ordem.map((id) => [id, voltasDePit[id] ?? []])),
    };
  }

  const dez = (ms: number, extra: Record<number, number> = {}) =>
    Array.from({ length: 10 }, (_, i) => ms + (extra[i + 1] ?? 0));
  const erro = (jogadorId: string, volta: number, custoMs: number): EventoCorrida => ({ jogadorId, volta, tipo: 'erro-piloto', custoMs });
  const narrar = (r: ResultadoCorrida) => narrarEventos(r, replayDaCorrida(r, PISTA));

  it('conta quem passa durante a parada: Y e Z vêm logo atrás e passam, W não chega', () => {
    const r = resultadoDe(
      { X: dez(1000, { 3: 300 }), Y: dez(1010), Z: dez(1020), W: dez(1400) },
      [erro('X', 3, 300)],
    );
    const [n] = narrar(r);
    expect(n.tempoPerdidoMs).toBe(300);
    expect(n.posicoesPerdidas).toBe(2);
    expect(textoDaConsequencia(n)).toBe(', perdeu 0,3 s e 2 posições');
  });

  it('uma posição: singular; nenhuma: só o tempo', () => {
    const uma = resultadoDe({ X: dez(1000, { 3: 300 }), Y: dez(1010), Z: dez(1400) }, [erro('X', 3, 300)]);
    expect(textoDaConsequencia(narrar(uma)[0])).toBe(', perdeu 0,3 s e 1 posição');
    const nenhuma = resultadoDe({ X: dez(1000, { 3: 300 }), Y: dez(1400) }, [erro('X', 3, 300)]);
    expect(narrar(nenhuma)[0].posicoesPerdidas).toBe(0);
    expect(textoDaConsequencia(narrar(nenhuma)[0])).toBe(', perdeu 0,3 s');
  });

  it('quem já estava à frente não conta como posição perdida', () => {
    const r = resultadoDe({ Y: dez(900), X: dez(1000, { 3: 300 }) }, [erro('X', 3, 300)]);
    expect(narrar(r)[0].posicoesPerdidas).toBe(0);
  });

  it('quebra e punição não têm consequência na parada', () => {
    const r = resultadoDe(
      { X: dez(1000), D: [1000, 1000] },
      [
        { jogadorId: 'D', volta: 2, tipo: 'quebra-chassi', custoMs: 0 },
        { jogadorId: 'X', volta: 10, tipo: 'investigacao', custoMs: 7400 },
      ],
      {},
      false,
      ['D'],
    );
    const narradas = narrar(r);
    const quebra = narradas.find((n) => n.evento.tipo === 'quebra-chassi')!;
    const punicao = narradas.find((n) => n.evento.tipo === 'investigacao')!;
    expect(quebra.tempoPerdidoMs).toBeNull();
    expect(quebra.posicoesPerdidas).toBeNull();
    expect(textoDaConsequencia(quebra)).toBe('');
    expect(punicao.posicoesPerdidas).toBeNull();
    expect(textoDaConsequencia(punicao)).toBe(' e levou +7,4 s');
  });

  it('nunca diz posição absoluta', () => {
    const r = resultadoDe({ X: dez(1000, { 3: 300 }), Y: dez(1010) }, [erro('X', 3, 300)]);
    expect(textoDaConsequencia(narrar(r)[0])).not.toMatch(/\d+º|para \d/);
  });

  it('o evento sai no instante do CARRO: parada, abandono ou passagem pela linha', () => {
    const r = resultadoDe(
      { X: dez(1000, { 3: 300 }), D: [1000, 1000] },
      [
        erro('X', 3, 300),
        { jogadorId: 'D', volta: 2, tipo: 'quebra-motor', custoMs: 0 },
        { jogadorId: 'X', volta: 10, tipo: 'investigacao', custoMs: 5000 },
      ],
      {},
      false,
      ['D'],
    );
    const replay = replayDaCorrida(r, PISTA);
    const em = (tipo: TipoEvento) => narrar(r).find((n) => n.evento.tipo === tipo)!.instante;
    expect(em('erro-piloto')).toBe(replay.incidentes('X')[0].inicio);
    expect(em('quebra-motor')).toBe(replay.abandono('D')!.instante);
    expect(em('investigacao')).toBe(replay.chegada('X')!.instante);
  });

  it('vem em ordem de instante, não de volta', () => {
    const r = resultadoDe(
      { X: dez(1000, { 3: 300 }), Y: dez(1000, { 3: 200 }), Z: dez(1000, { 2: 100 }) },
      [erro('Z', 2, 100), erro('X', 3, 300), erro('Y', 3, 200)],
    );
    const instantes = narrar(r).map((n) => n.instante);
    expect(instantes).toEqual([...instantes].sort((a, b) => a - b));
  });

  it('o carro lento, na mesma volta, vem depois do rápido, mesmo antes dele nos eventos', () => {
    const r = resultadoDe(
      { A: dez(1500, { 3: 100 }), B: dez(1000, { 3: 100 }) },
      [erro('A', 3, 100), erro('B', 3, 100)],
    );
    expect(narrar(r).map((n) => n.evento.jogadorId)).toEqual(['B', 'A']);
  });

  it('mais erros que frases: o pool recomeça, sem travar', () => {
    const eventos = Array.from({ length: VARIANTES_SECO['erro-piloto'].length + 3 }, (_, i) => erro(`c${i}`, 3, 100));
    const historicos = Object.fromEntries(eventos.map((e) => [e.jogadorId, dez(1000, { 3: 100 })]));
    const frases = narrar(resultadoDe(historicos, eventos)).map((n) => n.frase);
    expect(frases).toHaveLength(eventos.length);
    expect(new Set(frases).size).toBe(VARIANTES_SECO['erro-piloto'].length);
  });

  it('incidente na volta de pit vira "e foi para os boxes"; fora dela, não', () => {
    const r = resultadoDe({ X: dez(1000, { 3: 300 }) }, [erro('X', 3, 300)], { X: [3] });
    expect(narrar(r)[0].foiParaOsBoxes).toBe(true);
    const fora = resultadoDe({ X: dez(1000, { 3: 300 }) }, [erro('X', 3, 300)], { X: [5] });
    expect(narrar(fora)[0].foiParaOsBoxes).toBe(false);
  });

  it('incidente depois da linha do retardatário não é narrado', () => {
    const r = resultadoDe(
      { A: dez(1000), C: Array.from({ length: 10 }, (_, i) => (i === 9 ? 1350 : 1150)) },
      [erro('C', 10, 200)],
    );
    expect(narrar(r)).toHaveLength(0);
  });

  it('mesmo tipo na mesma corrida não repete frase enquanto houver frase nova', () => {
    const eventos = Array.from({ length: 10 }, (_, i) => erro(`c${i}`, 3, 100));
    const historicos = Object.fromEntries(eventos.map((e) => [e.jogadorId, dez(1000, { 3: 100 })]));
    const frases = narrar(resultadoDe(historicos, eventos)).map((n) => n.frase);
    expect(new Set(frases).size).toBe(frases.length);
    for (const f of frases) expect(VARIANTES_SECO['erro-piloto']).toContain(f);
  });

  it('frase nenhuma repete o que a consequência diz', () => {
    const todas = [...Object.values(VARIANTES_SECO), ...Object.values(VARIANTES_CHUVA)].flat();
    for (const f of todas) expect(f).not.toMatch(/perdeu tempo/);
  });

  it('determinismo: mesma entrada, mesma saída, e memoizado pela corrida', () => {
    const r = resultadoDe({ X: dez(1000, { 3: 300 }), Y: dez(1010) }, [erro('X', 3, 300)]);
    expect(narrar(r)).toBe(narrar(r));
    const copia = JSON.parse(JSON.stringify(r)) as ResultadoCorrida;
    expect(narrar(copia)).toEqual(narrar(r));
  });
});
