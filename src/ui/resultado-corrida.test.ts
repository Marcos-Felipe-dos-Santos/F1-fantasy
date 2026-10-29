import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DraftState, ResultadoCorrida } from '../engine/types';
import { TelaResultadoCorrida } from './TelaResultadoCorrida';
import { Podio } from './Podio';

const state: DraftState = {
  seed: 42,
  fase: 'concluido',
  jogadores: [
    { id: 'a', tipo: 'humano', nome: 'Piloto da casa' },
    { id: 'b', tipo: 'bot', perfilBot: 'praGanhar' },
    { id: 'c', tipo: 'bot', perfilBot: 'passeio' },
  ],
  sorteios: {},
  progresso: {},
  ordemPeca: [],
  indicePeca: 0,
  pecasReveladas: null,
  copiasRestantes: {},
  loadouts: {},
};
function resultado(): ResultadoCorrida {
  return {
    seed: 42,
    chuva: false,
    eventos: [],
    voltasDePit: {},
    classificacao: [
      {
        jogadorId: 'a',
        posicao: 1,
        pontos: 25,
        tempoTotal: 181000,
        paradas: 1,
        status: 'terminou',
        voltasCompletadas: 2,
      },
      {
        jogadorId: 'b',
        posicao: 2,
        pontos: 19,
        tempoTotal: 182000,
        paradas: 1,
        status: 'terminou',
        voltasCompletadas: 2,
      },
      {
        jogadorId: 'c',
        posicao: 3,
        pontos: 0,
        tempoTotal: 70000,
        paradas: 0,
        status: 'dnf',
        voltasCompletadas: 1,
      },
    ],
    historicoVoltas: { a: [90000, 91000], b: [89000, 93000], c: [70000] },
    voltaMaisRapida: { jogadorId: 'b', tempo: 89000 },
  };
}
const renderizar = (r = resultado()) =>
  renderToStaticMarkup(
    createElement(TelaResultadoCorrida, {
      state,
      resultado: r,
      onReiniciar: () => {},
    }),
  );
const linhas = (html: string) => html.match(/<tr\b[\s\S]*?<\/tr>/g) ?? [];
const celulas = (linha: string) => linha.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/g) ?? [];

it('pódio tem ordem semântica 1º–2º–3º e posição explícita para o layout adaptável', () => {
  const classificacao = state.jogadores.map((j, i) => ({
    jogadorId: j.id,
    pontos: 30 - i,
    vitorias: 0,
    podios: 0,
    voltasRapidas: 0,
    dnfs: 0,
    posicoes: [],
  }));
  const html = renderToStaticMarkup(createElement(Podio, { state, classificacao }));
  const lugares = [...html.matchAll(/<li[^>]*aria-label="(\d)º lugar"/g)].map((m) => m[1]);
  expect(lugares).toEqual(['1', '2', '3']);
  const itens = html.match(/<li\b[\s\S]*?<\/li>/g) ?? [];
  expect(itens[0]).toContain('Piloto da casa');
  expect(itens[1]).toContain('>b</span>');
  expect(itens[2]).toContain('>c</span>');
});

describe('resultado: tempos inequívocos', () => {
  it('separa tempo total e melhor volta, com VR somente na célula da volta', () => {
    const rows = linhas(renderizar());
    expect(rows[0]).toContain('Tempo total');
    expect(rows[0]).toContain('Melhor volta');
    const vencedor = celulas(rows[1]);
    const recordista = celulas(rows[2]);
    expect(vencedor).toHaveLength(7);
    expect(recordista[3]).toContain('3:02.000');
    expect(recordista[3]).not.toContain('VR');
    expect(recordista[4]).toContain('1:29.000');
    expect(recordista[4]).toContain('badge-vr');
    expect(vencedor[4]).not.toContain('badge-vr');
  });

  it('abandono na primeira volta mostra ausência de melhor volta', () => {
    const cells = celulas(linhas(renderizar())[3]);
    expect(cells[3]).toContain('DNF');
    expect(cells[4]).toContain('—');
    expect(cells[4]).not.toContain('1:10.000');
  });

  it('não anuncia recorde nem ponto extra quando todos abandonam sem volta válida', () => {
    const r = resultado();
    r.classificacao = r.classificacao.map((item) => ({
      ...item,
      status: 'dnf',
      voltasCompletadas: 1,
      pontos: 0,
    }));
    r.historicoVoltas = { a: [90000], b: [89000], c: [70000] };
    r.voltaMaisRapida = { jogadorId: 'a', tempo: Infinity };
    const html = renderizar(r);
    expect(html).not.toMatch(/Infinity|NaN|pontinho extra|badge-vr/);
    expect(html).toContain('Nenhuma volta válida');
    expect(html).not.toContain('terminou em');
  });

  it('recorde em corrida sem finalistas é exibido sem prometer ponto extra', () => {
    const r = resultado();
    r.classificacao = r.classificacao.map((item) => ({ ...item, status: 'dnf', pontos: 0 }));
    const html = renderizar(r);
    expect(html).toContain('1:29.000');
    expect(html).toContain('Sem ponto extra');
    expect(html).not.toContain('pontinho extra');
  });

  it('a apresentação não modifica histórico, pontuação nem resultado recebido', () => {
    const r = resultado();
    const antes = JSON.stringify(r);
    renderizar(r);
    expect(JSON.stringify(r)).toBe(antes);
  });

  it('em empate exibe VR somente para o recordista já escolhido pela engine', () => {
    const r = resultado();
    r.historicoVoltas.a = [89000, 92000];
    r.voltaMaisRapida.jogadorId = 'a';
    const rows = linhas(renderizar(r));
    expect(celulas(rows[1])[4]).toContain('badge-vr');
    expect(celulas(rows[2])[4]).not.toContain('badge-vr');
  });
});
