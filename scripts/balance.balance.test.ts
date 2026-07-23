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
    //
    // Banda do agregado re-baseada [0.4, 0.6] -> [0.4, 0.7] no PR 4.5: o
    // ALVO do GDD não mudou ("desgaste alto força paradas extras variando
    // pelo PNEU"), mas a BASE DA MEDIÇÃO mudou — a amostra de 6 pilotos
    // passou de composição hardcoded 1 baixo/3 médio/2 alto de PNEU pra
    // seleção dinâmica 2/2/2 (min/max por bucket) do dataset real. Dobrar a
    // proporção de pilotos de PNEU baixo (que sempre param mais) puxa o
    // agregado geral pra cima sem que a dinâmica de paradas em si tenha
    // piorado — por isso o teto sobe pra 0.7, mas o guarda que realmente
    // protege a intenção do GDD é o `altoPorBucket` abaixo.
    expect(paradas.alto).toBeGreaterThanOrEqual(0.4);
    expect(paradas.alto).toBeLessThanOrEqual(0.7);
    expect(paradas.medio).toBeLessThanOrEqual(0.2);
    expect(paradas.baixo).toBeLessThanOrEqual(0.05);
    // "variando pelo PNEU": bucket de PNEU alto (>80) tem taxa MENOR que o
    // bucket de PNEU baixo (<60) dentro do nível de desgaste alto — guarda
    // principal da intenção do GDD (o agregado acima é só informativo).
    expect(paradas.altoPorBucket.pneuAlto).toBeLessThan(paradas.altoPorBucket.pneuBaixo);
    // Reforço por bucket (medido hoje: baixo=100%, alto=15.5% — margem folgada).
    expect(paradas.altoPorBucket.pneuBaixo).toBeGreaterThanOrEqual(0.75);
    expect(paradas.altoPorBucket.pneuAlto).toBeLessThanOrEqual(0.4);

    // Meta 3 (PROGRESS.md item 4): guarda folgada contra peça dominante —
    // a peça proibida não pode campeonar desproporcionalmente mais do que
    // é usada.
    expect(raridade.ratio.proibido).toBeLessThanOrEqual(3.0);
  });
});
