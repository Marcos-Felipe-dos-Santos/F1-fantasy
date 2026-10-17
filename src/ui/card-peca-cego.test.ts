/**
 * Guard-rail do Modo Cego (PR 5.1a): garante que `CardPeca`, no modo `'cego'`,
 * renderiza estruturalmente IDÊNTICO para uma peça ☠️ proibida e uma 🟢 comum
 * do dataset real — nenhuma classe, atributo, emoji ou texto pode vazar
 * raridade/força. Este teste roda sobre `renderToStaticMarkup` (Node puro,
 * sem jsdom) e não deve exigir NENHUMA mudança em código de produção: se
 * falhar contra o estado atual, é vazamento existente — parar e reportar.
 *
 * `.ts` (não `.tsx`) de propósito: usa `createElement` em vez de JSX pra não
 * precisar alterar o include glob do `vitest.config`/`vite.config`.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CardPeca } from './componentes';
import { dataset } from './dataset-app';
import { pecaVisivel } from './visibilidade';

const pecaProibida = dataset.pecasById.get('peca-suspensao-ativa-fw15');
const pecaComum = dataset.pecasById.get('peca-asa-flexivel');

if (!pecaProibida || !pecaComum) {
  throw new Error('card-peca-cego.test: peças de fixture não encontradas no dataset');
}

const EMOJIS_RARIDADE = ['🟢', '🔵', '🟣', '🟡', '☠️'];

/** Substitui o nome real da peça por um placeholder comum, pra comparar o resto do markup. */
function normalizado(html: string, nome: string): string {
  return html.split(nome).join('__NOME__');
}

describe('CardPeca no modo cego — indistinguibilidade estrutural', () => {
  it('markup de peça ☠️ proibida e 🟢 comum é idêntico (fora do nome)', () => {
    const viewProibida = pecaVisivel(pecaProibida, 'cego');
    const viewComum = pecaVisivel(pecaComum, 'cego');

    const htmlProibida = renderToStaticMarkup(createElement(CardPeca, { peca: viewProibida }));
    const htmlComum = renderToStaticMarkup(createElement(CardPeca, { peca: viewComum }));

    expect(normalizado(htmlProibida, pecaProibida.nome)).toBe(normalizado(htmlComum, pecaComum.nome));
  });

  it('markup cego não contém nenhuma dica de raridade/força (classes, emojis, rótulos)', () => {
    const view = pecaVisivel(pecaProibida, 'cego');
    const html = renderToStaticMarkup(createElement(CardPeca, { peca: view }));

    expect(html).not.toContain('raridade');
    for (const emoji of EMOJIS_RARIDADE) {
      expect(html).not.toContain(emoji);
    }
    expect(html).not.toContain('Bônus');
    expect(html).not.toContain('Risco');
    expect(html).not.toContain('Alvo');
    expect(html).not.toContain(pecaProibida.categoria);
  });

  it('markup cego (clicável) também é indistinguível — mesma verificação com onClick', () => {
    const viewProibida = pecaVisivel(pecaProibida, 'cego');
    const viewComum = pecaVisivel(pecaComum, 'cego');
    const noop = () => {};

    const htmlProibida = renderToStaticMarkup(createElement(CardPeca, { peca: viewProibida, onClick: noop }));
    const htmlComum = renderToStaticMarkup(createElement(CardPeca, { peca: viewComum, onClick: noop }));

    expect(normalizado(htmlProibida, pecaProibida.nome)).toBe(normalizado(htmlComum, pecaComum.nome));
  });
});
