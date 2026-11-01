/**
 * Diferença para o líder no painel do replay (PR 2a). Só apresentação: lê o
 * resultado congelado e o mesmo progresso que ordena `classificacaoAoVivo`, senão
 * o número contradiria a linha em que aparece.
 *
 * Em tempo: quanto faz que o líder esteve onde o carro está agora. O histórico do
 * líder não traz a janela do pit, então a conta pode dar negativa com ele nos
 * boxes; o piso é o valor da linha de cima, e por isso a coluna nunca desce.
 *
 * Na chegada vale `tempoTotal`, que tem a punição que `historicoVoltas` não tem.
 */

import type { ResultadoCorrida } from '../engine/types';
import {
  acumularVoltas,
  progressoNoReplay,
  type ItemClassificacaoAoVivo,
  type PitDoReplay,
} from './fluxo-corrida';

export type DiferencaAoLider =
  | { tipo: 'lider' }
  | { tipo: 'tempo'; ms: number }
  | { tipo: 'voltas'; voltas: number }
  | null;

/** Instante em que quem tem `historico` completou `voltas` (fracionárias). */
function tempoNasVoltas(historico: number[], voltas: number): number {
  const acumulado = acumularVoltas(historico);
  const k = Math.floor(voltas);
  if (k >= historico.length) return acumulado.at(-1) ?? 0;
  return (k === 0 ? 0 : acumulado[k - 1]) + (voltas - k) * historico[k];
}

/** Uma entrada por item de `ordem`, na mesma ordem. */
export function diferencasParaLider(
  resultado: ResultadoCorrida,
  ordem: readonly ItemClassificacaoAoVivo[],
  tempoSimMs: number,
  voltasTotais: number,
  pit?: PitDoReplay,
): DiferencaAoLider[] {
  const lider = ordem.find((item) => item.status !== 'dnf');
  if (lider === undefined) return ordem.map(() => null);

  const voltasDe = (jogadorId: string) => {
    const historico = resultado.historicoVoltas[jogadorId] ?? [];
    const progresso =
      pit?.progresso(jogadorId, historico, tempoSimMs) ??
      progressoNoReplay(historico, tempoSimMs, voltasTotais);
    return progresso * voltasTotais;
  };
  const tempoTotal = new Map(resultado.classificacao.map((c) => [c.jogadorId, c.tempoTotal]));
  const historicoLider = resultado.historicoVoltas[lider.jogadorId] ?? [];
  const voltasLider = voltasDe(lider.jogadorId);

  let piso = 0;
  return ordem.map((item): DiferencaAoLider => {
    if (item.status === 'dnf') return null;
    if (item === lider) return { tipo: 'lider' };
    let ms: number;
    if (item.status === 'terminou' && lider.status === 'terminou') {
      ms = (tempoTotal.get(item.jogadorId) ?? 0) - (tempoTotal.get(lider.jogadorId) ?? 0);
    } else {
      const voltas = voltasDe(item.jogadorId);
      const atras = Math.floor(voltasLider - voltas);
      if (atras >= 1) return { tipo: 'voltas', voltas: atras };
      ms = tempoSimMs - tempoNasVoltas(historicoLider, voltas);
    }
    piso = Math.max(piso, ms);
    return { tipo: 'tempo', ms: piso };
  });
}

export function formatarDiferenca(diferenca: DiferencaAoLider): string {
  if (diferenca === null) return '';
  if (diferenca.tipo === 'lider') return 'Líder';
  if (diferenca.tipo === 'voltas') return `+${diferenca.voltas} V`;
  return `+${(diferenca.ms / 1000).toFixed(1).replace('.', ',')}s`;
}
