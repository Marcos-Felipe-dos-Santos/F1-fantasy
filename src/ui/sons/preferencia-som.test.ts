import { describe, expect, it } from 'vitest';
import {
  CHAVE_MUDO,
  CHAVE_VOLUME,
  ganhoMestre,
  lerPreferenciaSom,
  salvarPreferenciaSom,
  VOLUME_PADRAO,
} from './preferencia-som';

function armazenamento(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
  };
}

const quebrado = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('preferência de som (mudo e volume salvos no aparelho)', () => {
  it('sem nada salvo: som ligado, volume moderado (o mestre 0,8 do preview aprovado)', () => {
    expect(lerPreferenciaSom(armazenamento())).toEqual({ mudo: false, volume: VOLUME_PADRAO });
    expect(VOLUME_PADRAO).toBe(0.8);
  });

  it('sem armazenamento utilizável (null ou que lança): o padrão, sem lançar', () => {
    expect(lerPreferenciaSom(null)).toEqual({ mudo: false, volume: VOLUME_PADRAO });
    expect(lerPreferenciaSom(quebrado)).toEqual({ mudo: false, volume: VOLUME_PADRAO });
    expect(() => salvarPreferenciaSom({ mudo: true, volume: 0.3 }, quebrado)).not.toThrow();
    expect(() => salvarPreferenciaSom({ mudo: true, volume: 0.3 }, null)).not.toThrow();
  });

  it('ida e volta', () => {
    const a = armazenamento();
    salvarPreferenciaSom({ mudo: true, volume: 0.35 }, a);
    expect(a.dados.get(CHAVE_MUDO)).toBe('1');
    expect(a.dados.get(CHAVE_VOLUME)).toBe('0.35');
    expect(lerPreferenciaSom(a)).toEqual({ mudo: true, volume: 0.35 });
    salvarPreferenciaSom({ mudo: false, volume: 0 }, a);
    expect(lerPreferenciaSom(a)).toEqual({ mudo: false, volume: 0 });
    salvarPreferenciaSom({ mudo: false, volume: 1 }, a);
    expect(lerPreferenciaSom(a)).toEqual({ mudo: false, volume: 1 });
  });

  it.each(['NaN', '1.5', '-0.1', 'alto', '', ' ', 'Infinity', '0x1'])(
    'volume corrompido "%s" cai no padrão',
    (bruto) => {
      expect(lerPreferenciaSom(armazenamento({ [CHAVE_VOLUME]: bruto })).volume).toBe(
        VOLUME_PADRAO,
      );
    },
  );

  it.each(['true', 'sim', '', '2'])('mudo corrompido "%s" cai em ligado', (bruto) => {
    expect(lerPreferenciaSom(armazenamento({ [CHAVE_MUDO]: bruto })).mudo).toBe(false);
  });

  it('o mudo vence o volume no ganho do mestre', () => {
    expect(ganhoMestre({ mudo: true, volume: 0.9 })).toBe(0);
    expect(ganhoMestre({ mudo: false, volume: 0.9 })).toBe(0.9);
  });
});
