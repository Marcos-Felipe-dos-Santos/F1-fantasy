/**
 * Código de sala (PR 3.3.2) — geração e validação, puras.
 *
 * Substitui o `sala-1` que qualquer um adivinhava. O código é gerado pelo
 * SERVIDOR (a casca sorteia os bytes; aqui só se formata e valida), mostrado ao
 * criador, e exigido exato de quem entra.
 *
 * 🔢 **SEIS dígitos hexadecimais, não quatro.** O risco que dimensiona isso
 * **não é colisão, é ENUMERAÇÃO**: com 4 dígitos são 65.536 combinações, que um
 * script varre em minutos entrando em salas alheias. Com 6 são **16.777.216** —
 * impraticável para um jogo casual, e ainda fácil de ditar por voz
 * (`A3 F9 C2`). Colisão, nos dois casos, é irrelevante: nunca haverá salas
 * simultâneas suficientes para isso importar.
 *
 * Hex também evita o problema clássico de código digitado: **não existe `O`
 * nem `I` no alfabeto `0-9A-F`**, então não há o par ambíguo `0`/`O` nem
 * `1`/`I` que faz gente errar ao copiar da tela.
 */

/** Dígitos hexadecimais do código. Ver o cabeçalho para o porquê de 6. */
export const TAMANHO_CODIGO = 6;

/** Quantas combinações existem — usado no teste que documenta a escolha. */
export const COMBINACOES = 16 ** TAMANHO_CODIGO;

/**
 * Converte bytes sorteados em código. Puro: quem sorteia é a casca
 * (`crypto.getRandomValues`), porque `src/net/` não sorteia nada.
 *
 * Precisa de ao menos `TAMANHO_CODIGO / 2` bytes (cada byte vira 2 dígitos).
 */
export function codigoDeBytes(bytes: Uint8Array): string {
  let saida = '';
  for (const byte of bytes) {
    saida += byte.toString(16).toUpperCase().padStart(2, '0');
    if (saida.length >= TAMANHO_CODIGO) break;
  }
  if (saida.length < TAMANHO_CODIGO) {
    throw new Error(`codigoDeBytes: precisa de ${TAMANHO_CODIGO / 2} bytes, recebeu ${bytes.length}`);
  }
  return saida.slice(0, TAMANHO_CODIGO);
}

/**
 * Normaliza o que o jogador digitou (ou o que veio na URL) num código válido,
 * ou `null` se não for um.
 *
 * 🔒 **É o ÚNICO ponto de validação**, e as duas entradas passam por aqui: o
 * campo da tela e o `?sala=` do link. Sem isso, um código com erro de digitação
 * abriria um Durable Object para lixo — e o campo "existe" seria a única coisa
 * entre isso e uma sala de verdade.
 *
 * Aceita minúsculas porque gente redigita o que leu, e aceita espaços e hífens
 * porque o código é ditado em blocos (`A3-F9-C2`, `a3 f9 c2`).
 */
export function normalizarCodigo(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null;
  const limpo = bruto.replace(/[\s-]/g, '').toUpperCase();
  if (limpo.length !== TAMANHO_CODIGO) return null;
  return /^[0-9A-F]+$/.test(limpo) ? limpo : null;
}

/** `A3F9C2` → `A3 F9 C2`, para mostrar na tela e ditar por voz. */
export function codigoLegivel(codigo: string): string {
  return codigo.replace(/(.{2})(?=.)/g, '$1 ');
}
