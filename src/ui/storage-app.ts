/**
 * Acesso ao `localStorage` do navegador para o modo Campeonato (PR 8.4-mínimo).
 *
 * Existe pelo mesmo motivo de `dataset-app.ts`: isolar num ponto só o
 * "singleton do ambiente" que os componentes consomem, pra que o resto do
 * código (e todos os testes) continue falando com o `StorageLike` puro de
 * `persistencia.ts`, que é fake-ável sem DOM.
 *
 * NUNCA lança. `window.localStorage` pode simplesmente não existir (SSR, um
 * teste de node sem jsdom — que é o caso deste projeto) e pode LANÇAR só de
 * ser acessado (Safari com cookies bloqueados devolve `SecurityError` no
 * getter, não `null`). Quem chama quer decidir se mostra o botão "Continuar",
 * não lidar com `try/catch`.
 */

import type { StorageLike } from './persistencia';

/**
 * O `localStorage` do navegador, ou `null` quando não há um utilizável.
 *
 * `null` é um estado NORMAL, não um erro: o jogo inteiro funciona sem
 * persistência — só não oferece "Continuar campeonato" e não salva o
 * progresso. As funções de `persistencia.ts` já toleram falha de escrita
 * (`salvarCampeonato` devolve `false` em vez de lançar); esta camada cobre o
 * caso anterior, o de nem existir storage pra tentar.
 */
export function storageDoNavegador(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}
