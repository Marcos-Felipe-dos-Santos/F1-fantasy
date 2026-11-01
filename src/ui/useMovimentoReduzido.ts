/**
 * `prefers-reduced-motion` do sistema, ao vivo (PR 2c). No render de servidor
 * dos testes não há `window`: vale o movimento normal.
 */

import { useSyncExternalStore } from 'react';

const CONSULTA = '(prefers-reduced-motion: reduce)';

function assinar(avisar: () => void): () => void {
  const media = window.matchMedia(CONSULTA);
  media.addEventListener('change', avisar);
  return () => media.removeEventListener('change', avisar);
}

export function useMovimentoReduzido(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
