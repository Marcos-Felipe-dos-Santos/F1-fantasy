/**
 * O JITTER da reconexão — a DECISÃO, pura e sem sorteio (PR H4, item S15).
 *
 * 🔒 **Por que a decisão mora aqui e não em `conexao.ts`.** Mesmo desenho do
 * `rate-limit.ts` (H1), do `teto-conexoes.ts` (H2) e do `teto-sincronizar.ts`
 * (H3): a função **recebe o sorteio por parâmetro**, e a casca (`conexao.ts`)
 * é quem o produz. É isso que torna o jitter testável em `npm test` — sem essa
 * fronteira, um teste de aleatoriedade ou aceita qualquer saída (vacuoso) ou é
 * instável.
 *
 * 🔴 **E aqui a fronteira é OBRIGATÓRIA, não estilo: `Math.random` é ERRO DE
 * LINT em `src/net/**`** (`eslint.config.js`, `no-restricted-properties`), e
 * `src/net/cerca-lint.test.ts` roda o ESLint de verdade para garantir isso.
 * **A especificação do PR pedia `Math.random()` e ela não compila limpo aqui.**
 * A saída não foi afrouxar a cerca — separar a regra num bloco novo apagaria em
 * silêncio as outras proibições do mesmo bloco, que é exatamente o defeito
 * catalogado no `CLAUDE.md` §"Cerca de lint: separar regra APAGA a regra".
 * **O sorteio entra por parâmetro; quem lê a entropia é a casca**, com
 * `crypto.getRandomValues`, que a cerca permite (medido: `npx eslint` exit 0).
 *
 * ---
 *
 * 📏 **O QUE O JITTER DEFENDE.** Sem ele, 22 clientes que caem juntos — queda do
 * worker, deploy, blip de rede — voltam a bater **no mesmo instante**, e depois
 * de novo em 500 ms, e de novo em 1 s: a escada de espera é a MESMA para todos,
 * então ela sincroniza a rajada em vez de espalhá-la. Cada reconexão custa um
 * `onConnect` e, logo em seguida, um `reentrar` que devolve o snapshot inteiro
 * (277,2 KiB no pior caso medido no H3). O jitter transforma um pico de 22 em
 * uma faixa.
 *
 * 🔒 **O JITTER SÓ ADIA, NUNCA ANTECIPA — e isso é decisão, não arredondamento.**
 * A forma simétrica (`base × (0,85 + sorteio × 0,3)`) espalha igual e é pior:
 * metade das tentativas volta ANTES da espera base, ou seja, empurra a rajada
 * para o instante em que o servidor está mais fraco. O teste
 * `O JITTER NUNCA ANTECIPA` é a cerca disso.
 */

/**
 * Espera antes de tentar de novo, em ms: 0,5s → 1s → 2s → 4s → 8s (teto).
 *
 * ⚠️ **Os valores são os que já estavam em `conexao.ts` — o H4 não os moveu.**
 * O jitter é acréscimo sobre esta escada, não substituição dela, e há teste
 * fixando os cinco números justamente para que a distinção não se perca.
 */
export const ESPERAS_MS = [500, 1000, 2000, 4000, 8000] as const;

/**
 * Quanto o jitter pode ADIAR, como fração da espera base. 30% sobre 8 s dá até
 * 2,4 s de dispersão no degrau que importa — o teto, que é onde todo mundo que
 * caiu junto termina.
 */
export const FATOR_JITTER = 0.3;

/**
 * A espera base, adiada por até `FATOR_JITTER`.
 *
 * `sorteio` ∈ [0, 1). Com 0 devolve a base **exata** — o piso é a espera de
 * antes deste PR, e é por isso que o jitter não pode piorar nenhum caso que já
 * funcionava.
 */
export function comJitter(espera: number, sorteio: number): number {
  return Math.round(espera * (1 + sorteio * FATOR_JITTER));
}

/**
 * A escada COM o jitter — o que a casca chama.
 *
 * 🔒 **O jitter é aplicado DEPOIS do clamp da escada, e a ordem é o ponto.**
 * Aplicá-lo antes faria o degrau saturado (8 s) voltar a ser idêntico para
 * todos, e é justamente no teto que a rajada se acumula: quem caiu junto chega
 * junto ao último degrau. Tem teste dedicado
 * (`SATURAR NÃO É PARAR DE ESPALHAR`).
 */
export function esperaDaTentativa(tentativa: number, sorteio: number): number {
  const indice = Math.min(Math.max(tentativa, 0), ESPERAS_MS.length - 1);
  return comJitter(ESPERAS_MS[indice], sorteio);
}
