/**
 * Tela do celular, ao vivo (PR 2a): o viewBox da pista é um só, e é isto que troca
 * o tamanho e o desenho do carro. No render de servidor dos testes não há `window`:
 * vale a tela larga.
 */

import { useSyncExternalStore } from 'react';
import { LARGURA_TELA_ESTREITA } from './carro-replay';

const CONSULTA = `(max-width: ${LARGURA_TELA_ESTREITA}px)`;

function assinar(avisar: () => void): () => void {
  const media = window.matchMedia(CONSULTA);
  media.addEventListener('change', avisar);
  return () => media.removeEventListener('change', avisar);
}

export function useTelaEstreita(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
