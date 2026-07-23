import { describe, expect, it } from 'vitest';
import { BUCKET_POR_CIRCUITO, lookupBucket } from './circuit-buckets.ts';

describe('BUCKET_POR_CIRCUITO', () => {
  it('mapeia exatamente os 77 circuitos conhecidos do cache', () => {
    expect(Object.keys(BUCKET_POR_CIRCUITO).length).toBe(77);
  });

  it('contagens por bucket: potencia=18, travado=16, aero=23, neutro=20', () => {
    const contagens = { potencia: 0, travado: 0, aero: 0, neutro: 0 };
    for (const bucket of Object.values(BUCKET_POR_CIRCUITO)) {
      contagens[bucket]++;
    }
    expect(contagens).toEqual({ potencia: 18, travado: 16, aero: 23, neutro: 20 });
  });

  it('âncoras do dev: Monza/Spa=potência, Mônaco/Hungaroring=travado, Silverstone/Suzuka=aero', () => {
    expect(BUCKET_POR_CIRCUITO.monza).toBe('potencia');
    expect(BUCKET_POR_CIRCUITO.spa).toBe('potencia');
    expect(BUCKET_POR_CIRCUITO.monaco).toBe('travado');
    expect(BUCKET_POR_CIRCUITO.hungaroring).toBe('travado');
    expect(BUCKET_POR_CIRCUITO.silverstone).toBe('aero');
    expect(BUCKET_POR_CIRCUITO.suzuka).toBe('aero');
  });

  it('casos de era mista documentados: nurburgring e hockenheimring', () => {
    // Nordschleife (1951-76) vs GP-Strecke (1984+) — era mista ⇒ neutro.
    expect(BUCKET_POR_CIRCUITO.nurburgring).toBe('neutro');
    // Potência pela era dominante (1970-2001, 31/37 temporadas).
    expect(BUCKET_POR_CIRCUITO.hockenheimring).toBe('potencia');
  });
});

describe('lookupBucket', () => {
  it('circuito conhecido retorna o bucket da tabela, sem coletar nada', () => {
    const naoMapeados = new Set<string>();
    expect(lookupBucket('monza', naoMapeados)).toBe('potencia');
    expect(naoMapeados.size).toBe(0);
  });

  it('circuito desconhecido cai em "neutro" e é coletado em circuitosNaoMapeados (nunca silencioso)', () => {
    const naoMapeados = new Set<string>();
    expect(lookupBucket('circuito-inexistente', naoMapeados)).toBe('neutro');
    expect(naoMapeados.has('circuito-inexistente')).toBe(true);
  });
});
