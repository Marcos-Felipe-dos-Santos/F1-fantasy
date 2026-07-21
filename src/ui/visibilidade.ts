/**
 * Visibilidade da partida (PR 2.3, GDD §5): opção escolhida na `TelaInicio`,
 * válida pra Single e Local (é da partida, não por jogador). Módulo puro,
 * sem DOM — decide O QUE cada tela pode exibir; o JSX só lê o resultado.
 *
 * - `'craque'` (default, comportamento anterior a este PR): notas visíveis,
 *   raridade visível.
 * - `'cego'`: some toda dica — notas dos componentes, notas base→efetivas, e
 *   toda dica de raridade/força da peça (emoji, cor/classe CSS, rótulo,
 *   bônus, atributos-alvo, risco, categoria — a categoria também é dica,
 *   ex.: "Roubos & Polêmicas" tende a "proibido"). Só sobra nome da equipe,
 *   ano, nomes dos pilotos/componentes e nome da peça — informação que já
 *   vem de fora deste módulo (equipe/ano/nomes nunca passam por aqui).
 */

import type { Peca } from '../engine/types';

export type Visibilidade = 'craque' | 'cego';

/**
 * Campos exibíveis de uma peça icônica, filtrados pela visibilidade. No
 * `'cego'` só existe a chave `nome` (as demais nem estão presentes no
 * objeto — não é `undefined`, é ausência de chave, pra não vazar nada nem
 * por engano num `Object.keys`/spread futuro).
 */
export type PecaVisivel = Pick<Peca, 'nome'> & Partial<Omit<Peca, 'nome'>>;

/**
 * Filtra os campos de uma peça pela visibilidade da partida. No `'craque'`
 * devolve a peça inteira; no `'cego'` devolve só `nome`.
 */
export function pecaVisivel(peca: Peca, visibilidade: Visibilidade): PecaVisivel {
  if (visibilidade === 'cego') {
    return { nome: peca.nome };
  }
  return { ...peca };
}

/** `true` se as notas (dos componentes, e base→efetiva) podem ser exibidas nesta partida. */
export function mostrarNotas(visibilidade: Visibilidade): boolean {
  return visibilidade === 'craque';
}
