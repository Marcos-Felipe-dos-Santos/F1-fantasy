import { describe, expect, it } from 'vitest';
import {
  CHU_BOM,
  CHU_FORTE,
  CHU_OVERRIDES,
  CHU_REGENMEISTER,
  ULT_BOM,
  ULT_ELITE,
  ULT_FORTE,
  ULT_OVERRIDES,
} from './overrides-curados.ts';
import type { FatosAgregados } from './agregar-fatos.ts';
import fatosReal from './derived/fatos-agregados.json';

const fatos = fatosReal as unknown as FatosAgregados;
const titularIds = new Set(fatos.titulares.map((t) => t.driverId));

describe('ULT_OVERRIDES', () => {
  it('tem exatamente 31 entradas (contagem exata — não encolhe/infla sem ver)', () => {
    expect(Object.keys(ULT_OVERRIDES).length).toBe(31);
  });

  it('todo driverId existe entre os titulares reais de fatos-agregados.json (guarda anti-typo/anti-morto)', () => {
    for (const driverId of Object.keys(ULT_OVERRIDES)) {
      expect(titularIds.has(driverId)).toBe(true);
    }
  });

  it('todo valor está dentro de [28,96] (faixa-alvo da derivação)', () => {
    for (const valor of Object.values(ULT_OVERRIDES)) {
      expect(valor).toBeGreaterThanOrEqual(28);
      expect(valor).toBeLessThanOrEqual(96);
    }
  });

  it('tiers nomeados: ELITE=96, FORTE=90, BOM=84', () => {
    expect(ULT_ELITE).toBe(96);
    expect(ULT_FORTE).toBe(90);
    expect(ULT_BOM).toBe(84);
  });

  it('âncoras de tier: Senna=ELITE, Montoya=FORTE, Pérez=BOM', () => {
    expect(ULT_OVERRIDES.senna).toBe(ULT_ELITE);
    expect(ULT_OVERRIDES.montoya).toBe(ULT_FORTE);
    expect(ULT_OVERRIDES.perez).toBe(ULT_BOM);
  });
});

describe('CHU_OVERRIDES', () => {
  it('tem exatamente 30 entradas (contagem exata — não encolhe/infla sem ver)', () => {
    expect(Object.keys(CHU_OVERRIDES).length).toBe(30);
  });

  it('todo driverId existe entre os titulares reais de fatos-agregados.json (guarda anti-typo/anti-morto)', () => {
    for (const driverId of Object.keys(CHU_OVERRIDES)) {
      expect(titularIds.has(driverId)).toBe(true);
    }
  });

  it('todo valor está dentro de [28,96] (faixa-alvo da derivação)', () => {
    for (const valor of Object.values(CHU_OVERRIDES)) {
      expect(valor).toBeGreaterThanOrEqual(28);
      expect(valor).toBeLessThanOrEqual(96);
    }
  });

  it('tiers nomeados: REGENMEISTER=96, FORTE=88, BOM=80', () => {
    expect(CHU_REGENMEISTER).toBe(96);
    expect(CHU_FORTE).toBe(88);
    expect(CHU_BOM).toBe(80);
  });

  it('âncoras de tier: Senna=REGENMEISTER, Button=FORTE, Damon Hill=BOM', () => {
    expect(CHU_OVERRIDES.senna).toBe(CHU_REGENMEISTER);
    expect(CHU_OVERRIDES.button).toBe(CHU_FORTE);
    expect(CHU_OVERRIDES.damon_hill).toBe(CHU_BOM);
  });

  it('armadilha de id: "hill" (Graham) e "damon_hill" (Damon) são entradas distintas', () => {
    expect(CHU_OVERRIDES.hill).toBe(CHU_BOM);
    expect(CHU_OVERRIDES.damon_hill).toBe(CHU_BOM);
    expect(Object.keys(CHU_OVERRIDES)).toContain('hill');
    expect(Object.keys(CHU_OVERRIDES)).toContain('damon_hill');
  });
});
