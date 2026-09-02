import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POLITICA_CSP, injetarCsp, pluginCsp } from './csp';

const INDEX = readFileSync('index.html', 'utf8');

/** As diretivas de `POLITICA_CSP`, como mapa `nome -> valor`. */
function diretivas(politica: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const parte of politica.split(';')) {
    const limpa = parte.trim();
    if (limpa.length === 0) continue;
    const espaco = limpa.indexOf(' ');
    if (espaco === -1) {
      mapa.set(limpa, '');
      continue;
    }
    mapa.set(limpa.slice(0, espaco), limpa.slice(espaco + 1).trim());
  }
  return mapa;
}

/**
 * S5 — a CSP do app (PR H4).
 *
 * 🔴 **POR QUE A META NÃO MORA NO `index.html` FONTE, e isto é MEDIDO** (par com
 * controle, 2026-09-02): com a meta no fonte, o `npm run dev` renderiza **HTML
 * cru, sem estilo nenhum** — o Vite serve o CSS em dev criando `<style>` por
 * JS, e `style-src 'self'` mata isso. O `dist/` servido, com a MESMA política,
 * fica **idêntico ao controle**, porque lá o CSS vem por `<link rel=stylesheet>`
 * da mesma origem.
 * 🔑 **O console ficou LIMPO nas duas medições** — zero violação registrada. Só
 * pegou quem abriu e OLHOU a tela. É a lição do 3.4.1 aplicada à CSP.
 */
describe('CSP (S5)', () => {
  it('🔴 O PLUGIN SÓ AGE NO BUILD — é a propriedade medida que ele existe para ter', () => {
    // Anti-regressão do achado acima: quem trocar isto por `undefined` (roda
    // sempre) ou por `'serve'` quebra o `npm run dev` inteiro, e o console NÃO
    // vai acusar. `apply` é a única guarda mecânica que existe contra isso.
    expect(pluginCsp().apply).toBe('build');
  });

  it('o `index.html` FONTE não tem CSP — o plugin é a fonte única', () => {
    // Duas fontes que precisam concordar é a classe de defeito que este projeto
    // já pagou (a lista do proxy no 3.3.3). Se alguém colar a meta no fonte, o
    // dev quebra E passam a existir duas políticas.
    expect(INDEX).not.toContain('Content-Security-Policy');
  });

  it('injeta a meta no `<head>`', () => {
    const saida = injetarCsp(INDEX);
    expect(saida).toContain('http-equiv="Content-Security-Policy"');
    const posMeta = saida.indexOf('Content-Security-Policy');
    expect(posMeta).toBeGreaterThan(-1);
    expect(posMeta, 'a meta caiu fora do <head>').toBeLessThan(saida.indexOf('</head>'));
  });

  it('🔴 A META VEM ANTES DOS `<script>` DO BUILD — medido na forma do `dist/`', () => {
    // 🔑 **A propriedade: CSP por `<meta>` só governa o que é parseado DEPOIS
    // dela.** Meta atrás do `<script>` não protege o `<script>` — a política
    // existiria no arquivo e não valeria para nada. O `index.html` FONTE não
    // serve para medir isso: nele o único `<script>` mora no `<body>`, então a
    // ordem passa por acidente de layout. **No `dist/` o Vite injeta `<script>`
    // e `<link>` DENTRO do `<head>`**, e é essa forma que este caso reproduz.
    //
    // 🔴 **PROVENIÊNCIA HONESTA — este caso nasceu de uma mutação (M14,
    // âncora `<head>` → `</title>`) que ele NÃO pega, e ela NÃO é lacuna: é
    // EQUIVALENTE, medido.** Construí o `dist/` com a mutação aplicada e olhei:
    // a meta sai depois do `</title>` e **ainda antes** do `<script>` e do
    // `<link>`, porque o Vite os acrescenta no fim do `<head>`. A propriedade
    // de segurança está preservada nas duas âncoras.
    // 🔑 **O caso fica assim mesmo**, porque a versão anterior media a forma
    // ERRADA (a do fonte) — trocá-la pela forma do `dist/` é ganho real, ainda
    // que nenhuma mutação atual o exija. Registrado em vez de apresentado como
    // "mutação pega", que é a inexatidão que o H2 já pagou uma vez ao alegar
    // que M2 cobria a anti-vacuidade do S2.
    const comoNoDist = [
      '<!doctype html>',
      '<html lang="pt-BR">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <title>F1 Fantasy</title>',
      '    <script type="module" crossorigin src="/assets/index-abc.js"></script>',
      '    <link rel="stylesheet" crossorigin href="/assets/index-def.css">',
      '  </head>',
      '  <body><div id="root"></div></body>',
      '</html>',
    ].join('\n');

    const saida = injetarCsp(comoNoDist);
    const posMeta = saida.indexOf('Content-Security-Policy');
    const posScript = saida.indexOf('<script');
    const posLink = saida.indexOf('<link');
    expect(posMeta).toBeGreaterThan(-1);
    // Pré-condição asserida: a fixture REALMENTE tem script e link no <head>.
    // Sem isto, uma fixture sem eles passaria por vacuidade.
    expect(posScript, 'a fixture não tem <script> — o caso seria vácuo').toBeGreaterThan(-1);
    expect(posScript, 'a fixture não põe o <script> no <head>').toBeLessThan(
      saida.indexOf('</head>'),
    );
    expect(posMeta, 'a meta ficou DEPOIS do <script> do build').toBeLessThan(posScript);
    expect(posMeta, 'a meta ficou DEPOIS do <link> do build').toBeLessThan(posLink);
  });

  it('injetar é IDEMPOTENTE — build repetido não empilha meta', () => {
    const uma = injetarCsp(INDEX);
    const duas = injetarCsp(uma);
    expect(duas).toBe(uma);
  });

  it('🔴 FALHA ALTO quando não há `<head>` — nunca degrada em silêncio', () => {
    // A família da 0(z): `?? generico` devolve algo plausível e ninguém nota.
    // Aqui, HTML sem `<head>` significa build sem CSP — tem que quebrar o build,
    // não sair um `dist/` desprotegido com exit 0.
    expect(() => injetarCsp('<!doctype html><html><body>oi</body></html>')).toThrow(/head/i);
  });

  it('cobre as diretivas que este app precisa, medidas contra o que ele carrega', () => {
    const d = diretivas(POLITICA_CSP);
    // `default-src` fecha o que as demais não nomeiam.
    expect(d.get('default-src')).toBe("'self'");
    // 1 módulo, mesma origem (`dist/assets/index-*.js`).
    expect(d.get('script-src')).toBe("'self'");
    // 1 `<link rel=stylesheet>`, mesma origem.
    expect(d.get('style-src')).toBe("'self'");
    // `/fonts/bungee-latin.woff2`, mesma origem.
    expect(d.get('font-src')).toBe("'self'");
    // 🔑 O WebSocket da sala deriva de `location.host` (`baseParaEstaPagina`),
    // então é SEMPRE mesma origem — `'self'` cobre `ws:`/`wss:` do mesmo host.
    // Medido em 2026-09-02: sob esta política o WebSocket do HMR conectou.
    expect(d.get('connect-src')).toBe("'self'");
    expect(d.get('object-src')).toBe("'none'");
    expect(d.get('base-uri')).toBe("'self'");
    expect(d.get('form-action')).toBe("'none'");
  });

  it('🔴 NENHUM `unsafe-*` — é o que a política inteira existe para não ter', () => {
    // Sem esta cerca, a saída fácil para qualquer quebra futura é colar
    // `'unsafe-inline'` e seguir a vida, e a CSP vira decoração.
    expect(POLITICA_CSP).not.toContain('unsafe-inline');
    expect(POLITICA_CSP).not.toContain('unsafe-eval');
    expect(POLITICA_CSP).not.toContain('*');
  });

  it('⚠️ `frame-ancestors` NÃO entra — é IGNORADO em meta, por especificação', () => {
    // Registrado como asserção e não como comentário: quem acrescentar vai
    // achar que fechou clickjacking, e não fechou. Por meta, só header serve.
    expect(POLITICA_CSP).not.toContain('frame-ancestors');
  });
});
