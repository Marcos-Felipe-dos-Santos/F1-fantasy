/**
 * Miniatura do traçado de uma pista (PR 8.3), pro calendário do campeonato.
 *
 * Reusa `pathDaVolta` — a MESMA geometria que a tela de corrida desenha, não
 * um desenho paralelo. Isso importa: as silhuetas passaram no teste cego do
 * dev **10/10** (contra linha de base 0/10) justamente porque vêm da
 * geometria real dos circuitos; uma miniatura redesenhada à mão jogaria fora
 * exatamente o que foi conquistado no PR 7.7.
 *
 * Aqui é UMA linha só, sem a pilha de camadas de `CAMADAS_PISTA`: no tamanho
 * de miniatura as camadas (asfalto + limite + zebra) viram borrão. A regra dos
 * 360px vale — o que não é legível não entra —, e o que se quer legível nesta
 * escala é a FORMA, que é o que o teste cego mediu.
 */

import { VIEWBOX_PISTA, pathDaVolta } from './pista-camadas';

interface SilhuetaPistaProps {
  pistaId: string;
  /** Nome da pista, pro rótulo acessível (a miniatura é decorativa sem ele). */
  nome: string;
  /** Estado no calendário — governa a cor, via CSS. */
  variante: 'disputada' | 'proxima' | 'futura';
}

export function SilhuetaPista({ pistaId, nome, variante }: SilhuetaPistaProps) {
  return (
    <svg
      className={`silhueta-pista silhueta-pista--${variante}`}
      viewBox={VIEWBOX_PISTA}
      role="img"
      aria-label={`Traçado de ${nome}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={pathDaVolta(pistaId)} className="silhueta-pista__volta" />
    </svg>
  );
}
