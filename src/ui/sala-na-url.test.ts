/**
 * PR 3.3.4 — a sala em que estou tem que estar NA URL.
 *
 * 🔴 **O bug que este arquivo tranca.** O `App` descobre em que sala está de
 * uma fonte só — a query string, lida UMA vez no boot
 * (`useState(() => salaDaUrl(window.location))`). Mas entrar numa sala só
 * mexia em estado React e nunca tocava a barra de endereço. Consequência
 * medida no navegador: depois de criar a sala e clicar em "Ir para a sala", a
 * URL do anfitrião continuava `http://localhost:5173/`, sem `?sala=`. No F5 o
 * app não tinha como saber de qual sala voltar, caía na `TelaInicio`, e o
 * token de reentrada do 3.2.1 ficava no `localStorage` **intacto e inútil —
 * ninguém sabia de que sala ele era**.
 *
 * Quem entra pelo LINK nunca viu o defeito (o link já traz `?sala=`). Quem
 * **cria** a sala via, sempre — e criar é o que o anfitrião faz.
 *
 * Duas travas, porque o contrato tem duas metades:
 * 1. **Round-trip puro** — o que o escritor grava, o leitor do boot recupera.
 *    Se essas duas funções divergirem, o F5 volta a quebrar em silêncio.
 * 2. **Varredura do `App.tsx`** — que ele de fato CHAMA o escritor ao entrar.
 *    Sem jsdom no projeto (`environment: 'node'`), esta é a única forma de
 *    trancar a fiação; é o mesmo recurso que `contrato-ausente.test.ts` usa.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { montarLink, PARAM_SALA, salaDaUrl } from './sala-online';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FONTE_APP = readFileSync(join(AQUI, 'App.tsx'), 'utf8');

const LOCAL = { origin: 'http://localhost:5173', pathname: '/' };

describe('round-trip: o que a entrada escreve, o boot lê', () => {
  it('recupera o código exato, para qualquer código válido', () => {
    for (const codigo of ['A3F9C2', 'CB28D9', '000000', 'FFFFFF', '1960EE']) {
      const url = new URL(montarLink(LOCAL, codigo));
      expect(salaDaUrl({ search: url.search }), codigo).toBe(codigo);
    }
  });

  it('o link montado usa o parâmetro que o leitor procura', () => {
    const url = new URL(montarLink(LOCAL, 'CB28D9'));
    expect(url.searchParams.get(PARAM_SALA)).toBe('CB28D9');
  });

  it('preserva o pathname — a sala não pode mudar a rota da página', () => {
    const url = new URL(montarLink({ origin: 'http://192.168.0.13:5173', pathname: '/' }, 'CB28D9'));
    expect(url.pathname).toBe('/');
    expect(url.host).toBe('192.168.0.13:5173');
  });
});

describe('o `App.tsx` grava a sala na barra de endereço ao entrar', () => {
  it('a fonte foi mesmo lida (anti-vacuidade dos cheques abaixo)', () => {
    expect(FONTE_APP).toContain('salaOnline');
    expect(FONTE_APP).toContain('salaDaUrl');
  });

  /**
   * 🔒 A trava que importa. `setSalaOnline` com um código (≠ `null`) significa
   * "entrei numa sala"; se isso acontecer sem fixar a URL, o F5 volta a perder
   * a sala. Exigir o funil `entrarNaSala` mantém UM caminho de entrada, em vez
   * de N chamadas que cada uma pode esquecer de gravar a URL.
   */
  it('só existe UM caminho de entrada, e ele fixa a URL', () => {
    expect(FONTE_APP).toContain('fixarSalaNaBarra');

    // `setSalaOnline` só pode aparecer com `null` (sair) ou dentro do funil.
    const chamadas = [...FONTE_APP.matchAll(/setSalaOnline\(([^)]*)\)/g)].map((m) => m[1].trim());
    const comCodigo = chamadas.filter((arg) => arg !== 'null');
    expect(
      comCodigo.length,
      `setSalaOnline com código fora do funil: ${JSON.stringify(comCodigo)}`,
    ).toBe(1);

    // …e essa única chamada mora no `entrarNaSala`, junto do `fixarSalaNaBarra`.
    const funil = FONTE_APP.slice(FONTE_APP.indexOf('const entrarNaSala'));
    expect(funil).not.toBe('');
    const corpo = funil.slice(0, funil.indexOf('}, ['));
    expect(corpo).toContain('setSalaOnline(');
    expect(corpo).toContain('fixarSalaNaBarra(');
  });

  it('sair da sala continua LIMPANDO a URL (o inverso do mesmo contrato)', () => {
    // Sem isso, um F5 depois de sair voltaria pra sala que se acabou de deixar.
    expect(FONTE_APP).toContain('replaceState');
  });
});
