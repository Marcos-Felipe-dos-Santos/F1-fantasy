/**
 * Runner do harness comparativo de alavancas (PR 6.3.1). Roda por
 * `npm run balance` (vitest.balance.config.ts) — igual ao runner do PR 1.6,
 * é lento (200 campeonatos por cenário) e mede/reporta, não verifica lógica.
 *
 * REPORT-ONLY: nenhuma alavanca medida aqui está implementada no jogo — este
 * teste só existe pra ajudar o dev a decidir, com números, se vale a pena
 * mitigar a dominância do draft (PR 6.3) antes de investir em UI de
 * campeonato. Sem assert de limiar (mesmo padrão informativo de
 * `balance.balance.test.ts`); o teste só falha se alguma medição lançar erro.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { criarTabelaPercentis, medirCenario, type Cenario, type MetricasAlavanca } from './alavancas';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const tabela = criarTabelaPercentis(dataset);

const N_CAMPEONATOS = 200;
const INTENSIDADES = [0.03, 0.07, 0.12];
const INICIOS = [4, 6];

function nomeLastro(intensidade: number, aPartirDaEtapa: number): string {
  return `lastro ${(intensidade * 100).toFixed(0)}%@etapa${aPartirDaEtapa}`;
}

function montarCenarios(): Cenario[] {
  const cenarios: Cenario[] = [
    { nome: 'A baseline', nEtapas: 10 },
    { nome: 'B pit apos 5a', nEtapas: 10, pit: { aposEtapa: 5 } },
  ];

  for (const intensidade of INTENSIDADES) {
    for (const aPartirDaEtapa of INICIOS) {
      cenarios.push({
        nome: `C ${nomeLastro(intensidade, aPartirDaEtapa)}`,
        nEtapas: 10,
        lastro: { intensidade, aPartirDaEtapa },
      });
    }
  }

  // Variante de FORMA do lastro (extra da revisão, não pedida no plano
  // original): a forma harmônica proposta pelo dev muda o campeão em ~19% das
  // temporadas e mesmo assim não move o ρ, porque só aperta o pódio. A forma
  // linear (líder perde X, último perde 0) espalha a mesma intensidade pela
  // tabela inteira. Sem esta linha, o relatório diria "lastro não funciona"
  // quando o achado real é "lastro de pódio não move a métrica do pelotão".
  for (const intensidade of INTENSIDADES) {
    cenarios.push({
      nome: `C ${nomeLastro(intensidade, 4)} LINEAR`,
      nEtapas: 10,
      lastro: { intensidade, aPartirDaEtapa: 4, forma: 'linear' },
    });
  }

  cenarios.push({ nome: 'D temporada curta (5 etapas)', nEtapas: 5 });

  for (const intensidade of INTENSIDADES) {
    for (const aPartirDaEtapa of INICIOS) {
      cenarios.push({
        nome: `E pit+${nomeLastro(intensidade, aPartirDaEtapa)}`,
        nEtapas: 10,
        pit: { aposEtapa: 5 },
        lastro: { intensidade, aPartirDaEtapa },
      });
    }
  }

  return cenarios;
}

function fmt(v: number, casas = 3): string {
  return v.toFixed(casas);
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

/**
 * Fração dos campeonatos em que o cenário coroou um campeão DIFERENTE do
 * baseline, na mesma seed. É a métrica que expõe o efeito do lastro harmônico,
 * que o ρ não enxerga: comparação pareada por seed, não agregada.
 */
function pCampeaoMudou(r: MetricasAlavanca, campeoesBaseline: string[]): number {
  let mudou = 0;
  for (let i = 0; i < r.campeoes.length; i++) {
    if (r.campeoes[i] !== campeoesBaseline[i]) mudou++;
  }
  return mudou / r.campeoes.length;
}

function formatarTabela(resultados: MetricasAlavanca[], baseline: MetricasAlavanca): string {
  const linhas: string[] = [];
  const colNome = Math.max(...resultados.map((r) => r.nome.length), 'cenario'.length) + 2;

  linhas.push(
    'cenario'.padEnd(colNome) +
      'rho medio'.padEnd(11) +
      'D rho'.padEnd(9) +
      'desvio rho'.padEnd(12) +
      '[min, max]'.padEnd(18) +
      'P(camp top3)'.padEnd(14) +
      'P(podio fora top5)'.padEnd(20) +
      'P(campeao mudou)'.padEnd(18) +
      'desvio pontos',
  );

  for (const r of resultados) {
    const deltaRho = r.rhoMedio - baseline.rhoMedio;
    linhas.push(
      r.nome.padEnd(colNome) +
        fmt(r.rhoMedio).padEnd(11) +
        `${deltaRho >= 0 ? '+' : ''}${fmt(deltaRho)}`.padEnd(9) +
        fmt(r.rhoStdDev).padEnd(12) +
        `[${fmt(r.rhoMin)}, ${fmt(r.rhoMax)}]`.padEnd(18) +
        pct(r.pCampeaoTop3).padEnd(14) +
        pct(r.pForaTop5NoPodio).padEnd(20) +
        pct(pCampeaoMudou(r, baseline.campeoes)).padEnd(18) +
        r.stdDevPontos.toFixed(2),
    );
    if (r.rhoPosPit !== undefined) {
      const trocas = Object.entries(r.trocasPorSlot ?? {})
        .map(([slot, n]) => `${slot}=${n}`)
        .join(' ');
      linhas.push(
        `${''.padEnd(colNome)}rho pos-pit=${fmt(r.rhoPosPit)}  trocasPorSlot: ${trocas}`,
      );
    }
  }

  return linhas.join('\n');
}

describe('harness comparativo de alavancas contra a dominancia do draft (PR 6.3.1)', () => {
  it('mede 200 campeonatos por cenario e reporta a tabela comparativa (report-only, sem limiar)', () => {
    const cenarios = montarCenarios();
    const resultados = cenarios.map((cenario) => medirCenario(dataset, tabela, cenario, N_CAMPEONATOS));
    const baseline = resultados[0];

    const linhas: string[] = [];
    linhas.push('=== alavancas contra a dominancia do draft — relatorio (PR 6.3.1) ===');
    linhas.push('');
    linhas.push(
      'REPORT-ONLY: nenhuma alavanca medida aqui esta implementada no jogo. src/ continua intocado.',
    );
    linhas.push(
      'Convencao de rho (igual ao PR 6.3): 1 = melhor em ambos os ranks (1 = loadout mais forte; 1 = campeao).',
    );
    linhas.push(
      'rho = +1 => "o draft decide tudo"; rho = 0 => "o draft nao explica nada".',
    );
    linhas.push(
      'A forca correlacionada em TODA linha e sempre a do DRAFT (antes de qualquer pit) — a pergunta e sempre',
    );
    linhas.push(
      '"o draft decide?", nunca "o loadout final decide?". Nas linhas de pit, "rho pos-pit" mede a forca',
    );
    linhas.push('POS-troca — se ela cair bem abaixo do rho da linha, a decisao migrou do draft pra loteria.');
    linhas.push(
      `Referencia de acaso puro: P(campeao top-3) = 13.6%; P(podio com alguem fora do top-5) = 99.4%.`,
    );
    linhas.push(`${N_CAMPEONATOS} campeonatos por cenario, mesma populacao de drafts entre cenarios (seed = indice).`);
    linhas.push(
      'ATENCAO ao ler o rho: ele correlaciona os 22 jogadores da tabela. Uma alavanca que so aperta o PODIO',
    );
    linhas.push(
      'muda quem ganha sem mover o rho — por isso a coluna "P(campeao mudou)" (comparacao pareada por seed,',
    );
    linhas.push('contra o baseline) esta aqui: e ela que expoe o efeito do lastro harmonico.');
    linhas.push('');
    linhas.push(formatarTabela(resultados, baseline));

    console.log(linhas.join('\n'));

    // Sem assert de limiar — só garante que nenhuma medição lançou erro e que
    // todo rho ficou no intervalo matematicamente válido [-1, 1] (guarda
    // mínima de sanidade, não um portão de decisão).
    for (const r of resultados) {
      expect(r.rhoMedio).toBeGreaterThanOrEqual(-1);
      expect(r.rhoMedio).toBeLessThanOrEqual(1);
    }
  });
});
