/**
 * Impressão digital do draft (PR 3.4) — o que os 22 comparam entre si.
 *
 * 🔴 **O risco que isto existe pra pegar.** `escolhaDoAusente` é, literalmente,
 * a única decisão que cada cliente toma SOZINHO (o resto vem do log, que é
 * verdade compartilhada). Se dois clientes escolherem peças diferentes pelo
 * mesmo ausente, cada um debita uma cópia diferente do pool compartilhado: os
 * `copiasRestantes` divergem, os `loadouts` divergem, e cada máquina passa a
 * jogar outro jogo. **Nada acusa hoje** — é o RISCO ATIVO do `ESTADO.md`.
 *
 * 🔒 **O servidor NÃO computa este hash e não pode.** Ele não tem o dataset
 * (fronteira travada no 3.2) — só compara strings opacas. Todo o significado
 * mora aqui, no cliente.
 *
 * ## Por que não `JSON.stringify(draft)`
 *
 * Duas armadilhas, e as duas dariam alarme falso:
 * 1. **Ordem de chave.** `sorteios`, `progresso`, `copiasRestantes` e
 *    `loadouts` são `Record<string, …>`, e `JSON.stringify` emite na ordem de
 *    INSERÇÃO. Clientes constroem esses mapas em ordens diferentes (o log
 *    chega em ordens diferentes), então estados IDÊNTICOS gerariam hashes
 *    diferentes.
 * 2. **Campos que divergem de propósito.** `pecasReveladas` é `null` fora do
 *    seu turno — por projeto. Hashear isso acusaria divergência em 21 dos 22
 *    clientes, sempre.
 *
 * Por isso os campos são ENUMERADOS e as chaves ORDENADAS. Campo novo no
 * `DraftState` não entra sozinho: entra por decisão, com justificativa.
 */

import { deriveSeed } from '../engine/rng';
import type { DraftState } from '../engine/types';

/**
 * O que ENTRA no hash, e por quê:
 *
 * - `fase` — dois clientes em fases diferentes não estão no mesmo jogo.
 * - `ordemPeca` + `indicePeca` — de quem é a vez. Divergência aqui é
 *   divergência de turno, que o `turnoEsperado` do 3.1b já protege no fio, mas
 *   que uma substituição de ausente errada pode mover mesmo assim.
 * - `copiasRestantes` — **o pool compartilhado. É o alvo principal.**
 * - `loadouts` — o resultado final; é o que a corrida vai consumir.
 * - `progresso` — as escolhas das rodadas 1-5, jogador a jogador.
 * - `sorteios` — **entrou na revisão do 3.4**, e o motivo é o primeiro
 *   atestado: o cliente só atesta quando `eventosAplicados` avança, então uma
 *   divergência já presente NA CRIAÇÃO do draft (dataset diferente, seed
 *   aplicada diferente) não apareceria até o primeiro evento. `sorteios` é
 *   atribuído só em `criarDraft` e nunca mutado depois, então hasheá-lo é
 *   estável — e pega divergência de dataset no atestado mais cedo possível.
 *
 * O que FICA DE FORA, e por quê:
 *
 * - `pecasReveladas` — `null` fora do turno do jogador, POR PROJETO. Entraria
 *   como divergência permanente e falsa.
 * - `seed` e `jogadores` — constantes triviais da partida; divergirem sem que
 *   `sorteios` ou `progresso` também divirjam é impossível por construção.
 */
function cargaCanonica(draft: DraftState): string {
  const partes: string[] = [
    `fase=${draft.fase}`,
    `ordemPeca=${draft.ordemPeca.join(',')}`,
    `indicePeca=${draft.indicePeca}`,
    `copias=${mapaOrdenado(draft.copiasRestantes, (n) => String(n))}`,
    `loadouts=${mapaOrdenado(draft.loadouts, (l) =>
      [l.pilotoId, l.chassiId, l.motorId, l.estrategistaId, l.pitId, l.pecaId].join('|'),
    )}`,
    `sorteios=${mapaOrdenado(draft.sorteios, (refs) =>
      refs.map((r) => `${r.equipe}@${r.ano}`).join('+'),
    )}`,
    `progresso=${mapaOrdenado(draft.progresso, (p) =>
      [
        p.rodada,
        p.slots.pilotoId ?? '',
        p.slots.chassiId ?? '',
        p.slots.motorId ?? '',
        p.slots.estrategistaId ?? '',
        p.slots.pitId ?? '',
      ].join('|'),
    )}`,
  ];
  return partes.join(';');
}

/**
 * Um `Record` como string estável. `sort()` cru e não `localeCompare` — a
 * ordenação sensível a locale está proibida em `src/net/**` pelo ESLint
 * justamente porque muda de máquina pra máquina, que aqui viraria alarme falso
 * entre jogadores de locales diferentes.
 */
function mapaOrdenado<T>(mapa: Record<string, T>, valor: (v: T) => string): string {
  return Object.keys(mapa)
    .sort()
    .map((chave) => `${chave}:${valor(mapa[chave])}`)
    .join(',');
}

/**
 * A impressão digital. **`deriveSeed` usado como HASH, nunca como stream** — o
 * mesmo uso que o PR de narração registrou: nenhum RNG é consumido, nenhum
 * tempo de corrida muda, e chamar isto não move nada da simulação.
 *
 * Duas derivações com sais diferentes, concatenadas: `deriveSeed` devolve 32
 * bits, e 64 tiram a colisão acidental do campo das coisas que valha discutir
 * (uma divergência real que colidisse no hash passaria despercebida — barato
 * demais pra não comprar).
 */
export function hashDoDraft(draft: DraftState): string {
  const carga = cargaCanonica(draft);
  const a = deriveSeed(0, `online:hash-draft:a:${carga}`);
  const b = deriveSeed(1, `online:hash-draft:b:${carga}`);
  return `${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}
