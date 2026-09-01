/**
 * O TETO de criação de sala — a DECISÃO, pura e sem relógio (PR H1, item S1).
 *
 * 🔒 **Por que a decisão mora aqui e não em `party/`.** `Date.now` é PROIBIDO em
 * `src/net/**` e permitido só na casca (`eslint.config.js`, o bloco de
 * `no-restricted-properties`). Não é estilo: um relógio no núcleo replicado
 * divergiria entre os 22. Então esta função **recebe `agora` por parâmetro**,
 * exatamente como `reduzirSala(estado, comando, remetenteId, agora, …)`.
 *
 * 🔑 **E é isso que torna a JANELA testável.** Com o tempo como argumento, o
 * teste da expiração roda em `npm test`, sem relógio falso e sem `workerd` —
 * que é o único jeito de provar que isto é um LIMITE e não um BANIMENTO.
 *
 * ⚠️ **O que este módulo NÃO decide:** de quem é o balde. A chave (o IP) e o
 * relógio são da casca; aqui só entra "dado este balde e este instante, passa?".
 */

/** Quantas salas um mesmo balde pode criar dentro de uma janela. */
export const TETO_CRIAR_SALA = 5;

/**
 * A janela do teto, em milissegundos.
 *
 * 🔒 **10 s é decisão do dev (2026-09-01), e o número está ACOPLADO à escolha de
 * não persistir o balde.** O Durable Object que hospeda o balde é despejado
 * depois de dezenas de segundos de ociosidade; com a janela ABAIXO desse
 * horizonte, o despejo zera um balde que já teria expirado sozinho — o
 * comportamento observável é o mesmo, e por isso `ctx.storage` não é preciso.
 * ⚠️ **Alongar esta janela sem passar a persistir reabre a rajada pós-despejo.**
 * As duas coisas se movem juntas.
 */
export const JANELA_TETO_MS = 10_000;

/** O balde de um chaveador (hoje, um IP). `null` é "nunca pediu nada". */
export interface BaldeDeTeto {
  /** Instante em que a janela corrente começou. */
  readonly inicio: number;
  /** Quantas passaram DENTRO da janela corrente. */
  readonly contagem: number;
}

export interface VeredictoDeTeto {
  /** `false` ⇒ a casca responde 429. */
  readonly permitido: boolean;
  /** O balde a guardar. Sempre devolvido, inclusive quando recusa. */
  readonly balde: BaldeDeTeto;
}

/**
 * Passa? E qual o balde depois desta tentativa?
 *
 * **Janela FIXA, não deslizante** — e é escolha, não simplificação. A deslizante
 * exigiria guardar um carimbo por requisição (memória proporcional ao abuso,
 * que é o avesso do que um limitador deve fazer sob ataque). A fixa guarda dois
 * números. O preço conhecido da fixa é a rajada na virada — até `2 × teto` em
 * torno da fronteira —, e ele é aceitável aqui: o alvo é flood scriptado, não
 * precisão de cobrança.
 *
 * 🔒 **A recusa NÃO estende a janela.** `contagem` cresce, mas `inicio` fica
 * onde está: quem bate no teto espera o resto da janela e volta, nunca mais que
 * isso. Se a recusa reiniciasse o relógio, um script batendo sem parar manteria
 * o balde eternamente cheio — e o LIMITE viraria o BANIMENTO que este projeto
 * decidiu não ter.
 */
export function avaliarTeto(balde: BaldeDeTeto | null, agora: number): VeredictoDeTeto {
  const expirou = balde === null || agora - balde.inicio >= JANELA_TETO_MS;
  if (expirou) {
    return { permitido: true, balde: { inicio: agora, contagem: 1 } };
  }
  const contagem = balde.contagem + 1;
  return {
    permitido: contagem <= TETO_CRIAR_SALA,
    balde: { inicio: balde.inicio, contagem },
  };
}
