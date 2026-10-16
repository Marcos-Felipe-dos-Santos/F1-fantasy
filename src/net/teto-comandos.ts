/**
 * O TETO DE COMANDOS por CONEXÃO — a DECISÃO, pura e sem relógio
 * (PR H4, item S3).
 *
 * 🔒 **Por que a decisão mora aqui e não em `party/`.** Quarto PR seguido com o
 * mesmo desenho (`avaliarTeto` no H1, `excedeuTetoDeConexoes` no H2,
 * `avaliarTetoSincronizar` no H3): `Date.now` é PROIBIDO em `src/net/**` e
 * permitido só na casca (`eslint.config.js`). Esta função **recebe `agora` por
 * parâmetro**, e é isso que torna a JANELA testável em `npm test`, sem relógio
 * falso e sem `workerd` — o único jeito de provar que isto é um LIMITE e não um
 * BANIMENTO.
 *
 * ---
 *
 * 📏 **O QUE ESTE TETO DEFENDE, e ele NÃO é o mesmo alvo do H3.** O teto do H3
 * cobre `sincronizar`, o caminho **sob demanda**, e pôde recusar em silêncio
 * porque o cliente real **nunca** manda aquele comando. Este cobre os comandos
 * que o jogador manda de verdade, e o sítio sem teto nenhum é o `pronto`:
 * `src/ui/TelaLobby.tsx:127` é `onClick={() => onPronto(!eu.pronto)}`, **sem
 * debounce e sem `disabled`**. A sonda registrada no `ESTADO.md` mediu que
 * `pronto` repetido é **aceito nas duas vezes** e **difunde um snapshot inteiro
 * na segunda**, sem nada ter mudado no jogo. ~25 bytes de comando viram
 * broadcast para até 22 sockets.
 *
 * ⚠️ **ISTO NÃO FECHA A AMPLIFICAÇÃO DO BROADCAST — ela é a pendência 0(ai)**
 * (log inteiro em todo snapshot, 19,5 MiB por draft, quadrática). Este teto
 * limita **quantas vezes uma conexão consegue puxar o gatilho**; o conserto da
 * amplificação é delta no protocolo, e é PR próprio, como o dev ditou.
 *
 * ---
 *
 * 📏 **DE ONDE VEM O NÚMERO — medido em 2026-09-02, e a medição veio ANTES.**
 * O cliente real **não tem polling**: zero `setInterval`/`setTimeout` em
 * `src/ui/useSalaOnline.ts` (medido). Ele é inteiramente dirigido a evento, e
 * são 9 sítios de envio (`entrar`, `reentrar`, `pronto`, `iniciar`, `hash`×2,
 * `escolher`, `corrida-concluida`, `sair`). **A rajada de (re)conexão** —
 * `reentrar` no `aoAbrir`, a drenagem da fila `pendentes` e os dois efeitos de
 * `hash` — é da ordem de **3 a 6 comandos em milissegundos**, e 20 a cobre com
 * folga.
 *
 * 🔴 **MAS ELA NÃO É A MAIOR RAJADA LEGÍTIMA, e a redação anterior desta linha
 * dizia que era. CORRIGIDA NO LUGAR — achado da revisão do H4.** Existe um
 * termo que a derivação original OMITIU, e ele não é disparado pelo jogador: é
 * disparado pelos outros 21.
 * **A cadeia, verificada elo a elo:** `servidor-sala.ts` termina todo comando
 * de draft aceito em `difundir(...)` (broadcast a todos) → `src/net/cliente.ts`
 * incrementa `eventosAplicados` por evento novo do log → o efeito de
 * `useSalaOnline.ts` tem `eventosAplicados` nas dependências e manda **um
 * `hash` por avanço**. **Logo a taxa de `hash` que SAI de cada cliente
 * acompanha a taxa AGREGADA de comandos aceitos da sala inteira.**
 * ⚠️ E o pior instante é o mais sincronizado do jogo: `draft-rede.ts` marca a
 * fase de sorteios como **CONCORRENTE** — os 22 jogam ao mesmo tempo —, e é
 * quando as 22 telas abrem juntas. Com 22 humanos escolhendo a cada T
 * segundos, cada cliente emite ≈ 22/T `hash` por segundo **além** dos próprios
 * comandos: a 3 s por escolha são 7,3/s (37% do orçamento); a 1 s por escolha,
 * estoura.
 * 🔑 **E o dano provável não é o `escolher` perdido — é a ATESTAÇÃO perdida.**
 * Estourado o teto, a mensagem mais provável de cair é um `hash`, e o detector
 * de divergência perde a atestação daquela âncora **em silêncio**. É a família
 * "detector morre em silêncio" que `protocolo.ts` e `versao.ts` já catalogaram.
 * 📌 **NÃO foi consertado neste PR e o número NÃO foi mexido — é a pendência
 * 0(al), registrada com a conta.** Subir o teto, isentar `hash` ou coalescer a
 * atestação no cliente são as três saídas, e a terceira é vizinha da 0(ai).
 * **Escolher é decisão do dev.**
 *
 * 🔴 **HONESTIDADE SOBRE O MÉTODO, porque ele NÃO é o do H3.** Lá o intervalo
 * legítimo pôde ser dito **infinito**, medido, porque o comando não é usado.
 * Aqui os comandos SÃO usados, e medir a cadência real exigiria renderizar
 * `useSalaOnline` — que este projeto não tem como fazer (**sem jsdom nem
 * `@testing-library`**, medido, e é o que sustenta as pendências 0(j) e 0(m)).
 * **O que está medido é o LIMITE ESTRUTURAL** (a enumeração dos 9 sítios e o
 * que dispara cada um), **não uma amostra de tráfego.** A distinção fica escrita
 * porque "medido" e "derivado da leitura do código" não são a mesma coisa neste
 * projeto.
 *
 * ⚠️ **O que este módulo NÃO decide:** de quem é o balde. A chave (a conexão), o
 * relógio e a resposta são da casca; aqui só entra "dado este balde e este
 * instante, passa?".
 */

import type { BaldeDeTeto } from './rate-limit';

/**
 * Quantos COMANDOS DE JOGO passam por janela, por conexão.
 *
 * 🔒 **Uniforme entre os comandos que ele cobre** — não há teto por tipo
 * (`pronto` mais apertado que `escolher`, etc.). Cada isenção por tipo seria um
 * caminho a mais que o atacante escolhe.
 *
 * 🔴 **MAS "vale para TODO comando" era FALSO e foi corrigido no lugar
 * (revisão do H4). Três coisas NÃO entram nesta contagem, por decisão do dev
 * (2026-09-02), porque cada uma já tem guarda própria:** frame binário
 * (rejeitado antes de tudo), string acima de `MAX_BYTES_MENSAGEM` (teto de
 * bytes) e `sincronizar` (teto do H3, janela própria). Somá-las aqui puniria o
 * jogador legítimo cujo cliente mandou um `sincronizar` seguido de uma jogada.
 * **O escopo real está no docblock de `recusarPorTetoDeComandos`
 * (`party/sala.ts`), que é onde a ordem das guardas o implementa**, e há caso
 * dedicado em `party/comandos.test.ts`.
 * ⚠️ **Consequência aceita:** este teto não é a defesa contra flood de lixo
 * binário nem de mensagem gigante. Quem medir superfície de flood olha as
 * quatro guardas, não só esta.
 */
export const TETO_COMANDOS = 20;

// Até 132 escolhas no draft de 22 jogadores, mais transições e reentrada.
// Orçamento independente: atestados não podem consumir a cota das jogadas.
export const TETO_HASHES = 256;

/**
 * A janela, em milissegundos.
 *
 * 🔒 **O balde vive SÓ EM MEMÓRIA na casca, e o número está ACOPLADO a isso** —
 * mesma disciplina do `JANELA_TETO_MS` (H1) e do `JANELA_SINCRONIZAR_MS` (H3).
 * 1 s fica muito abaixo do horizonte de despejo do Durable Object, então um
 * despejo descarta balde que já teria expirado sozinho: **zero escrita em
 * storage por comando**, que é o ponto — gravar um balde por comando trocaria
 * amplificação de leitura por amplificação de ESCRITA.
 * ⚠️ **Alongar a janela sem passar a persistir reabre a rajada pós-despejo — as
 * duas coisas se movem juntas.**
 */
export const JANELA_COMANDOS_MS = 1_000;

export interface VeredictoComandos {
  /** `false` ⇒ a casca responde `comandos-demais` e não processa o comando. */
  readonly permitido: boolean;
  /** O balde a guardar. Sempre devolvido, inclusive quando recusa. */
  readonly balde: BaldeDeTeto;
}

/**
 * Passa? E qual o balde depois desta tentativa?
 *
 * **Janela FIXA, não deslizante**, pelo mesmo motivo do H1 e do H3: a
 * deslizante guardaria um carimbo por requisição — memória proporcional ao
 * abuso, que é o avesso do que um limitador deve fazer sob ataque. A fixa
 * guarda dois números.
 *
 * 🔒 **A recusa NÃO estende a janela.** `contagem` cresce, mas `inicio` fica
 * onde está: quem bate no teto espera o resto da janela e volta, nunca mais que
 * isso. Se a recusa reiniciasse o relógio, um script batendo sem parar manteria
 * o balde eternamente cheio — e o LIMITE viraria BANIMENTO, que é a decisão que
 * este projeto já tomou uma vez, no H1, e não reabre aqui.
 */
export function avaliarTetoComandos(
  balde: BaldeDeTeto | null,
  agora: number,
  teto = TETO_COMANDOS,
): VeredictoComandos {
  const expirou = balde === null || agora - balde.inicio >= JANELA_COMANDOS_MS;
  if (expirou) {
    return { permitido: true, balde: { inicio: agora, contagem: 1 } };
  }
  const contagem = balde.contagem + 1;
  return {
    permitido: contagem <= teto,
    balde: { inicio: balde.inicio, contagem },
  };
}
