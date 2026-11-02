/**
 * `prefers-reduced-motion` do sistema, ao vivo (PR 2c). No render de servidor
 * dos testes não há `window`: vale o movimento normal.
 */

import { useSyncExternalStore } from 'react';

const CONSULTA = '(prefers-reduced-motion: reduce)';

let consulta: MediaQueryList | null = null;

/** Uma só: `getSnapshot` roda a cada render, e o replay renderiza a cada frame. */
function media(): MediaQueryList {
  consulta ??= window.matchMedia(CONSULTA);
  return consulta;
}

function assinar(avisar: () => void): () => void {
  const lista = media();
  lista.addEventListener('change', avisar);
  return () => lista.removeEventListener('change', avisar);
}

export function useMovimentoReduzido(): boolean {
  return useSyncExternalStore(
    assinar,
    () => media().matches,
    () => false,
  );
}
