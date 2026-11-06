/**
 * Mudo e volume do som (PR 3b), salvos no aparelho no mesmo padrão da preferência de tema
 * (`tema.ts`): lógica pura, armazenamento injetado, valor corrompido cai no padrão e falha de
 * armazenamento nunca derruba o app.
 *
 * Padrão (decisão do Marcos, 2026-11-06): som LIGADO depois do primeiro toque, volume moderado. O
 * volume padrão é o mestre 0,8 do preview que ele aprovou no celular (`scripts/sons/montar-preview.ts`):
 * no padrão, o jogo soa como aquele preview.
 */

export interface PreferenciaSom {
  mudo: boolean;
  /** Ganho do mestre, de 0 a 1. */
  volume: number;
}

export const CHAVE_MUDO = 'f1-fantasy:som-mudo';
export const CHAVE_VOLUME = 'f1-fantasy:som-volume';
export const VOLUME_PADRAO = 0.8;

/** Só decimal simples: `Number` aceitaria '', ' ', '0x1' e 'Infinity'. */
const DECIMAL = /^\d+(\.\d+)?$/;

export function lerPreferenciaSom(armazenamento: Pick<Storage, 'getItem'> | null): PreferenciaSom {
  try {
    const mudo = armazenamento?.getItem(CHAVE_MUDO) === '1';
    const bruto = armazenamento?.getItem(CHAVE_VOLUME) ?? null;
    const v = bruto !== null && DECIMAL.test(bruto) ? Number(bruto) : NaN;
    return { mudo, volume: v >= 0 && v <= 1 ? v : VOLUME_PADRAO };
  } catch {
    // Mesmo motivo de `lerPreferencia` (tema): modo privado e cookies bloqueados lançam.
    return { mudo: false, volume: VOLUME_PADRAO };
  }
}

export function salvarPreferenciaSom(
  pref: PreferenciaSom,
  armazenamento: Pick<Storage, 'setItem'> | null,
): void {
  try {
    armazenamento?.setItem(CHAVE_MUDO, pref.mudo ? '1' : '0');
    armazenamento?.setItem(CHAVE_VOLUME, String(pref.volume));
  } catch {
    /* ver `lerPreferenciaSom` */
  }
}

export function ganhoMestre(pref: PreferenciaSom): number {
  return pref.mudo ? 0 : pref.volume;
}
