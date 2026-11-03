/**
 * Diferença para o líder no painel do replay (PR 2a). Só apresentação: lê o
 * resultado congelado e o mesmo progresso que ordena `classificacaoAoVivo`, senão
 * o número contradiria a linha em que aparece.
 *
 * Em tempo: quanto faz que o líder esteve onde o carro está agora, pela mesma linha
 * do tempo do mapa. Pelo histórico não dá: ele espalha o custo do pit pela volta e,
 * com o líder na parada, a tela mostrava +0,0s para quem vinha atrás. O piso é o valor
 * da linha de cima: a punição de quem já chegou não faz a coluna descer.
 *
 * Na chegada vale `tempoTotal`, que tem a punição que `historicoVoltas` não tem. O
 * retardatário que recebeu a bandeirada segue em voltas (PR 2e): o tempo total dele
 * conta voltas que a tela não mostrou.
 */

import type { ResultadoCorrida } from '../engine/types';
import {
  instanteNasVoltas,
  progressoNoReplay,
  type ItemClassificacaoAoVivo,
  type PitDoReplay,
} from './fluxo-corrida';
import type { LinhaDoTempoPit } from './pit-replay';

export type DiferencaAoLider =
  | { tipo: 'lider' }
  | { tipo: 'tempo'; ms: number }
  | { tipo: 'voltas'; voltas: number }
  | null;

/** Uma entrada por item de `ordem`, na mesma ordem. */
export function diferencasParaLider(
  resultado: ResultadoCorrida,
  ordem: readonly ItemClassificacaoAoVivo[],
  tempoSimMs: number,
  voltasTotais: number,
  pit?: PitDoReplay & Pick<LinhaDoTempoPit, 'instanteDoProgresso'>,
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
    const voltas = voltasDe(item.jogadorId);
    const atras = Math.floor(voltasLider - voltas);
    if (atras >= 1) return { tipo: 'voltas', voltas: atras };
    let ms: number;
    if (item.status === 'terminou' && lider.status === 'terminou') {
      ms = (tempoTotal.get(item.jogadorId) ?? 0) - (tempoTotal.get(lider.jogadorId) ?? 0);
    } else {
      ms =
        tempoSimMs -
        (pit?.instanteDoProgresso(lider.jogadorId, historicoLider, voltas) ??
          instanteNasVoltas(historicoLider, voltas));
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
