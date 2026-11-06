/**
 * Variação escolhida de cada som, no ouvido, pelo Marcos (2026-11-06; marcha lenta: opção (b),
 * derivada do motor v3). Fonte ÚNICA para o preview (`montar-preview.ts`) e para o que vai ao
 * jogo (`integrar-sons.ts`): duas listas teriam de concordar e um dia não concordariam.
 */
export const ESCOLHIDOS = {
  motor: 'motor-v3',
  lenta: 'lenta-v3',
  pelotao: 'pelotao-v2',
  chuva: 'chuva-v3',
  passagem: 'passagem-v3',
  spray: 'spray-v2',
  largada: 'largada-v2',
  pistola: 'pistola-v3',
  derrapagem: 'derrapagem-v1',
  abandono: 'abandono-v3',
  torcida: 'torcida-v2',
} as const;

/** Ouvidos pelo Marcos sem voz percebida (2026-11-06); o ⚠ do detector continua registrado. */
export const OUVIDOS_SEM_VOZ = ['pelotao-v2', 'passagem-v3'];
