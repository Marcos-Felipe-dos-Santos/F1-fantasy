/**
 * PREVIEW DO ALARME DE DIVERGÊNCIA (PR 3.4.1) — escreve `preview/divergencia.html`.
 *
 * PARA QUE SERVE. O banner só aparece quando os 22 clientes divergem de
 * verdade, e provocar isso no navegador exige sabotar a escolha do ausente —
 * não dá pra reproduzir num teste manual. Sem este arquivo o dev não teria
 * como VER o que aprovou.
 *
 * ⚠️ NÃO É MAQUETE. Inlina o `tokens.css` e o `estilos.css` REAIS de produção e
 * renderiza o COMPONENTE REAL (`FluxoOnline`) com `renderToStaticMarkup` — o
 * mesmo recurso do `preview-campeonato`. O que se vê é o que o app desenha.
 * Falta só interação.
 *
 * Mostra os DOIS temas, porque a regra travada da paleta (7.8) exige que o
 * acento como TINTA tenha token irmão mode-scoped: um alarme legível no escuro
 * e ilegível no claro seria meio alarme.
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { criarCliente } from '../src/net/cliente';
import { FluxoOnline } from '../src/ui/FluxoOnline';
import * as useSalaOnlineModule from '../src/ui/useSalaOnline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// `FluxoOnline` monta a URL do socket a partir de `window.location`.
(globalThis as unknown as { window: unknown }).window = {
  location: { protocol: 'http:', host: 'localhost:5173' },
};

function css(nome: string): string {
  return readFileSync(join(__dirname, '..', 'src', 'ui', nome), 'utf8');
}

type Retorno = ReturnType<typeof useSalaOnlineModule.useSalaOnline>;

/**
 * Renderiza o `FluxoOnline` real com o cliente na situação pedida.
 *
 * O `useSalaOnline` é substituído porque ele abre WebSocket — e o preview roda
 * em Node, sem servidor. Tudo ABAIXO dele (o banner, o CSS, as telas) é
 * produção de verdade.
 */
function tela(divergiu: boolean, extras: Partial<Retorno> = {}): string {
  const cliente = {
    ...criarCliente(),
    divergencia: divergiu ? { escopo: 'draft', ancora: 12, jogadores: ['humano-07'] } : null,
  };
  const espiao = vi.spyOn(useSalaOnlineModule, 'useSalaOnline').mockReturnValue({
    estadoConexao: 'aberta',
    cliente,
    euSou: null,
    minhaVez: false,
    souAusente: false,
    encerrada: false,
    inexistente: false,
    ultimoErro: null,
    entrar: () => {},
    definirPronto: () => {},
    iniciar: () => {},
    sair: () => {},
    escolher: () => {},
    ...extras,
  } as Retorno);
  try {
    return renderToStaticMarkup(
      createElement(FluxoOnline, { sala: 'A3F9C2', onVoltar: () => {} }),
    );
  } finally {
    espiao.mockRestore();
  }
}

describe('preview do alarme de divergência', () => {
  it('escreve preview/divergencia.html com o banner nos dois temas', () => {
    const secoes = [
      {
        titulo: '1. COM divergência — o alarme',
        nota:
          'É isto que o jogador vê quando o servidor detecta que as máquinas deixaram de jogar ' +
          'o mesmo jogo. Não fecha sozinho: o estado já divergiu e nada no jogo o reconcilia. ' +
          'Repare que NÃO acusa jogador nominalmente — o servidor não tem dataset e não sabe ' +
          'quem está certo.',
        html: tela(true),
      },
      {
        titulo: '2. SEM divergência — o normal, para comparar',
        nota: 'A mesma tela sem o alarme. É o estado de 100% das partidas saudáveis.',
        html: tela(false),
      },
      {
        titulo: '3. O alarme sobre a tela de "sala encerrada"',
        nota:
          'O banner vale em TODAS as telas do online, não só no lobby — a divergência pode ' +
          'acontecer em qualquer ponto e o jogador precisa vê-la em qualquer lugar.',
        html: tela(true, { encerrada: true }),
      },
    ];

    const folhas = `${css('tokens.css')}\n${css('estilos.css')}`;

    /**
     * ⚠️ Cada tema vai num IFRAME com documento PRÓPRIO, e isso é necessidade,
     * não capricho: a cascata da paleta é `:root[data-tema='light']` (bloco 3
     * do `tokens.css`), então `data-tema` num `<div>` aninhado **não faz nada**.
     * A primeira versão deste preview punha o atributo numa `div` e a seção
     * "tema claro" renderizava escura — um preview que mentia sobre o que
     * estava mostrando. `srcdoc` dá a cada tema o seu `:root`.
     */
    const molduraTema = (tema: 'dark' | 'light', conteudo: string): string => {
      const doc = `<!doctype html><html lang="pt-BR" data-tema="${tema}"><head><meta charset="utf-8">
<style>${folhas}
body { margin:0; padding:16px; background:var(--fundo); color:var(--texto);
       font-family: system-ui, -apple-system, sans-serif; }
</style></head><body>${conteudo}</body></html>`;
      return `<iframe class="pv-frame" srcdoc="${doc.replace(/"/g, '&quot;')}"></iframe>`;
    };

    const blocos = (tema: 'dark' | 'light') => `
<div class="pv-bloco">
  <h2 class="pv-tema-titulo">${tema === 'dark' ? '🌙 Tema escuro' : '☀️ Tema claro'}</h2>
  ${secoes
    .map(
      (s) => `<section class="pv-secao">
    <h3 class="pv-titulo">${s.titulo}</h3>
    <p class="pv-nota">${s.nota}</p>
    ${molduraTema(tema, s.html)}
  </section>`,
    )
    .join('\n')}
</div>`;

    const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — alarme de divergência (PR 3.4.1)</title>
<style>
/* CSS REAL de produção, inlinado: este preview NÃO é maquete. */
${css('tokens.css')}
${css('estilos.css')}
/* Só o andaime da página de preview vive aqui. */
/* A página de fora é neutra de propósito: quem manda na cor é cada iframe. */
body { margin: 0; padding: 0; background: #1a1a1a; color: #e8e8e8;
       font-family: system-ui, -apple-system, sans-serif; }
.pv-bloco { padding: 24px; }
.pv-tema-titulo { max-width: 900px; margin: 0 auto 20px; font-size: 1.2rem; color: #ffb800; }
.pv-secao { max-width: 900px; margin: 0 auto 36px; }
.pv-titulo { font-size: 1rem; margin: 0 0 4px; color: #ffb800; }
.pv-nota { font-size: .85rem; color: #a0a0a0; margin: 0 0 14px; line-height: 1.5; }
.pv-frame { width: 100%; height: 380px; border: 1px dashed #555; border-radius: 12px;
            background: #fff; display: block; }
.pv-cabecalho { max-width: 900px; margin: 0 auto; padding: 24px 24px 0; }
</style>
</head>
<body>
<div>
  <div class="pv-cabecalho">
    <h1>Alarme de divergência — PR 3.4.1</h1>
    <p class="pv-nota">
      Componente REAL (<code>FluxoOnline</code>) com o <code>estilos.css</code> e o
      <code>tokens.css</code> de produção — não é maquete. O 3.4 construiu o detector inteiro e
      o jogador não via nada; este PR é o último metro. Só o <code>useSalaOnline</code> foi
      substituído, porque ele abre WebSocket e o preview roda sem servidor.
    </p>
  </div>
</div>
${blocos('dark')}
${blocos('light')}
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview', 'divergencia.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, pagina, 'utf8');

    // Guardas: sem isto o arquivo existiria e o dev olharia uma página que não
    // mostra o que promete.
    expect(pagina).toContain('fluxo-online__divergencia');
    expect(pagina).toContain('As máquinas divergiram');
    // Dentro do `srcdoc` as aspas viram `&quot;` — checar a forma ESCAPADA é o
    // que prova que o tema claro passa pelo iframe (com `:root` próprio) em vez
    // de um `data-tema` numa div, que não pinta nada.
    expect(pagina).toContain('data-tema=&quot;light&quot;');
    expect(pagina).toContain('data-tema=&quot;dark&quot;');
    expect(pagina.length).toBeGreaterThan(5000);
    console.log(`\npreview escrito: ${destino}\n`);
  });
});
