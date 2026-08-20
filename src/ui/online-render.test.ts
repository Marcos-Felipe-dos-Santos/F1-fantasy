/**
 * Smoke-test de RENDER do modo Online (PR 3.3).
 *
 * Mesmo espírito de `campeonato-render.test.ts`: o projeto não tem jsdom, mas
 * um erro de runtime na primeira renderização (prop faltando, `undefined.map`,
 * hook mal usado) passa por `tsc`, por `eslint` e pela suíte inteira, e só
 * aparece como TELA BRANCA na mão do dev. Este PR liga telas novas ao app —
 * exatamente o caso em que isso dói.
 *
 * `.ts` com `createElement` + `renderToStaticMarkup`, para não mexer no glob do
 * vitest. Não substitui o teste no navegador: não há evento, clique nem
 * WebSocket. Cobre uma coisa só — **as telas montam, e mostram o que devem**.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TelaLobby } from './TelaLobby';
import { criarSala, publicarSala, reduzirSala } from '../net/sala';
import { N_ETAPAS_CURTA, type EstadoSala } from '../net/tipos';
import type { ComandoSala } from '../net/protocolo';

/**
 * Seeds do campeonato para os testes desta suíte (3.5.1). Valores fixos e
 * distintivos — nenhum deles é derivado da `seedMestre`, que é o ponto do
 * `B-indep`. Quem exercita o comportamento das seeds é
 * `campeonato-online.test.ts`; aqui elas só satisfazem o construtor.
 */
const SEEDS_T = {
  etapas: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010],
  calendario: 7777,
};

const T0 = 1_000_000;
let n = 0;
const aplicar = (estado: EstadoSala, comando: ComandoSala, remetente: string | null): EstadoSala =>
  reduzirSala(estado, comando, remetente, T0, `tk-${(n += 1)}`).estado;

function salaCom(nomes: string[], prontos: boolean[] = []): EstadoSala {
  let sala = criarSala('sala-render', 2026, 'dificil', T0, SEEDS_T, N_ETAPAS_CURTA);
  for (const nome of nomes) sala = aplicar(sala, { tipo: 'entrar', nome }, null);
  sala.jogadores.forEach((j, i) => {
    if (prontos[i]) sala = aplicar(sala, { tipo: 'pronto', pronto: true }, j.id);
  });
  return sala;
}

const props = (extra: Partial<Parameters<typeof TelaLobby>[0]> = {}) => ({
  sala: null,
  euSou: null,
  estadoConexao: 'aberta' as const,
  erro: null,
  nome: '',
  onNomeChange: () => {},
  onEntrar: () => {},
  onPronto: () => {},
  onIniciar: () => {},
  onSair: () => {},
  onVoltar: () => {},
  urlDaSala: 'ws://127.0.0.1:8787/parties/sala/sala-render',
  ...extra,
});

const render = (extra: Parameters<typeof props>[0] = {}) =>
  renderToStaticMarkup(createElement(TelaLobby, props(extra)));

describe('TelaLobby monta', () => {
  it('sem estado ainda: pede o nome, sem quebrar', () => {
    const html = render();
    expect(html).toContain('Seu nome');
    expect(html).toContain('Entrar na sala');
  });

  it('já na sala: mostra quem sou eu e quem é o anfitrião', () => {
    const sala = publicarSala(salaCom(['Ana', 'Beto']));
    const html = render({ sala, euSou: 'humano-02' });
    expect(html).toContain('Ana');
    expect(html).toContain('Beto');
    expect(html).toContain('(você)');
    expect(html).toContain('👑');
  });

  it('DIZ POR QUE não dá pra começar — botão cinza sem explicação trava o jogador', () => {
    // Um humano só: falta gente.
    const soUm = publicarSala(salaCom(['Ana'], [true]));
    expect(render({ sala: soUm, euSou: 'humano-01' })).toContain('Faltam');

    // Dois, um não pronto: falta o pronto dele, e o nome aparece.
    const umNaoPronto = publicarSala(salaCom(['Ana', 'Beto'], [true, false]));
    const html = render({ sala: umNaoPronto, euSou: 'humano-01' });
    expect(html).toContain('Esperando');
    expect(html).toContain('Beto');
  });

  it('quem não é anfitrião vê que só o anfitrião começa', () => {
    const sala = publicarSala(salaCom(['Ana', 'Beto'], [true, true]));
    expect(render({ sala, euSou: 'humano-02' })).toContain('Só o anfitrião');
  });

  it('o estado da conexão aparece na tela', () => {
    expect(render({ estadoConexao: 'reconectando' })).toContain('reconectando');
    expect(render({ estadoConexao: 'fechada' })).toContain('desconectado');
  });

  it('o TOKEN nunca chega à tela — nem por acidente de prop', () => {
    // O lobby recebe `EstadoSalaPublico`, que não tem `tokens`. Este teste
    // trava a garantia no ponto onde ela seria mais visível se falhasse.
    const interna = salaCom(['Ana', 'Beto']);
    const html = render({ sala: publicarSala(interna), euSou: 'humano-01' });
    for (const token of Object.values(interna.tokens)) {
      expect(html, `o token ${token} apareceu no HTML`).not.toContain(token);
    }
  });
});
