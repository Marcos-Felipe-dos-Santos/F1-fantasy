/**
 * Tema claro/escuro (PR 7.8) — lógica pura, sem React.
 *
 * O CSS já resolve os dois modos sozinho (`tokens.css`: `:root` escuro por
 * padrão + `@media (prefers-color-scheme: light)`). Este módulo cobre só o que
 * o CSS não alcança: a ESCOLHA MANUAL, que é um `data-tema` no `<html>` e uma
 * entrada no `localStorage`.
 *
 * Três estados, não dois. `'sistema'` não é "claro por padrão" — é a AUSÊNCIA
 * do atributo, que reativa o `@media`. Colapsar isso em dois estados
 * ('dark'|'light') obrigaria a escolher um valor inicial e faria todo mundo
 * que nunca tocou no toggle ficar preso ao tema que o app chutou, ignorando o
 * sistema operacional.
 */

import type { ModoTema } from './tokens';

/** Preferência do usuário: um modo fixo ou "o que o sistema disser". */
export type PreferenciaTema = ModoTema | 'sistema';

export const CHAVE_TEMA = 'f1-fantasy:tema';

/** Ordem do ciclo do botão. Começa em 'sistema' e volta pra ele. */
export const CICLO_TEMA: readonly PreferenciaTema[] = ['sistema', 'dark', 'light'];

export function ehPreferenciaValida(valor: unknown): valor is PreferenciaTema {
  return valor === 'dark' || valor === 'light' || valor === 'sistema';
}

/** Próxima preferência do ciclo (sistema -> escuro -> claro -> sistema). */
export function proximaPreferencia(atual: PreferenciaTema): PreferenciaTema {
  const i = CICLO_TEMA.indexOf(atual);
  return CICLO_TEMA[(i + 1) % CICLO_TEMA.length];
}

/** Rótulo do botão (o que o usuário lê AGORA, não o que vem depois). */
export function rotuloTema(pref: PreferenciaTema): string {
  if (pref === 'dark') return 'Tema: escuro';
  if (pref === 'light') return 'Tema: claro';
  return 'Tema: sistema';
}

/**
 * Aplica a preferência ao documento. `'sistema'` REMOVE o atributo — é isso
 * que devolve o controle ao `@media`, que está escopado com
 * `:root:not([data-tema])`.
 */
export function aplicarTema(pref: PreferenciaTema, raiz: HTMLElement): void {
  if (pref === 'sistema') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', pref);
}

/** Lê a preferência salva. Valor corrompido/ausente cai em 'sistema'. */
export function lerPreferencia(armazenamento: Pick<Storage, 'getItem'>): PreferenciaTema {
  try {
    const bruto = armazenamento.getItem(CHAVE_TEMA);
    return ehPreferenciaValida(bruto) ? bruto : 'sistema';
  } catch {
    // localStorage pode lançar (modo privado, cookies bloqueados). Tema é
    // preferência cosmética: falhar aqui não pode derrubar o app.
    return 'sistema';
  }
}

/** Salva a preferência. Falha de armazenamento é silenciosa, pelo mesmo motivo. */
export function salvarPreferencia(pref: PreferenciaTema, armazenamento: Pick<Storage, 'setItem'>): void {
  try {
    armazenamento.setItem(CHAVE_TEMA, pref);
  } catch {
    /* ver `lerPreferencia` */
  }
}
