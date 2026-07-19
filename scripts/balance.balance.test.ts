/**
 * Runner do balance-harness (PR 1.6). Roda por `npm run balance`
 * (vitest.balance.config.ts) — fora do `npm test` normal, porque simula
 * milhares de corridas e mede metas de calibração, não lógica.
 *
 * As asserções abaixo são as metas de calibração decididas pelo dev em
 * 2026-07-18 (`PROGRESS.md`, seção "Metas de calibração"). O relatório
 * completo é sempre impresso via console.log, mesmo se algum assert falhar
 * (o dev quer os números finais em qualquer cenário).
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { gerarRelatorio, medirParadasExtras, medirRaridadePeca, medirVitoriaPole } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

describe('balance-harness (PR 1.6)', () => {
  it('mede as métricas de balanceamento e reporta contra as metas do dev', () => {
    const vitoriaPole = medirVitoriaPole(dataset, 400);
    const paradas = medirParadasExtras(dataset, 300);
    const raridade = medirRaridadePeca(dataset, 200);

    // Sempre reporta, mesmo que algum assert abaixo falhe.
    console.log(gerarRelatorio(vitoriaPole, paradas, raridade));

    // Meta 1 (PROGRESS.md): sinal de grid — pole com carro idêntico vence
    // claramente mais que 61% e bem menos que 95%, alvo ~70-80% na pista
    // de ultrapassagem média.
    expect(vitoriaPole.media).toBeGreaterThanOrEqual(0.7);
    expect(vitoriaPole.media).toBeLessThanOrEqual(0.8);
    expect(vitoriaPole.facil).toBeGreaterThanOrEqual(0.63);
    expect(vitoriaPole.dificil).toBeLessThanOrEqual(0.9);
    expect(vitoriaPole.dificil).toBeGreaterThanOrEqual(vitoriaPole.media);
    expect(vitoriaPole.media).toBeGreaterThanOrEqual(vitoriaPole.facil - 0.02);

    // Meta 2 (PROGRESS.md): parada extra em desgaste Alto — maioria dos
    // carros (~40-60%) faz 2+ paradas; desgaste medio/baixo continua raro.
    expect(paradas.alto).toBeGreaterThanOrEqual(0.4);
    expect(paradas.alto).toBeLessThanOrEqual(0.6);
    expect(paradas.medio).toBeLessThanOrEqual(0.2);
    expect(paradas.baixo).toBeLessThanOrEqual(0.05);
    // "variando pelo PNEU": bucket de PNEU alto (>80) tem taxa MENOR que o
    // bucket de PNEU baixo (<60) dentro do nível de desgaste alto.
    expect(paradas.altoPorBucket.pneuAlto).toBeLessThan(paradas.altoPorBucket.pneuBaixo);

    // Meta 3 (PROGRESS.md item 4): guarda folgada contra peça dominante —
    // a peça proibida não pode campeonar desproporcionalmente mais do que
    // é usada.
    expect(raridade.ratio.proibido).toBeLessThanOrEqual(3.0);
  });
});
