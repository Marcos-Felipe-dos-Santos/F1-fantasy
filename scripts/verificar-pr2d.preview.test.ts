/**
 * Verificação do PR 2d nas 1000 corridas da medição, com o dataset REAL (os testes de
 * `src/` rodam na fixture). Falha se o progresso recuar ou saltar, se uma passagem pela
 * linha mudar, se o incidente cair numa janela de pit, se o DNF não parar no ponto, se a
 * consequência divergir do painel ou se um nome ficar ambíguo.
 *
 * `reordenacaoDeParados`: quantas vezes a ordem oficial troca dois carros parados de lugar no
 * painel. Medição, não portão: a regra é do PR 2e e o abandono antecipado pode acioná-la.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/verificar-pr2d.preview.test.ts --reporter=verbose --silent=false
 */

import { describe, expect, it } from 'vitest';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { simularCorrida } from '../src/engine/corrida';
import { criarDataset } from '../src/engine/dataset';
import { simularQuali } from '../src/engine/quali';
import { replayDaCorrida } from '../src/ui/fim-da-corrida';
import { acumularVoltas, classificacaoAoVivo } from '../src/ui/fluxo-corrida';
import { rotulosDosPilotos } from '../src/ui/loadout-view';
import { narrarEventos, variantesDe } from '../src/ui/narracao';
import { linhaDoTempoDoPit } from '../src/ui/pit-replay';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const PASSO_MS = 500;

describe('verificação do PR 2d', () => {
  it('1000 corridas', () => {
    const conta = {
      corridas: 0,
      incidentes: 0,
      dnf: 0,
      recuoDeProgresso: 0,
      saltoDeProgresso: 0,
      linhaMudou: 0,
      fimMudou: 0,
      incidenteNaJanelaDoPit: 0,
      dnfForaDoPonto: 0,
      dnfDepoisDoFim: 0,
      carroNaoNarrado: 0,
      reordenacaoDeParados: 0,
      nomesAmbiguos: 0,
      gruposNomeAno: 0,
      fraseRepetida: 0,
    };
    let maiorPassoEmVoltas = 0;
    dataset.pistas.forEach((pista, indice) => {
      const ritmoMax = (2.5 * PASSO_MS) / pista.tempoBaseMs;
      for (let k = 0; k < 100; k++) {
        const loadouts = draftarCampeonato(dataset, 7000 + k).loadouts;
        const seed = (7000 + k) * 1009 + indice;
        const grid = simularQuali(dataset, loadouts, pista, seed);
        const r = simularCorrida(dataset, loadouts, pista, grid, seed);
        const replay = replayDaCorrida(r, pista);
        const pit = linhaDoTempoDoPit(r, pista);
        conta.corridas++;

        const rotulos = rotulosDosPilotos(Object.fromEntries(loadouts.map((l) => [l.jogadorId, l])), dataset);
        const iguais = [...rotulos.values()].length - new Set(rotulos.values()).size;
        if (iguais > 0) {
          conta.nomesAmbiguos += iguais;
          conta.gruposNomeAno++;
        }

        const narradas = narrarEventos(r, replay);
        for (const n of narradas) {
          const lista = narradas.filter((m) => m.evento.tipo === n.evento.tipo);
          if (lista.length <= variantesDe(n.evento.tipo, r.chuva).length && lista.filter((m) => m.frase === n.frase).length > 1) conta.fraseRepetida++;
        }

        for (const c of r.classificacao) {
          const id = c.jogadorId;
          const h = r.historicoVoltas[id];
          const acum = acumularVoltas(h);
          const incidentes = replay.incidentes(id);
          conta.incidentes += incidentes.length;
          for (const i of incidentes) {
            if (!narradas.some((n) => n.evento === i.evento)) conta.carroNaoNarrado++;
            for (const p of replay.paradas(id)) {
              if (i.inicio < p.fim && i.fim > p.inicio) conta.incidenteNaJanelaDoPit++;
            }
          }

          let anterior = replay.progresso(id, h, 0) * pista.voltas;
          for (let t = PASSO_MS; t < replay.fim; t += PASSO_MS) {
            const atual = replay.progresso(id, h, t) * pista.voltas;
            if (atual < anterior - 1e-9) conta.recuoDeProgresso++;
            if (atual - anterior > ritmoMax) conta.saltoDeProgresso++;
            maiorPassoEmVoltas = Math.max(maiorPassoEmVoltas, atual - anterior);
            anterior = atual;
          }

          const inteiras = c.status === 'dnf' ? h.length - 1 : h.length;
          for (let v = 1; v <= inteiras; v++) {
            // 1 ms: a volta do box é achada por bisseção, com erro abaixo disso (`PASSOS_BISSECAO`).
            if (Math.abs(replay.instanteDoProgresso(id, h, v) - pit.instanteDoProgresso(id, h, v)) >= 1) conta.linhaMudou++;
          }

          const chegada = replay.chegada(id);
          if (chegada !== undefined && Math.abs(chegada.instante - pit.instanteDoProgresso(id, h, chegada.voltas)) >= 1) conta.fimMudou++;

          if (c.status === 'dnf') {
            conta.dnf++;
            const ab = replay.abandono(id);
            if (ab === undefined) {
              conta.dnfForaDoPonto++;
              continue;
            }
            if (ab.instante >= replay.fim) conta.dnfDepoisDoFim++;
            const fracao = replay.posicao(id, h, 'dnf', (acum.at(-1) ?? 0) + 1000, false).fracaoNaPista;
            if (fracao === null || Math.abs(fracao - ab.fracao) > 1e-9) conta.dnfForaDoPonto++;
          }
        }

        // Duas amostras do painel: um carro parado que muda de lugar sem ninguém correndo perto.
        const ordem = grid.grid.map((g) => g.jogadorId);
        const painel = (t: number) => classificacaoAoVivo(r, ordem, t, pista.voltas, replay).filter((i) => i.status === 'dnf').map((i) => i.jogadorId);
        for (let t = 0, antes = painel(0); t < replay.fim; t += 5000) {
          const agora = painel(t);
          const comum = antes.filter((id) => agora.includes(id));
          if (comum.join() !== agora.filter((id) => comum.includes(id)).join()) conta.reordenacaoDeParados++;
          antes = agora;
        }
      }
    });
    console.log(JSON.stringify({ ...conta, maiorPassoEmVoltas }));
    expect(conta.corridas).toBe(1000);
    expect(conta.dnf).toBe(800);
    expect(conta.incidentes).toBeGreaterThan(5000);
    expect(conta.recuoDeProgresso).toBe(0);
    expect(conta.saltoDeProgresso).toBe(0);
    expect(conta.linhaMudou).toBe(0);
    expect(conta.fimMudou).toBe(0);
    expect(conta.nomesAmbiguos).toBe(0);
    expect(conta.incidenteNaJanelaDoPit).toBe(0);
    expect(conta.dnfForaDoPonto).toBe(0);
    expect(conta.dnfDepoisDoFim).toBe(0);
    expect(conta.carroNaoNarrado).toBe(0);
    expect(conta.fraseRepetida).toBe(0);
  }, 590000);
});
