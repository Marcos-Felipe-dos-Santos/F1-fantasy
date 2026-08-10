/**
 * Ponte entre a UI e a criação/entrada de sala online (PR 3.3.2).
 *
 * Separado dos componentes porque tem I/O (um `fetch` e a barra de endereço) e
 * porque é testável sem DOM — as funções puras daqui têm teste, o `fetch` não.
 */

import { baseParaEstaPagina } from '../net/conexao';
import { normalizarCodigo } from '../net/codigo-sala';

/** Nome do parâmetro do link. `?sala=A3F9C2`. */
export const PARAM_SALA = 'sala';

/**
 * O código que veio no link, ou `null`.
 *
 * 🔒 Passa pelo MESMO `normalizarCodigo` do campo digitado. Sem isso, um
 * `?sala=<lixo>` abriria um Durable Object para entrada arbitrária — e o campo
 * "a sala existe" seria a única coisa entre isso e uma sala de verdade.
 */
export function salaDaUrl(local: { search: string }): string | null {
  return normalizarCodigo(new URLSearchParams(local.search).get(PARAM_SALA));
}

/** O link que o criador manda pros amigos. */
export function montarLink(
  local: { origin: string; pathname: string },
  codigo: string,
): string {
  return `${local.origin}${local.pathname}?${PARAM_SALA}=${codigo}`;
}

/** O link desta página, para a sala informada. */
export function linkDaSala(codigo: string): string {
  return montarLink(window.location, codigo);
}

/**
 * Pede um código novo ao servidor. `null` se não deu (servidor fora do ar, ou
 * as três tentativas de sortear código livre falharam).
 *
 * 🔑 **Quem sorteia é o SERVIDOR.** Se o cliente escolhesse, escolheria
 * `000000` — e a privacidade do código, que é o ponto todo, acabaria no
 * primeiro jogador esperto.
 *
 * O endereço sai de `baseParaEstaPagina`, o mesmo do WebSocket, trocando o
 * esquema: assim a criação usa a mesma porta e o mesmo host da página, e
 * continua funcionando na LAN, no celular e atrás do proxy do Vite.
 */
export async function criarSalaNoServidor(): Promise<string | null> {
  const base = baseParaEstaPagina(window.location, import.meta.env?.VITE_WS_BASE);
  const http = base.replace(/^ws/, 'http');
  try {
    const resposta = await fetch(`${http}/criar-sala`, { method: 'POST' });
    if (!resposta.ok) return null;
    const corpo = (await resposta.json()) as { codigo?: unknown };
    return normalizarCodigo(corpo.codigo);
  } catch {
    return null;
  }
}
