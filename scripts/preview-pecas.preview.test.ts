/**
 * PREVIEW DO CATÁLOGO DE PEÇAS (PR 3 da trilha de nomes fictícios) — escreve
 * `preview/pecas.html`.
 *
 * PARA QUE SERVE. A decisão P do dev tira a MARCA e o CÓDIGO DE MODELO de 10
 * peças e mantém a INOVAÇÃO ("F-duct McLaren" → "F-duct"). **A pergunta que só
 * o olho responde é se o nome despido ainda diz o que a peça FAZ** — se
 * "Suspensão ativa" sozinha ainda carrega a graça que "Suspensão ativa Williams
 * FW15" carregava. Nenhuma asserção decide isso; por isso este arquivo existe.
 *
 * Também mostra o problema de LAYOUT que o rename cria e que nenhum teste vê:
 * os nomes ficaram mais curtos e desiguais (de "Carro-ventoinha Brabham BT46B"
 * para "Carro-ventoinha", e "DAS" tem três letras), então a grade de cards
 * muda de ritmo.
 *
 * ⚠️ NÃO É MAQUETE. Inlina `tokens.css` e `estilos.css` REAIS e renderiza o
 * COMPONENTE REAL (`CardPeca`) com `renderToStaticMarkup`, alimentado pelo
 * `dataset` de `src/ui/dataset-app.ts` — o mesmo singleton que o app usa. O que
 * se vê é o que o jogador vê; falta só o clique.
 *
 * Mostra os DOIS modos de partida (Craque e Cego), porque o card do Cego é
 * **só o nome** (`pecaVisivel` devolve `{ nome }`) — é exatamente o modo em que
 * o nome despido tem de se sustentar sozinho, sem raridade, bônus nem alvo.
 * E os DOIS temas, pela regra travada da paleta (7.8).
 *
 * 🔒 **Cada tema vai num IFRAME com documento próprio** — a cascata é
 * `:root[data-tema='light']`, então `data-tema` numa `<div>` aninhada NÃO
 * pinta nada. É a lição do 3.4.1 (o preview que renderizava escuro a seção
 * rotulada "tema claro"), e ela não se reaprende de graça.
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CardPeca } from '../src/ui/componentes';
import { dataset } from '../src/ui/dataset-app';
import { pecaVisivel } from '../src/ui/visibilidade';

const __dirname = dirname(fileURLToPath(import.meta.url));

function css(nome: string): string {
  return readFileSync(join(__dirname, '..', 'src', 'ui', nome), 'utf8');
}

/**
 * As 10 peças da decisão P, pelo id DESPIDO. Ficam destacadas na página para o
 * dev não ter de caçar quais mudaram entre as 24 do catálogo.
 *
 * 🔒 Literais de propósito, e a razão é a mesma de
 * `src/fixtures/referencias-dataset.ts`: derivar esta lista do dataset (por
 * "quem não tem marca no nome") a faria concordar consigo mesma sempre, e ela
 * existe justamente para discordar se alguém mexer numa peça sem querer.
 */
const IDS_DESPIDAS: readonly string[] = [
  'peca-efeito-solo',
  'peca-duplo-difusor',
  'peca-difusor-soprado',
  'peca-f-duct',
  'peca-amortecedor-massa',
  'peca-suspensao-ativa',
  'peca-seis-rodas',
  'peca-das',
  'peca-freio-direcao',
  'peca-carro-ventoinha',
];

/** O nome que cada uma tinha antes do PR, para o dev comparar lado a lado. */
const NOME_ANTES: Readonly<Record<string, string>> = {
  'peca-efeito-solo': 'Efeito solo Lotus 79',
  'peca-duplo-difusor': 'Duplo difusor Brawn',
  'peca-difusor-soprado': 'Difusor soprado Red Bull',
  'peca-f-duct': 'F-duct McLaren',
  'peca-amortecedor-massa': 'Amortecedor de massa Renault',
  'peca-suspensao-ativa': 'Suspensão ativa Williams FW15',
  'peca-seis-rodas': 'Seis rodas Tyrrell P34',
  'peca-das': 'DAS Mercedes',
  'peca-freio-direcao': 'Freio-direção McLaren',
  'peca-carro-ventoinha': 'Carro-ventoinha Brabham BT46B',
};

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** A grade das 24 peças no modo pedido, com as 10 despidas marcadas. */
function grade(visibilidade: 'craque' | 'cego'): string {
  return dataset.pecas
    .map((peca) => {
      const despida = IDS_DESPIDAS.includes(peca.id);
      const html = renderToStaticMarkup(
        createElement(CardPeca, { peca: pecaVisivel(peca, visibilidade) }),
      );
      const antes = despida
        ? `<div class="pv-antes">era: <s>${escapar(NOME_ANTES[peca.id])}</s></div>`
        : '';
      return `<div class="pv-item${despida ? ' pv-item--despida' : ''}">
  ${html}
  <div class="pv-id"><code>${escapar(peca.id)}</code></div>
  ${antes}
</div>`;
    })
    .join('\n');
}

describe('preview do catálogo de peças (PR 3 — peças despidas)', () => {
  it('escreve preview/pecas.html com as 24 peças nos 2 modos e nos 2 temas', () => {
    const folhas = `${css('tokens.css')}\n${css('estilos.css')}`;

    const molduraTema = (tema: 'dark' | 'light', conteudo: string): string => {
      const doc = `<!doctype html><html lang="pt-BR" data-tema="${tema}"><head><meta charset="utf-8">
<style>${folhas}
body { margin:0; padding:16px; background:var(--fundo); color:var(--texto);
       font-family: system-ui, -apple-system, sans-serif; }
.pv-grade { display:flex; flex-wrap:wrap; gap:14px; }
.pv-item { width:210px; }
.pv-item--despida { outline:2px solid #ffb800; outline-offset:6px; border-radius:12px; }
.pv-id { font-size:.72rem; opacity:.65; margin-top:6px; word-break:break-all; }
.pv-antes { font-size:.72rem; color:#ffb800; margin-top:2px; }
</style></head><body><div class="pv-grade">${conteudo}</div></body></html>`;
      return `<iframe class="pv-frame" srcdoc="${doc.replace(/"/g, '&quot;')}"></iframe>`;
    };

    const secoes = [
      {
        titulo: '1. Modo CRAQUE — o catálogo completo',
        nota:
          'Card cheio: raridade, categoria, alvo, bônus e risco. As 10 com contorno dourado são ' +
          'as da decisão P; abaixo de cada uma, o nome que ela tinha antes. A pergunta do dev: ' +
          'o nome despido ainda diz o que a peça FAZ?',
        visibilidade: 'craque' as const,
      },
      {
        titulo: '2. Modo CEGO — o teste duro do nome despido',
        nota:
          'No Cego o card é SÓ O NOME (pecaVisivel devolve { nome } e mais nada). É aqui que o ' +
          'rename dói se doer: sem raridade, sem bônus e sem alvo, o nome sozinho é tudo o que ' +
          'o jogador tem para escolher.',
        visibilidade: 'cego' as const,
      },
    ];

    const blocos = (tema: 'dark' | 'light') => `
<div class="pv-bloco">
  <h2 class="pv-tema-titulo">${tema === 'dark' ? '🌙 Tema escuro' : '☀️ Tema claro'}</h2>
  ${secoes
    .map(
      (s) => `<section class="pv-secao">
    <h3 class="pv-titulo">${s.titulo}</h3>
    <p class="pv-nota">${s.nota}</p>
    ${molduraTema(tema, grade(s.visibilidade))}
  </section>`,
    )
    .join('\n')}
</div>`;

    const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — catálogo de peças despidas (PR 3)</title>
<style>
/* CSS REAL de produção, inlinado: este preview NÃO é maquete. */
${folhas}
/* Só o andaime da página de preview vive aqui.
   A página de fora é neutra de propósito: quem manda na cor é cada iframe. */
body { margin: 0; padding: 0; background: #1a1a1a; color: #e8e8e8;
       font-family: system-ui, -apple-system, sans-serif; }
.pv-bloco { padding: 24px; }
.pv-tema-titulo { max-width: 1000px; margin: 0 auto 20px; font-size: 1.2rem; color: #ffb800; }
.pv-secao { max-width: 1000px; margin: 0 auto 36px; }
.pv-titulo { font-size: 1rem; margin: 0 0 4px; color: #ffb800; }
.pv-nota { font-size: .85rem; color: #a0a0a0; margin: 0 0 14px; line-height: 1.5; }
.pv-frame { width: 100%; height: 760px; border: 1px dashed #555; border-radius: 12px;
            background: #fff; display: block; }
.pv-cabecalho { max-width: 1000px; margin: 0 auto; padding: 24px 24px 0; }
</style>
</head>
<body>
<div class="pv-cabecalho">
  <h1>Catálogo de peças — PR 3 (peças despidas)</h1>
  <p class="pv-nota">
    Componente REAL (<code>CardPeca</code>) sobre o <code>dataset</code> de
    <code>src/ui/dataset-app.ts</code>, com <code>tokens.css</code> e
    <code>estilos.css</code> de produção — não é maquete. São as
    <strong>${dataset.pecas.length} peças</strong> do catálogo; as
    <strong>${IDS_DESPIDAS.length} com contorno dourado</strong> perderam marca e código de
    modelo pela decisão P. Os ids mudaram junto.
  </p>
  <p class="pv-nota">
    ⚠️ <strong>"Turbo modo-quali BMW anos 80" NÃO está entre as 10</strong> e mantém a marca —
    ficou fora da decisão P. Aparece sem contorno, de propósito.
  </p>
</div>
${blocos('dark')}
${blocos('light')}
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview', 'pecas.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, pagina, 'utf8');

    // Guardas: sem isto o arquivo existiria e o dev olharia uma página que não
    // mostra o que promete.
    expect(dataset.pecas).toHaveLength(24);
    for (const id of IDS_DESPIDAS) {
      expect(dataset.pecasById.get(id), `peça despida ausente do dataset: ${id}`).toBeDefined();
      expect(pagina).toContain(id);
    }
    /**
     * Anti-vacuidade do NOME, e a âncora tem de ser o `card__nome` — não o
     * texto solto. ⚠️ A primeira versão desta guarda usava `'>F-duct McLaren<'`
     * e ficou **vermelha por acidente**: a linha "era: <s>F-duct McLaren</s>"
     * do próprio preview casa com esse padrão. **Deixado escrito porque o erro
     * é instrutivo** — a guarda tem de mirar o SÍTIO (o nome dentro do card),
     * senão ela mede a prosa da página em vez do dado.
     *
     * Dentro do `srcdoc` a aspa vira `&quot;`, daí a forma escapada.
     */
    const nomeDoCard = (nome: string) => `card__nome&quot;>${nome}<`;
    expect(pagina).toContain(nomeDoCard('F-duct'));
    expect(pagina).toContain(nomeDoCard('Suspensão ativa'));
    expect(pagina).not.toContain(nomeDoCard('F-duct McLaren'));
    expect(pagina).not.toContain(nomeDoCard('Suspensão ativa Williams FW15'));
    // A peça que ficou de fora tem de aparecer, senão o aviso acima mente.
    expect(pagina).toContain('Turbo modo-quali BMW anos 80');
    // Dentro do `srcdoc` as aspas viram `&quot;` — checar a forma ESCAPADA é o
    // que prova que o tema passa pelo iframe (com `:root` próprio) em vez de um
    // `data-tema` numa div, que não pinta nada (lição do 3.4.1).
    expect(pagina).toContain('data-tema=&quot;light&quot;');
    expect(pagina).toContain('data-tema=&quot;dark&quot;');
    expect(pagina.length).toBeGreaterThan(5000);
    console.log(`\npreview escrito: ${destino}\n`);
  });
});
