/**
 * O TETO de `sincronizar` por CONEXÃO — a DECISÃO, pura e sem relógio
 * (PR H3, item S7).
 *
 * 🔒 **Por que a decisão mora aqui e não em `party/`.** Mesmo argumento do
 * `rate-limit.ts` do H1: `Date.now` é PROIBIDO em `src/net/**` e permitido só
 * na casca (`eslint.config.js`). Esta função **recebe `agora` por parâmetro**,
 * e é isso que torna a JANELA testável em `npm test`, sem relógio falso e sem
 * `workerd` — o único jeito de provar que isto é um LIMITE e não um BANIMENTO.
 *
 * ---
 *
 * 📏 **O QUE ESTE TETO DEFENDE, MEDIDO.** `sincronizar` responde
 * `soPara(estado, conexaoId, estadoPara(estado))`: ~25 bytes de comando devolvem
 * o SNAPSHOT INTEIRO. Sonda de 2026-09-01, sala de 22 humanos com o log do draft
 * no pior caso que as guardas de hoje permitem: **283.810 bytes (277,2 KiB) por
 * resposta**. Sem teto, uma conexão autenticada arranca isso quantas vezes
 * quiser, e o custo dela é uma linha de JSON.
 *
 * ✅ **O CUSTO LEGÍTIMO É ZERO, e é MEDIDO — não é folga estimada.**
 * `src/ui/useSalaOnline.ts` **nunca** manda `sincronizar`; os envios do cliente
 * real são `entrar`, `reentrar`, `pronto`, `iniciar`, `hash`(×2), `escolher`,
 * `corrida-concluida` e `sair`. O único remetente do repositório é
 * `src/net/harness.ts:403`, que **não passa por esta casca** e cujo relógio é
 * contado em PASSOS, não em ms.
 * 🔑 **Foi essa medição que fixou os 2 s**, e não o contrário: o pedido do dev
 * mandava medir o intervalo legítimo antes de fixar a janela. O intervalo
 * legítimo medido é **infinito** (o comando não é usado), então 2 s não atrasa
 * ninguém. ⚠️ **Se algum dia a UI passar a re-pedir snapshot, esta constante
 * volta à mesa** — e o sítio a conferir é o `PASSOS_ATE_RESSINCRONIZAR` do
 * harness, que descreve a cadência pretendida.
 *
 * ⚠️ **O que este módulo NÃO decide:** de quem é o balde. A chave (a conexão) e
 * o relógio são da casca; aqui só entra "dado este balde e este instante, passa?".
 */

import type { BaldeDeTeto } from './rate-limit';

/**
 * Quantos `sincronizar` passam por janela. **1 = rajada 1: o primeiro sempre
 * passa**, e é o que mantém legítimo o caso de uso real do comando (um cliente
 * que perdeu um snapshot re-pede UMA vez).
 */
export const TETO_SINCRONIZAR = 1;

/**
 * A janela, em milissegundos. 2 s é decisão do dev (2026-09-01), tomada DEPOIS
 * da medição de que o cliente real não manda este comando.
 *
 * 🔒 **O balde vive SÓ EM MEMÓRIA na casca, e o número está ACOPLADO a isso** —
 * mesma disciplina do `JANELA_TETO_MS` do H1. 2 s é muito abaixo do horizonte
 * de despejo do Durable Object, então um despejo descarta balde que já teria
 * expirado sozinho: zero escrita em storage por comando. **Alongar a janela sem
 * passar a persistir reabre a rajada pós-despejo.**
 */
export const JANELA_SINCRONIZAR_MS = 2_000;

export interface VeredictoSincronizar {
  /** `false` ⇒ a casca não responde o snapshot. */
  readonly permitido: boolean;
  /** O balde a guardar. Sempre devolvido, inclusive quando recusa. */
  readonly balde: BaldeDeTeto;
}

/**
 * Passa? E qual o balde depois desta tentativa?
 *
 * **Janela FIXA, não deslizante**, pelo mesmo motivo do H1: a deslizante
 * guardaria um carimbo por requisição — memória proporcional ao abuso, que é o
 * avesso do que um limitador deve fazer sob ataque. A fixa guarda dois números.
 *
 * 🔒 **A recusa NÃO estende a janela.** `contagem` cresce, mas `inicio` fica
 * onde está: quem bate no teto espera o resto da janela e volta, nunca mais que
 * isso. Se a recusa reiniciasse o relógio, um script batendo sem parar manteria
 * o balde eternamente cheio — e o LIMITE viraria BANIMENTO, que é a decisão que
 * este projeto já tomou uma vez, no H1, e não reabre aqui.
 */
export function avaliarTetoSincronizar(
  balde: BaldeDeTeto | null,
  agora: number,
): VeredictoSincronizar {
  const expirou = balde === null || agora - balde.inicio >= JANELA_SINCRONIZAR_MS;
  if (expirou) {
    return { permitido: true, balde: { inicio: agora, contagem: 1 } };
  }
  const contagem = balde.contagem + 1;
  return {
    permitido: contagem <= TETO_SINCRONIZAR,
    balde: { inicio: balde.inicio, contagem },
  };
}
