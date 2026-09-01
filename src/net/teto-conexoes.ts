/**
 * O TETO de CONEXÕES por sala — a DECISÃO, pura (PR H2, item S2).
 *
 * 🔒 **Fecha a metade mensurável da pendência 0(y)**, que registra: *"a guarda
 * de 22 protege o ROSTER, não as CONEXÕES. Socket aberto que nunca manda
 * `entrar` não é limitado por nada."* `QTD_JOGADORES` governa
 * `estado.jogadores`, um array que só cresce pelo comando `entrar`; um cliente
 * que abre o WebSocket e fica calado nunca toca esse array, logo nunca encontra
 * aquela guarda. **Este teto conta o TRANSPORTE, não o roster** — é a única
 * contagem que o socket quieto alcança.
 *
 * ⚠️ **O que este módulo NÃO faz, e a leitura oposta é a natural.** Ele LIMITA
 * o socket quieto; não o **expira**. Nada em `party/sala.ts` fecha uma conexão
 * que conecta e nunca fala: a carência de vazio só corre com
 * `getConnections()` em zero, e um socket quieto a mantém não-vazia para
 * sempre. **Depois deste teto bastam `TETO_CONEXOES` sockets quietos para
 * trancar os 22 jogadores reais fora da sala e ainda mantê-la imortal.**
 * 🔑 **Portanto o teto BALIZA a 0(y), não a fecha.** O conserto de fundo é um
 * timeout de socket ocioso, e ele **não entrou neste PR** — ver a pendência
 * registrada no `ESTADO.md`. Escrever "0(y) fechada" aqui seria a afirmação em
 * presente do indicativo que as revisões dos PRs 6 e 7 pegaram duas vezes cada.
 */

/**
 * Quantos WebSockets uma sala aceita ao mesmo tempo.
 *
 * 🔒 **O PISO É MEDIDO; o número é POLÍTICA.** Durante um F5 o mesmo jogador
 * ocupa DOIS sockets transitoriamente — o velho, que só sai quando o `close`
 * chega, e o novo. Com `QTD_JOGADORES = 22`, um teto abaixo de `2 × 22 = 44`
 * faz uma sala cheia se trancar sozinha numa onda de recarga: o limitador
 * virando o problema que ele deveria conter. **64 é folga sobre esse piso.**
 *
 * ⚠️ **NENHUMA justificativa de plataforma está atrelada a este número, e é de
 * propósito.** A 0(y) registra textualmente *"Não medido: qual o teto real do
 * Durable Object nem qual o custo de um socket ocioso"* — e isso **continua
 * verdadeiro depois deste PR**. Quem for ajustar 64 ajusta uma política, não um
 * limite derivado de medida da Cloudflare.
 *
 * 🔑 **Não importa `QTD_JOGADORES` de propósito** — mesmo motivo do
 * `N_ETAPAS_CURTA` duplicado em `src/net/tipos.ts`: são grandezas de camadas
 * diferentes (transporte × roster), e amarrá-las faria um teto de transporte se
 * mover quando alguém mexesse no tamanho da sala. A relação `> 2 ×` é o que
 * está documentado; a igualdade não.
 */
export const TETO_CONEXOES = 64;

/**
 * Esta conexão excede o teto?
 *
 * 🔒 **`>` e não `>=`, e a diferença foi MEDIDA, não deduzida.** No
 * `partyserver@0.5.10` o `accept` acontece ANTES do `await this.onConnect(...)`
 * (`node_modules/partyserver/dist/index.js`), então **a conexão corrente já
 * está contada em `getConnections()` quando a guarda roda**. Sonda de
 * 2026-09-01: o 1º, o 2º e o 3º socket leem `1`, `2` e `3`. Com `>=`, o teto
 * efetivo seria `TETO_CONEXOES - 1` e a sala recusaria uma conexão legítima.
 *
 * @param conexoesAbertas  `getConnections()` **incluindo** a que chegou agora.
 */
export function excedeuTetoDeConexoes(conexoesAbertas: number): boolean {
  return conexoesAbertas > TETO_CONEXOES;
}
