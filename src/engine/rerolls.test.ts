import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipes from '../fixtures/dataset-semente/equipe-anos.json';
import pecas from '../fixtures/dataset-semente/pecas.json';
import pistas from '../fixtures/dataset-semente/pistas.json';
import { criarDraft } from './draft';
import { aplicarReroll, candidatosDoReroll, controleRerolls } from './rerolls';
import type { DraftState, TipoReroll } from './types';
import { createRng, deriveSeed } from './rng';
import { ehTop3Oficial } from './draft-top3';

const base = criarDataset(equipes, pecas, pistas);
const dataset = {
  ...base,
  equipeAnos: ['Ferrari', 'McLaren', 'Williams', 'Lotus'].flatMap((equipe) =>
    [1980, 1988, 1991, 2004, 2023, 2024].map((ano) => ({ ...base.equipeAnos[0], equipe, ano })),
  ),
};
function inicial(): DraftState {
  return criarDraft(
    dataset,
    Array.from({ length: 22 }, (_, i) => ({ id: `j${i}`, tipo: 'humano' })),
    123,
  );
}
function pedir(state: DraftState, alvo: TipoReroll, id = 'j0') {
  return aplicarReroll(state, dataset, id, {
    tipo: 'reroll',
    alvo,
    turnoEsperado: state.progresso[id].rodada,
    revisaoEsperada: controleRerolls(state, id).revisao,
  });
}

describe('rerolls replicados', () => {
  it('inicializa 22 controles independentes', () => {
    const s = inicial();
    expect(Object.keys(s.rerolls)).toHaveLength(22);
    expect(s.rerolls.j0).toEqual({
      comunsUsados: 0,
      especialUsado: false,
      revisao: 0,
      descartados: [],
    });
    expect(s.rerolls.j0.descartados).not.toBe(s.rerolls.j1.descartados);
  });
  it.each(['marca', 'ano', 'ambos'] as const)(
    'respeita dimensão, exclusões e imutabilidade: %s',
    (alvo) => {
      const s = inicial();
      const atual = s.sorteios.j0[0];
      const banido = candidatosDoReroll(s, dataset, 'j0', alvo)[0];
      s.rerolls.j0.descartados = [banido];
      const antes = structuredClone(s);
      const candidatos = candidatosDoReroll(s, dataset, 'j0', alvo);
      expect(candidatos.length).toBeGreaterThan(0);
      for (const ref of candidatos) {
        expect(s.sorteios.j0).not.toContainEqual(ref);
        expect(ref).not.toEqual(banido);
        expect(ref.equipe === atual.equipe).toBe(alvo === 'ano');
        expect(ref.ano === atual.ano).toBe(alvo === 'marca');
      }
      const r = pedir(s, alvo);
      expect(r.resultado).toBe('aplicado');
      expect(s).toEqual(antes);
      expect(r.state.progresso).toBe(s.progresso);
      expect(r.state.sorteios.j0.slice(1)).toEqual(s.sorteios.j0.slice(1));
      expect(r.state.sorteios.j1).toBe(s.sorteios.j1);
      expect(r.state.rerolls.j1).toBe(s.rerolls.j1);
      expect(r.state.rerolls.j0.descartados).toEqual([banido, atual]);
      expect(r.state.ordemPeca).toBe(s.ordemPeca);
      expect(r.state.loadouts).toBe(s.loadouts);
    },
  );
  it('compartilha três comuns pelas cinco rodadas e mantém especial separado', () => {
    let s = inicial();
    for (let rodada = 1; rodada <= 5; rodada++) {
      s = { ...s, progresso: { ...s.progresso, j0: { rodada, slots: {} } } };
      const r = pedir(s, rodada % 2 ? 'marca' : 'ano');
      expect(r.resultado).toBe(rodada <= 3 ? 'aplicado' : 'cota-esgotada');
      if (rodada > 3) expect(r.state.sorteios).toBe(s.sorteios);
      s = r.state;
    }
    expect(s.rerolls.j0).toMatchObject({ comunsUsados: 3, revisao: 5, especialUsado: false });
    s = pedir(s, 'ambos').state;
    expect(s.rerolls.j0).toMatchObject({ comunsUsados: 3, revisao: 6, especialUsado: true });
    expect(pedir(s, 'ambos').resultado).toBe('cota-esgotada');
  });
  it('Brawn com um ano dá pool vazio grátis e incrementa revisão', () => {
    const s = inicial();
    s.sorteios.j0[0] = { equipe: 'Brawn', ano: 2009 };
    const ds = {
      ...dataset,
      equipeAnos: [...dataset.equipeAnos, { ...base.equipeAnos[0], equipe: 'Brawn', ano: 2009 }],
    };
    const r = aplicarReroll(s, ds, 'j0', {
      tipo: 'reroll',
      alvo: 'ano',
      turnoEsperado: 1,
      revisaoEsperada: 0,
    });
    expect(r.resultado).toBe('pool-vazio');
    expect(r.state.sorteios).toBe(s.sorteios);
    expect(r.state.rerolls.j0).toEqual({ ...s.rerolls.j0, revisao: 1 });
  });
  it('rejeita turno e revisão stale sem alterar nada', () => {
    const s = inicial();
    for (const [turnoEsperado, revisaoEsperada, resultado] of [
      [2, 0, 'turno-divergente'],
      [1, 1, 'revisao-divergente'],
    ] as const) {
      expect(
        aplicarReroll(s, dataset, 'j0', {
          tipo: 'reroll',
          alvo: 'marca',
          turnoEsperado,
          revisaoEsperada,
        }),
      ).toEqual({ state: s, resultado });
    }
    const novo = pedir(s, 'marca').state;
    expect(
      aplicarReroll(novo, dataset, 'j0', {
        tipo: 'reroll',
        alvo: 'marca',
        turnoEsperado: 1,
        revisaoEsperada: 0,
      }).state,
    ).toBe(novo);
  });
  it('recusa bots, desconhecidos, peça, concluído e rodada fora de 1–5', () => {
    const s = inicial();
    s.jogadores[0] = { id: 'j0', tipo: 'bot', perfilBot: 'passeio' };
    expect(pedir(s, 'marca').resultado).toBe('nao-permitido');
    expect(
      aplicarReroll(s, dataset, 'ausente', {
        tipo: 'reroll',
        alvo: 'ano',
        turnoEsperado: 1,
        revisaoEsperada: 0,
      }).state,
    ).toBe(s);
    for (const fase of ['peca', 'concluido'] as const)
      expect(pedir({ ...inicial(), fase }, 'marca').resultado).toBe('nao-permitido');
    for (const rodada of [0, 6]) {
      const x = inicial();
      x.progresso.j0.rodada = rodada;
      expect(pedir(x, 'marca').resultado).toBe('nao-permitido');
      expect(candidatosDoReroll(x, dataset, 'j0', 'marca')).toEqual([]);
    }
  });
  it('legado concluído sem controles é esgotado; ativo falha alto', () => {
    const s = inicial();
    Reflect.deleteProperty(s, 'rerolls');
    expect(() => controleRerolls(s, 'j0')).toThrow();
    expect(controleRerolls({ ...s, fase: 'concluido' }, 'j0')).toEqual({
      comunsUsados: 3,
      especialUsado: true,
      revisao: 0,
      descartados: [],
    });
    expect(() => candidatosDoReroll(s, dataset, 'j0', 'marca')).toThrow();
  });
  it('isola streams e reproduz sequência após reconexão JSON', () => {
    const s = inicial();
    const a = pedir(pedir(s, 'marca', 'j0').state, 'ano', 'j1').state;
    const b = pedir(pedir(s, 'ano', 'j1').state, 'marca', 'j0').state;
    expect(a).toEqual(b);
    let conectado = a;
    let retomado: DraftState = JSON.parse(JSON.stringify(a));
    for (const alvo of ['ano', 'ambos', 'marca', 'ano'] as const) {
      conectado = pedir(conectado, alvo).state;
      retomado = pedir(retomado, alvo).state;
      expect(retomado).toEqual(conectado);
    }
  });
  it('usa o substream contratado e pesos oficiais (oráculo por prefixo)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = { ...inicial(), seed };
      const candidatos = candidatosDoReroll(s, dataset, 'j0', 'ambos');
      const pesos = candidatos.map(
        (r) =>
          1 +
          (r.ano >= 1985 ? 0.5 : 0) +
          ([1988, 1991, 1994, 2004, 2008, 2012, 2016, 2021, 2023].includes(r.ano) ? 0.5 : 0) +
          (ehTop3Oficial(r) ? 0.5 : 0),
      );
      let alvo =
        createRng(deriveSeed(seed, 'draft:reroll:j0:1:0:ambos')).next() *
        pesos.reduce((a, b) => a + b, 0);
      const indice = pesos.findIndex((p) => {
        alvo -= p;
        return alvo < 0;
      });
      expect(pedir(s, 'ambos').state.sorteios.j0[0]).toEqual(candidatos[indice]);
    }
  });
});
