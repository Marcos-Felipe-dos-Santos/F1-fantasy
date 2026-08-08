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
import { narrarEvento, narrarEventos, VARIANTES_CHUVA, VARIANTES_SECO, variantesDe } from './narracao';

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
 * PR B — causalidade CONTRAFACTUAL. Baseline vermelho: `narrarEventos` ainda
 * não existe quando este bloco foi escrito.
 *
 * O critério NÃO é "erro e troca de posição na mesma volta" — isso ainda
 * mentiria, porque Y podia vir 3s mais rápido e passar de qualquer jeito. Só
 * há causalidade se, DESCONTADO o custo do erro, X continuaria à frente.
 * Fixtures sintéticas, números escolhidos à mão, pra que cada caso isole uma
 * condição.
 */
describe('narrarEventos — causalidade contrafactual (PR B)', () => {
  /** Monta um `ResultadoCorrida` mínimo com o que a narração lê. */
  function resultadoDe(
    historicoVoltas: Record<string, number[]>,
    eventos: EventoCorrida[],
    voltasDePit: Record<string, number[]> = {},
    chuva = false,
  ): ResultadoCorrida {
    return {
      seed: 42,
      classificacao: Object.keys(historicoVoltas).map((jogadorId, i) => ({
        jogadorId,
        posicao: i + 1,
        pontos: 0,
        tempoTotal: historicoVoltas[jogadorId].reduce((a, b) => a + b, 0),
        paradas: (voltasDePit[jogadorId] ?? []).length,
        status: 'terminou' as const,
        voltasCompletadas: historicoVoltas[jogadorId].length,
      })),
      voltaMaisRapida: { jogadorId: Object.keys(historicoVoltas)[0], tempo: 90_000 },
      eventos,
      chuva,
      historicoVoltas,
      voltasDePit,
    };
  }

  const erro = (jogadorId: string, volta: number, custoMs: number): EventoCorrida => ({
    jogadorId,
    volta,
    tipo: 'erro-piloto',
    custoMs,
  });

  it('CASO 1 — flip que passa no contrafactual vira linha causal', () => {
    // V1: X 90.000, Y 91.000  → X à frente (90.000 < 91.000)
    // V2: X 92.000 (inclui erro de 3.000), Y 90.000
    //     cum X = 182.000, cum Y = 181.000 → Y à frente agora
    //     sem o erro: X estaria em 179.000 < 181.000 → X seguiria à frente. CAUSAL.
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Y: [91_000, 90_000] },
      [erro('X', 2, 3_000)],
    );
    const narradas = narrarEventos(resultado);
    expect(narradas).toHaveLength(1);
    expect(narradas[0].caiuAtrasDe).toBe('Y');
  });

  it('CASO 2 (DISCRIMINANTE) — flip que NÃO passa no contrafactual narra só o erro', () => {
    // Mesmo flip, mas Y veio MUITO mais rápido: sem o erro X ainda perderia.
    // V1: X 90.000, Y 91.000 → X à frente
    // V2: X 92.000 (erro de 1.000), Y 85.000
    //     cum X = 182.000, cum Y = 176.000 → Y à frente
    //     sem o erro: X em 181.000, ainda ATRÁS de 176.000 → não foi o erro.
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Y: [91_000, 85_000] },
      [erro('X', 2, 1_000)],
    );
    const narradas = narrarEventos(resultado);
    expect(narradas).toHaveLength(1);
    expect(narradas[0].caiuAtrasDe).toBeNull();
  });

  it('CASO 3 — erro sem flip nenhum narra só o erro', () => {
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Y: [95_000, 95_000] },
      [erro('X', 2, 3_000)],
    );
    expect(narrarEventos(resultado)[0].caiuAtrasDe).toBeNull();
  });

  it('CASO 4 — flip na volta do PIT do próprio carro não afirma causalidade, e marca os boxes', () => {
    const resultado = resultadoDe(
      { X: [90_000, 112_000], Y: [91_000, 90_000] },
      [erro('X', 2, 3_000)],
      { X: [2] },
    );
    const narrada = narrarEventos(resultado)[0];
    expect(narrada.caiuAtrasDe).toBeNull();
    expect(narrada.entrouNosBoxes).toBe(true);
  });

  it('CASO 5 — carro com menos voltas que V nunca é nomeado como Y', () => {
    // Z abandonou na volta 1: não pode ser "quem passou" na volta 2.
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Z: [80_000] },
      [erro('X', 2, 3_000)],
    );
    expect(narrarEventos(resultado)[0].caiuAtrasDe).toBeNull();
  });

  it('CASO 6 — investigacao NUNCA produz linha causal (a penalidade não está no histórico)', () => {
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Y: [91_000, 90_000] },
      [{ jogadorId: 'X', volta: 2, tipo: 'investigacao', custoMs: 5_000 }],
    );
    expect(narrarEventos(resultado)[0].caiuAtrasDe).toBeNull();
  });

  it('CASO 7 — dois eventos do mesmo carro na mesma volta dão UMA linha causal, no de maior custo', () => {
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Y: [91_000, 90_000] },
      [erro('X', 2, 500), { jogadorId: 'X', volta: 2, tipo: 'problema-tecnico', custoMs: 2_500 }],
    );
    const narradas = narrarEventos(resultado);
    expect(narradas).toHaveLength(2);
    const comConsequencia = narradas.filter((n) => n.caiuAtrasDe !== null);
    expect(comConsequencia).toHaveLength(1);
    expect(comConsequencia[0].evento.tipo).toBe('problema-tecnico');
  });

  it('CASO 8 — volta 1 nunca tem causalidade (não há volta anterior pra comparar)', () => {
    const resultado = resultadoDe({ X: [95_000], Y: [90_000] }, [erro('X', 1, 3_000)]);
    expect(narrarEventos(resultado)[0].caiuAtrasDe).toBeNull();
  });

  it('CASO 8b — X que JÁ estava atrás de Y não "cai atrás" dele (não se perde o que não se tinha)', () => {
    // Escolhido pra passar no contrafactual e ser barrado SÓ pela condição 1:
    // V1: X 95.000, Y 90.000 → X já vinha ATRÁS.
    // V2: X 92.000 (erro de 10.000), Y 96.000
    //     cum X = 187.000, cum Y = 186.000 → Y à frente (como já estava).
    //     sem o erro: X em 177.000 < 186.000 → o contrafactual PASSARIA.
    // Sem a condição "X estava à frente", sairia a linha falsa "X caiu atrás
    // de Y" — quando X nunca esteve na frente dele.
    const resultado = resultadoDe(
      { X: [95_000, 92_000], Y: [90_000, 96_000] },
      [erro('X', 2, 10_000)],
    );
    expect(narrarEventos(resultado)[0].caiuAtrasDe).toBeNull();
  });

  it('CASO 9 — determinismo: mesma entrada, mesma saída', () => {
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Y: [91_000, 90_000] },
      [erro('X', 2, 3_000)],
    );
    expect(narrarEventos(resultado)).toEqual(narrarEventos(resultado));
  });

  it('a frase da variante continua vindo do pool (PR A segue valendo)', () => {
    const resultado = resultadoDe(
      { X: [90_000, 92_000], Y: [91_000, 90_000] },
      [erro('X', 2, 3_000)],
    );
    expect(VARIANTES_SECO['erro-piloto']).toContain(narrarEventos(resultado)[0].frase);
  });
});
