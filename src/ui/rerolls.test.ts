import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { criarDraft } from '../engine/draft';
import { candidatosDoReroll, controleRerolls } from '../engine/rerolls';
import { dataset } from './dataset-app';
import { aplicarRerollDoJogador } from './fluxo-draft';
import { TelaDraft } from './TelaDraft';
import { carregarCampeonato } from './persistencia';

const inicial = () =>
  criarDraft(
    dataset,
    Array.from({ length: 22 }, (_, i) => ({
      id: i === 0 ? 'eu' : `j${i}`,
      tipo: 'humano' as const,
    })),
    123,
  );
const render = (pendente = false, esgotado = false) => {
  const state = inicial();
  if (esgotado) Object.assign(state.rerolls.eu, { comunsUsados: 3, especialUsado: true });
  return renderToStaticMarkup(
    createElement(TelaDraft, {
      state,
      jogadorId: 'eu',
      visibilidade: 'craque',
      erro: null,
      onEscolher: () => {},
      onReroll: () => {},
      pendente,
    }),
  );
};

describe('rerolls UI', () => {
  it('wrapper preserva rodada, slots, loadouts e outros sorteios', () => {
    const state = inicial();
    const antes = structuredClone(state);
    const novo = aplicarRerollDoJogador(dataset, state, 'eu', 'ambos');
    expect(novo.resultado).toBe('aplicado');
    expect(novo.state.progresso).toBe(state.progresso);
    expect(novo.state.loadouts).toBe(state.loadouts);
    expect(novo.state.sorteios.eu.slice(1)).toEqual(state.sorteios.eu.slice(1));
    expect(controleRerolls(novo.state, 'eu').especialUsado).toBe(true);
    expect(state).toEqual(antes);
  });
  it('mostra saldo e três ações', () => {
    const html = render();
    for (const texto of ['Trocar marca', 'Trocar ano', 'Trocar marca + ano', '3', '1'])
      expect(html).toContain(texto);
  });
  it('bloqueia rerolls e escolhas durante pending', () => {
    const html = render(true);
    expect(html).toContain('<fieldset class="rerolls__escolhas" disabled="">');
    for (const texto of ['Trocar marca', 'Trocar ano', 'Trocar marca + ano']) {
      expect(html).toMatch(new RegExp('<button[^>]*disabled[^>]*>' + texto.replace('+', '\\+')));
    }
    expect(html).not.toContain('já preenchido');
  });
  it('bloqueia os três rerolls sem cota', () => {
    const html = render(false, true);
    for (const texto of ['Trocar marca', 'Trocar ano', 'Trocar marca + ano']) {
      expect(html).toMatch(new RegExp('<button[^>]*disabled[^>]*>' + texto.replace('+', '\\+')));
    }
  });
  it('bloqueia ano com pool vazio e mostra resultado online sem cobrar crédito', () => {
    const state = inicial();
    state.sorteios.eu[0] = { equipe: 'Brawn', ano: 2009 };
    expect(candidatosDoReroll(state, dataset, 'eu', 'ano')).toEqual([]);
    const html = renderToStaticMarkup(
      createElement(TelaDraft, {
        state,
        jogadorId: 'eu',
        visibilidade: 'craque',
        erro: null,
        onEscolher: () => {},
        onReroll: () => {},
        resultadoReroll: 'pool-vazio',
      }),
    );
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Trocar ano/);
    expect(html).toContain('Nenhum crédito foi usado.');
    expect(controleRerolls(state, 'eu').comunsUsados).toBe(0);
  });
  it('preserva render antigo sem callback de reroll', () => {
    const html = renderToStaticMarkup(
      createElement(TelaDraft, {
        state: inicial(),
        jogadorId: 'eu',
        visibilidade: 'craque',
        erro: null,
        onEscolher: () => {},
      }),
    );
    expect(html).toContain('Rodada 1 de 5');
    expect(html).not.toContain('Trocar marca');
  });
});

const legado = () => ({
  versaoFormato: 4,
  seed: 1,
  calendario: [],
  etapaAtual: 0,
  impressaoDigital: 'x',
  draft: {
    seed: 1,
    fase: 'concluido',
    jogadores: [{ id: 'eu', tipo: 'humano' }],
    sorteios: {},
    progresso: {},
    ordemPeca: ['eu'],
    indicePeca: 1,
    pecasReveladas: null,
    copiasRestantes: {},
    loadouts: {
      eu: {
        jogadorId: 'eu',
        pilotoId: 'p',
        chassiId: 'c',
        motorId: 'm',
        estrategistaId: 'e',
        pitId: 'b',
        pecaId: 'a',
      },
    },
  },
});
const carregar = (save: unknown) =>
  carregarCampeonato({
    getItem: () => JSON.stringify(save),
    setItem: () => {},
    removeItem: () => {},
  });
describe('save formato 4 com rerolls', () => {
  it('normaliza somente legado concluído sem mudar sorteios/loadouts', () => {
    const save = legado();
    const carga = carregar(save);
    expect(carga.ok).toBe(true);
    if (!carga.ok) throw new Error('save legado recusado');
    expect(carga.save.draft.rerolls.eu).toEqual({
      comunsUsados: 3,
      especialUsado: true,
      revisao: 0,
      descartados: [],
    });
    expect(carga.save.draft.loadouts).toEqual(save.draft.loadouts);
    expect(carga.save.draft.sorteios).toEqual(save.draft.sorteios);
  });
  it('rejeita ativo sem campo', () => {
    const save = legado();
    save.draft.fase = 'sorteios';
    expect(carregar(save)).toEqual({ ok: false, motivo: 'shape-invalido' });
  });
  it.each(
    [
      {},
      [],
      { eu: null },
      { eu: { comunsUsados: 4, especialUsado: false, revisao: 0, descartados: [] } },
      { eu: { comunsUsados: 0, especialUsado: 'sim', revisao: 0, descartados: [] } },
      { eu: { comunsUsados: 0, especialUsado: false, revisao: -1, descartados: [] } },
      {
        eu: {
          comunsUsados: 0,
          especialUsado: false,
          revisao: 0,
          descartados: [{ equipe: 'X', ano: '2000' }],
        },
      },
    ].map((rerolls) => [rerolls]),
  )('rejeita controles malformados %j', (rerolls) => {
    expect(carregar({ ...legado(), draft: { ...legado().draft, rerolls } })).toEqual({
      ok: false,
      motivo: 'shape-invalido',
    });
  });
});
