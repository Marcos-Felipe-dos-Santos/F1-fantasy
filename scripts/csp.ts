import type { Plugin } from 'vite';

/**
 * A CSP do app — item S5 do PR H4.
 *
 * 🔴 **POR QUE ISTO É UM PLUGIN DE BUILD E NÃO UMA META NO `index.html`.**
 * A especificação do PR pedia "meta tag no `index.html`". **Medido em
 * 2026-09-02, em par com controle, e a meta no fonte QUEBRA O `npm run dev`
 * por inteiro:**
 *
 *     com a meta no `index.html` fonte   →  dev: HTML CRU, sem estilo nenhum
 *                                        →  dist servido: tela normal
 *     sem a meta (controle)              →  dev: tela normal
 *                                        →  dist servido: tela normal
 *
 * A causa está medida: em desenvolvimento o Vite **serve o CSS criando
 * `<style>` por JavaScript**, e `style-src 'self'` mata isso. Em produção o CSS
 * vem por `<link rel=stylesheet>` da mesma origem, que a mesma política
 * permite — por isso o `dist/` fica idêntico ao controle.
 *
 * 🔑 **E o console ficou LIMPO nas DUAS medições** — três mensagens, nenhuma
 * violação de CSP registrada. **Só pegou quem abriu e OLHOU a tela.** É a lição
 * do 3.4.1 ("o preview mentia sobre o que estava mostrando") aplicada à CSP, e
 * é a razão de a §"Definição de pronto" item 5 existir.
 *
 * 🔒 **A alternativa recusada foi `style-src 'self' 'unsafe-inline'`** no fonte:
 * funcionaria nos dois modos e afrouxaria exatamente a diretiva que o modo dev
 * quebra — a que protege contra injeção de CSS. **Decisão do dev (2026-09-02):
 * a política fica estrita e o dev-mode fica intocado.**
 *
 * ⚠️ **O CUSTO ACEITO, e ele tem cerca:** a política não aparece no arquivo
 * fonte, então nada num `git diff` do `index.html` a mostra. `scripts/csp.test.ts`
 * é o que a segura — inclusive o `apply: 'build'`, que é a única guarda mecânica
 * contra alguém "consertar" o plugin para rodar sempre e derrubar o dev.
 */

/**
 * A política, diretiva a diretiva, cada uma medida contra o que o `dist/`
 * realmente carrega (medido em 2026-09-02, no `dist/index.html`):
 *
 * - **`default-src 'self'`** — fecha o que as demais não nomeiam.
 * - **`script-src 'self'`** — **1** script no `dist/index.html`,
 *   `type="module"` com `src` de `/assets/`. **ZERO inline**, medido; é isso que
 *   torna a política estrita viável sem nonce nem hash.
 * - **`style-src 'self'`** — **1** `<link rel=stylesheet>` de `/assets/`.
 *   ⚠️ É a diretiva que quebra o modo dev; ver o bloco acima.
 * - **`font-src 'self'`** — `/fonts/bungee-latin.woff2`, mesma origem.
 * - **`img-src 'self' data:`** — nenhum `data:` medido hoje; entra porque SVG
 *   inline e ícone embutido são a mudança mais provável de não passar por aqui.
 * - **`connect-src 'self'`** — 🔑 o WebSocket da sala deriva de `location.host`
 *   (`baseParaEstaPagina`, `src/net/conexao.ts`), então é **sempre a mesma
 *   origem**, e `'self'` cobre `ws:`/`wss:` do mesmo host. **Medido: sob esta
 *   política o WebSocket do HMR do Vite conectou.**
 *   ⚠️ **Quem usar `VITE_WS_BASE` para pôr o worker noutra origem precisa
 *   acrescentar aquele host aqui** — o escape existe (`conexao.ts:100`, em `baseParaEstaPagina`) e esta
 *   política o barra. Está dito para não virar "servidor fora do ar".
 * - **`object-src 'none'`** · **`base-uri 'self'`** · **`form-action 'none'`** —
 *   o app não tem `<object>`, não reescreve `<base>` e não tem `<form>` que
 *   submeta.
 *
 * 🔴 **`frame-ancestors` NÃO ENTRA, e a ausência é deliberada: por
 * especificação ele é IGNORADO quando entregue por `<meta>`.** Só header serve.
 * Pô-lo aqui daria a impressão de clickjacking fechado sem fechar nada — há
 * teste asserindo a ausência justamente para que ninguém o acrescente achando
 * que ganhou algo.
 */
export const POLITICA_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const MARCA = 'http-equiv="Content-Security-Policy"';

/** A tag, numa linha só — o `dist/index.html` não é lido por humano com frequência. */
function metaCsp(): string {
  return `<meta ${MARCA} content="${POLITICA_CSP}" />`;
}

/**
 * Injeta a meta logo depois de `<head>`.
 *
 * 🔒 **Logo DEPOIS de `<head>`, e a posição é a propriedade de segurança:** uma
 * CSP entregue por `<meta>` só governa o que é parseado **depois dela**. Meta
 * atrás do `<script>` não protege o `<script>`. Como o Vite acrescenta os
 * `<script>`/`<link>` do build perto do fim do `<head>`, entrar no começo
 * garante a ordem sem depender de onde ele os pôs. Tem teste de posição.
 *
 * ⚠️ **Consequência aceita: a meta fica ANTES de `<meta charset>`.** O charset
 * precisa estar nos primeiros 1024 bytes do documento e continua estando — esta
 * tag tem ~250 bytes.
 *
 * 🔴 **FALHA ALTO se não houver `<head>`.** É a lição da 0(z) (rename de pista
 * degrada em silêncio): devolver o HTML intacto produziria um `dist/`
 * **sem CSP com exit 0**, e ninguém olha o `dist/index.html` depois de um build
 * verde. Build sem CSP tem que ser build quebrado.
 */
export function injetarCsp(html: string): string {
  if (html.includes(MARCA)) return html;
  const cabeca = '<head>';
  const i = html.indexOf(cabeca);
  if (i === -1) {
    throw new Error(
      'CSP (S5): não encontrei `<head>` no index.html. Abortando o build de propósito — ' +
        'devolver o HTML intacto geraria um dist/ SEM CSP e com exit 0, que é a falha ' +
        'silenciosa que esta guarda existe para impedir.',
    );
  }
  const corte = i + cabeca.length;
  return `${html.slice(0, corte)}\n    ${metaCsp()}${html.slice(corte)}`;
}

/**
 * O plugin. **`apply: 'build'` é a linha que faz o `npm run dev` sobreviver** —
 * ver o bloco no topo deste arquivo, e a asserção em `scripts/csp.test.ts`.
 */
export function pluginCsp(): Plugin {
  return {
    name: 'f1f-csp',
    apply: 'build',
    transformIndexHtml: {
      // `post`: roda depois de o Vite ter injetado `<script>`/`<link>`, então o
      // HTML que chega aqui é o final. A meta entra na frente deles mesmo assim,
      // porque `injetarCsp` ancora no começo do `<head>`.
      order: 'post',
      handler: (html: string) => injetarCsp(html),
    },
  };
}
