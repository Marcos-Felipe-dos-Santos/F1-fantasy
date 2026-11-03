/**
 * Verificação do PR 2f nas 1000 corridas da medição, com o dataset REAL (os testes de
 * `src/` rodam na fixture). A referência é o replay da MESMA corrida sem o evento de
 * investigação, que é o replay de antes do PR 2f.
 *
 * Portões (têm que dar 0):
 * - `esperaErrada`: a parada da punição não fica exatamente X s a mais na vaga.
 * - `infracaoForaDaJanela`: a infração sai antes do pit anterior ou depois do início do pit.
 * - `naoEhOUltimoPit`: o pit da punição não é o último visível pela chegada de antes.
 * - `punidoForaDoDeslocado`: o punido, depois da espera, não é a corrida de antes atrasada X
 *   (progresso, incidentes e passagens pela linha).
 * - `outroCarroMudou`: quem não foi punido muda fora de uma janela de pit (a vaga pode mudar).
 * - `colisaoForaDoBoxCheio`: dois carros na mesma vaga sem o box cheio (regra do PR 2c).
 * - `recuoDeProgresso`, `saltoDeProgresso`: o carro volta ou teleporta.
 * - `primeiroNaoOficial`, `ordemFinalNaoOficial`: a bandeirada ou o fim fora da ordem oficial.
 * - `saltoNaDiferenca`: a coluna do punido salta mais de 0,5 s ao cruzar a linha.
 * - `narracaoErrada`: o cumprido não tem as duas linhas na ordem, ou o selo não tem uma.
 *
 * Medição, não portão: `colisoesAntes` × `colisoesDepois`, `carrosQueMudamVoltas` (2 em 1000,
 * aceito pelo Marcos), `vagaDoPunidoMudou` (a espera de outro punido muda a vaga dele) e o fim
 * do replay.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/verificar-pr2f.preview.test.ts --reporter=verbose --silent=false
 */

import { describe, expect, it } from 'vitest';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { simularCorrida } from '../src/engine/corrida';
import { criarDataset } from '../src/engine/dataset';
import { simularQuali } from '../src/engine/quali';
import type { ResultadoCorrida } from '../src/engine/types';
import { diferencasParaLider } from '../src/ui/diferenca-lider';
import { replayDaCorrida, type ReplayDaCorrida } from '../src/ui/fim-da-corrida';
import { classificacaoAoVivo } from '../src/ui/fluxo-corrida';
import { narrarEventos } from '../src/ui/narracao';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const PASSO_MS = 500;

function colisoes(replay: ReplayDaCorrida, ids: readonly string[]) {
  const todas = ids.flatMap((id) => replay.paradas(id).map((p) => ({ ...p, id })));
  let total = 0;
  let foraDoBoxCheio = 0;
  for (const q of todas) {
    for (const p of todas) {
      if (p === q || p.vaga !== q.vaga || p.chegada > q.chegada || (p.chegada === q.chegada && p.id >= q.id)) continue;
      if (q.chegada >= p.partida) continue;
      total++;
      if (!q.boxCheio) foraDoBoxCheio++;
    }
  }
  return { total, foraDoBoxCheio };
}

describe('verificação do PR 2f', () => {
  it('1000 corridas', () => {
    const conta = {
      corridas: 0,
      punidos: 0,
      cumpridos: 0,
      selos: 0,
      esperaErrada: 0,
      infracaoForaDaJanela: 0,
      naoEhOUltimoPit: 0,
      punidoForaDoDeslocado: 0,
      outroCarroMudou: 0,
      colisaoForaDoBoxCheio: 0,
      recuoDeProgresso: 0,
      saltoDeProgresso: 0,
      primeiroNaoOficial: 0,
      ordemFinalNaoOficial: 0,
      saltoNaDiferenca: 0,
      narracaoErrada: 0,
      colisoesAntes: 0,
      colisoesDepois: 0,
      carrosQueMudamVoltas: 0,
      vagaDoPunidoMudou: 0,
    };
    let maiorAumentoDoFimMs = 0;
    let maiorSaltoNaDiferencaMs = 0;

    dataset.pistas.forEach((pista, indice) => {
      const ritmoMax = (2.5 * PASSO_MS) / pista.tempoBaseMs;
      for (let k = 0; k < 100; k++) {
        const loadouts = draftarCampeonato(dataset, 7000 + k).loadouts;
        const seed = (7000 + k) * 1009 + indice;
        const grid = simularQuali(dataset, loadouts, pista, seed);
        const r = simularCorrida(dataset, loadouts, pista, grid, seed);
        const sem: ResultadoCorrida = { ...r, eventos: r.eventos.filter((e) => e.tipo !== 'investigacao') };
        const replay = replayDaCorrida(r, pista);
        const antes = replayDaCorrida(sem, pista);
        const ids = r.classificacao.map((c) => c.jogadorId);
        conta.corridas++;

        const c0 = colisoes(antes, ids);
        const c1 = colisoes(replay, ids);
        conta.colisoesAntes += c0.total;
        conta.colisoesDepois += c1.total;
        conta.colisaoForaDoBoxCheio += c1.foraDoBoxCheio;
        maiorAumentoDoFimMs = Math.max(maiorAumentoDoFimMs, replay.fim - antes.fim);

        const narradas = narrarEventos(r, replay);
        const ordemOficial = r.classificacao.filter((c) => c.status === 'terminou').map((c) => c.jogadorId);
        const comPunicaoServida = r.eventos.some((e) => e.tipo === 'investigacao' && replay.punicao(e.jogadorId) !== undefined);
        const primeiro = [...ordemOficial].sort(
          (a, b) => (replay.chegada(a)?.instante ?? Infinity) - (replay.chegada(b)?.instante ?? Infinity),
        )[0];
        if (comPunicaoServida && primeiro !== undefined && primeiro !== ordemOficial[0]) conta.primeiroNaoOficial++;
        const ordemNoFim = classificacaoAoVivo(r, grid.grid.map((g) => g.jogadorId), replay.fim, pista.voltas, replay)
          .filter((i) => i.status !== 'dnf')
          .map((i) => i.jogadorId);
        if (ordemNoFim.join() !== ordemOficial.join()) conta.ordemFinalNaoOficial++;

        for (const id of ids) {
          const h = r.historicoVoltas[id];
          if (replay.chegada(id)?.voltas !== antes.chegada(id)?.voltas) conta.carrosQueMudamVoltas++;

          let anterior = replay.progresso(id, h, 0) * pista.voltas;
          for (let t = PASSO_MS; t < replay.fim; t += PASSO_MS) {
            const atual = replay.progresso(id, h, t) * pista.voltas;
            if (atual < anterior - 1e-9) conta.recuoDeProgresso++;
            if (atual - anterior > ritmoMax) conta.saltoDeProgresso++;
            anterior = atual;
          }

          const evento = r.eventos.find((e) => e.jogadorId === id && e.tipo === 'investigacao');
          const punicao = replay.punicao(id);
          const dela = narradas.filter((n) => n.evento === evento);
          if (evento !== undefined) conta.punidos++;

          if (punicao === undefined) {
            if (evento !== undefined) {
              conta.selos++;
              if (dela.length !== 1 || replay.punicaoMs(id) !== evento.custoMs) conta.narracaoErrada++;
            }
            // Quem não foi punido: igual ao de antes, exceto dentro das janelas de pit (a vaga pode mudar).
            const janelas = antes.paradas(id);
            for (let t = 0; t < Math.min(replay.fim, antes.fim); t += PASSO_MS) {
              if (janelas.some((p) => t >= p.inicio && t < p.fim)) continue;
              if (replay.chegou(id, t) !== antes.chegou(id, t)) continue;
              if (Math.abs(replay.progresso(id, h, t) - antes.progresso(id, h, t)) > 1e-9) conta.outroCarroMudou++;
            }
            continue;
          }

          conta.cumpridos++;
          const ms = evento?.custoMs ?? NaN;
          const visiveis = antes.paradas(id).filter((p) => p.inicio < (antes.chegada(id)?.instante ?? Infinity));
          if (visiveis.at(-1)?.volta !== punicao.parada.volta) conta.naoEhOUltimoPit++;
          const base = antes.paradas(id).find((p) => p.volta === punicao.parada.volta);
          const anteriorPit = antes.paradas(id).filter((p) => p.volta < punicao.parada.volta).at(-1);
          // A espera é exata, e o carro está na vaga dele no meio dela.
          const meio = punicao.inicio + ms / 2;
          const naVaga = replay.posicao(id, h, 'terminou', meio, false).ponto;
          const vaga = replay.vagaEmX(punicao.parada.vaga);
          if (
            base === undefined ||
            punicao.ms !== ms ||
            Math.abs(punicao.parada.partida - punicao.inicio - ms) > 1e-6 ||
            Math.hypot(naVaga.x - vaga.x, naVaga.y - vaga.y) > 1e-9 ||
            !replay.noBox(id, meio)
          ) {
            conta.esperaErrada++;
            continue;
          }
          // A espera de OUTRO punido pode mudar a vaga deste: aí a chegada à vaga muda, a janela não.
          const vagaMudou = base.vaga !== punicao.parada.vaga;
          if (vagaMudou) conta.vagaDoPunidoMudou++;
          else if (Math.abs(punicao.inicio - base.partida) > 1e-6) conta.esperaErrada++;
          if (punicao.infracao < (anteriorPit?.fim ?? 0) || punicao.infracao >= base.inicio) conta.infracaoForaDaJanela++;

          const desloca = (t: number) => (t >= punicao.inicio ? t + ms : t);
          for (let t = 0; t < antes.fim; t += PASSO_MS) {
            if (vagaMudou && t >= base.inicio && t < base.fim) continue;
            if (t >= base.partida && t < base.partida + ms) continue;
            const ref = antes.chegou(id, t) ? undefined : antes.progresso(id, h, t);
            if (ref !== undefined && !replay.chegou(id, desloca(t)) && Math.abs(replay.progresso(id, h, desloca(t)) - ref) > 1e-9) {
              conta.punidoForaDoDeslocado++;
            }
          }
          const incidentesAntes = antes.incidentes(id);
          for (const i of replay.incidentes(id)) {
            const j = incidentesAntes.find((x) => x.evento === i.evento);
            if (j === undefined || Math.abs(i.inicio - desloca(j.inicio)) > 1e-6) conta.punidoForaDoDeslocado++;
          }
          for (let v = 1; v <= (replay.chegada(id)?.voltas ?? 0); v++) {
            const passagem = antes.instanteDoProgresso(id, h, v);
            // O box cruza a linha: com outra vaga, o carro pode cruzá-la antes ou depois de parar.
            if (vagaMudou && passagem >= base.inicio && passagem < base.fim) continue;
            if (Math.abs(replay.instanteDoProgresso(id, h, v) - desloca(passagem)) >= 1) {
              conta.punidoForaDoDeslocado++;
            }
          }

          if (dela.length !== 2 || dela[0].instante !== punicao.infracao || dela[1].instante !== punicao.parada.partida) {
            conta.narracaoErrada++;
          }

          const chegada = replay.chegada(id)?.instante;
          if (chegada !== undefined) {
            const diferenca = (t: number) => {
              const ordem = classificacaoAoVivo(r, ids, t, pista.voltas, replay);
              const d = diferencasParaLider(r, ordem, t, pista.voltas, replay)[ordem.findIndex((i) => i.jogadorId === id)];
              return d?.tipo === 'tempo' ? d.ms : null;
            };
            const a = diferenca(chegada - 1);
            const b = diferenca(chegada + 1);
            if (a !== null && b !== null) {
              maiorSaltoNaDiferencaMs = Math.max(maiorSaltoNaDiferencaMs, Math.abs(b - a));
              if (Math.abs(b - a) > 500) conta.saltoNaDiferenca++;
            }
          }
        }
      }
    });

    console.log(JSON.stringify({ ...conta, maiorAumentoDoFimMs, maiorSaltoNaDiferencaMs }, null, 1));
    expect(conta.corridas).toBe(1000);
    expect(conta.cumpridos).toBeGreaterThan(0);
    for (const portao of [
      'esperaErrada',
      'infracaoForaDaJanela',
      'naoEhOUltimoPit',
      'punidoForaDoDeslocado',
      'outroCarroMudou',
      'colisaoForaDoBoxCheio',
      'recuoDeProgresso',
      'saltoDeProgresso',
      'primeiroNaoOficial',
      'ordemFinalNaoOficial',
      'saltoNaDiferenca',
      'narracaoErrada',
    ] as const) {
      expect(conta[portao], portao).toBe(0);
    }
  }, 590000);
});
