import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LARGURA_ASFALTO } from './pista-camadas';
import { DESLOCAMENTO_REFLEXO, reflexosDaPista } from './molhado';
import { tracadoSuavizado } from './suavizacao';
import { cores } from './tokens';
import { TRACADOS_POR_PISTA } from './tracados';

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe('asfalto molhado (decisão do Marcos: #313131)', () => {
  const molhado = cores.pistaAsfaltoMolhado;

  it('é o tom escolhido, e continua sendo a superfície mais clara da pilha', () => {
    expect(molhado).toBe('#313131');
    expect(luminancia(molhado)).toBeGreaterThan(luminancia(cores.pistaMuro));
    expect(luminancia(molhado)).toBeLessThan(luminancia(cores.pistaAsfalto));
  });

  it('respeita o teto: carro do jogador, carro do bot e limite seguem a 3:1', () => {
    expect(contraste(cores.primaria, molhado)).toBeGreaterThanOrEqual(3);
    expect(contraste(cores.carroBot, molhado)).toBeGreaterThanOrEqual(3);
    expect(contraste(cores.pistaLimite, molhado)).toBeGreaterThanOrEqual(3);
  });

  it('EXCEÇÃO registrada: fica a 1,124 do muro, abaixo dos 1,25 do asfalto seco', () => {
    // Na tela os dois não se tocam: o limite de pista corre entre eles. Se um dia
    // esta razão passar de 1,25, a exceção acabou e este teste deve sair junto.
    const razao = luminancia(molhado) / luminancia(cores.pistaMuro);
    expect(razao).toBeCloseTo(1.124, 3);
  });

  it('entra só por cima do token da pista: o seco continua intacto', () => {
    const css = readFileSync('src/ui/estilos.css', 'utf8');
    expect(css).toMatch(/\.tracado-svg--molhado\s*\{[^}]*--pista-asfalto:\s*var\(--pista-asfalto-molhado\)/);
    expect(cores.pistaAsfalto).toBe('#363636');
  });
});

describe('reflexos do asfalto molhado', () => {
  const PISTAS = Object.keys(TRACADOS_POR_PISTA);

  it.each(PISTAS)('%s: dois traços finos, dentro do asfalto', (id) => {
    const reflexos = reflexosDaPista(id);
    expect(reflexos.length).toBe(2);
    expect(reflexos[0].tracejado).not.toBe(reflexos[1].tracejado);
    const curva = tracadoSuavizado(id);
    for (const { d } of reflexos) {
      const pontos = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
      expect(pontos.length).toBe(curva.length);
      for (const p of pontos) {
        const perto = Math.min(...curva.map((c) => Math.hypot(c.x - p.x, c.y - p.y)));
        expect(perto).toBeLessThan(LARGURA_ASFALTO / 2);
      }
    }
  });

  it('lados opostos do eixo, à mesma distância', () => {
    const [a, b] = reflexosDaPista('pista-spa');
    const primeiro = (d: string) => {
      const m = /M(-?[\d.]+) (-?[\d.]+)/.exec(d)!;
      return { x: Number(m[1]), y: Number(m[2]) };
    };
    const pa = primeiro(a.d);
    const pb = primeiro(b.d);
    expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeCloseTo(2 * DESLOCAMENTO_REFLEXO, 0);
  });

  it('é memoizado: a tela renderiza a cada frame', () => {
    expect(reflexosDaPista('pista-spa')).toBe(reflexosDaPista('pista-spa'));
  });
});
