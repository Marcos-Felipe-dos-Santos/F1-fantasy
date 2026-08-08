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
import type { EventoCorrida, TipoEvento } from '../engine/types';
import { narrarEvento, VARIANTES_CHUVA, VARIANTES_SECO, variantesDe } from './narracao';

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
