/**
 * PR 3.3.2 — código de sala.
 *
 * O que estes testes protegem não é formatação: é a **privacidade da sala**. O
 * código substituiu o `sala-1` que qualquer um adivinhava, e a validação é o
 * único ponto entre um `?sala=<lixo>` e a abertura de um Durable Object.
 */

import { describe, expect, it } from 'vitest';
import {
  codigoDeBytes,
  codigoLegivel,
  COMBINACOES,
  normalizarCodigo,
  TAMANHO_CODIGO,
} from './codigo-sala';

describe('tamanho do código', () => {
  it('são 6 dígitos = 16.777.216 combinações (o número que justifica a escolha)', () => {
    // Não é sobre colisão — nunca haverá salas simultâneas suficientes. É sobre
    // ENUMERAÇÃO: com 4 dígitos seriam 65.536, que um script varre em minutos
    // entrando em salas alheias.
    expect(TAMANHO_CODIGO).toBe(6);
    expect(COMBINACOES).toBe(16_777_216);
    expect(COMBINACOES / 65_536).toBe(256); // 256× mais caro de varrer que 4 dígitos
  });

  it('o alfabeto hex não tem os pares ambíguos de leitura', () => {
    // `0`/`O` e `1`/`I` são o clássico de código digitado errado. Em 0-9A-F não
    // existe `O` nem `I`.
    const alfabeto = '0123456789ABCDEF';
    expect(alfabeto).not.toContain('O');
    expect(alfabeto).not.toContain('I');
  });
});

describe('codigoDeBytes', () => {
  it('formata em hex maiúsculo, com zero à esquerda', () => {
    expect(codigoDeBytes(new Uint8Array([0xa3, 0xf9, 0xc2]))).toBe('A3F9C2');
    expect(codigoDeBytes(new Uint8Array([0x00, 0x0f, 0x01]))).toBe('000F01');
  });

  it('ignora bytes sobrando e exige o mínimo', () => {
    expect(codigoDeBytes(new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55]))).toBe('112233');
    expect(() => codigoDeBytes(new Uint8Array([0x11, 0x22]))).toThrow();
  });

  it('todo byte possível gera dígito hex válido', () => {
    for (let b = 0; b < 256; b += 1) {
      const codigo = codigoDeBytes(new Uint8Array([b, b, b]));
      expect(codigo, `byte ${b}`).toMatch(/^[0-9A-F]{6}$/);
    }
  });
});

describe('normalizarCodigo — o único ponto de validação', () => {
  it('aceita o que gente realmente digita', () => {
    // Minúscula (redigitou), espaço e hífen (foi ditado em blocos).
    for (const bruto of ['A3F9C2', 'a3f9c2', 'A3 F9 C2', 'a3-f9-c2', ' A3F9C2 ']) {
      expect(normalizarCodigo(bruto), bruto).toBe('A3F9C2');
    }
  });

  it('recusa tudo que não é código — inclusive o que abriria um DO pra lixo', () => {
    const lixo = [
      '',
      'A3F9C', // curto
      'A3F9C22', // longo
      'A3F9CG', // G não é hex
      'sala-1', // o default antigo, que é o ponto de tudo isto
      '../../etc',
      'A3F9C2; DROP',
      null,
      undefined,
      42,
      {},
      [],
    ];
    for (const bruto of lixo) {
      expect(normalizarCodigo(bruto), JSON.stringify(bruto)).toBeNull();
    }
  });

  it('é idempotente: normalizar o já normalizado não muda', () => {
    const uma = normalizarCodigo('a3 f9 c2')!;
    expect(normalizarCodigo(uma)).toBe(uma);
  });
});

describe('codigoLegivel', () => {
  it('quebra em blocos de dois, pra ditar por voz', () => {
    expect(codigoLegivel('A3F9C2')).toBe('A3 F9 C2');
  });

  it('o legível volta ao original pelo normalizador', () => {
    expect(normalizarCodigo(codigoLegivel('A3F9C2'))).toBe('A3F9C2');
  });
});
