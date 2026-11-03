/**
 * Medição prévia do PR 2e (a corrida termina quando todos cruzam a linha). Não
 * muda `src/`: lê a engine, a linha do tempo do pit e a geometria do box, e
 * imprime/grava o que o Marcos pediu antes de qualquer código.
 *
 * Mesmos grids e seeds de `medir-pr2c.preview.test.ts` (100 grids, 10 pistas).
 *
 * BANDEIRADA: o primeiro carro a completar as N voltas NA PISTA (menor soma do
 * histórico entre os que terminam), não `classificacao[0].tempoTotal`, que traz
 * a punição que o histórico não tem. Cada carro recebe a bandeirada na primeira
 * passagem pela linha a partir daí, pelo progresso do MAPA (`instanteDoProgresso`):
 * o box cruza a linha, e na volta do pit a passagem não é a soma do histórico.
 *
 * A chegada ao box depois da linha é um TETO: ignora a rampa de desaceleração.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/medir-pr2e.preview.test.ts --reporter=verbose --silent=false
 */

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { simularCorrida } from '../src/engine/corrida';
import { criarDataset } from '../src/engine/dataset';
import { simularQuali } from '../src/engine/quali';
import type { Loadout } from '../src/engine/types';
import { caminhoDoBox } from '../src/ui/box';
import { acumularVoltas, lutDoTracado, MS_REPLAY_POR_VOLTA } from '../src/ui/fluxo-corrida';
import { ESPACO_VAGA, limiteDoBox, linhaDoTempoDoPit } from '../src/ui/pit-replay';
import { tracadoSuavizado } from '../src/ui/suavizacao';
import { BOXES_POR_PISTA } from '../src/ui/tracados';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const N_GRIDS = 100;
const RAZOES_VOLTA_LENTA = [0.5, 0.6, 0.7, 0.8];
const SAIDA = process.env.MEDIR_PR2E_SAIDA ?? 'docs/pr2e-medicao.json';
const TIMEOUT_S = 300;

function resumo(xs: number[]) {
  if (xs.length === 0) return { n: 0, min: 0, media: 0, p50: 0, p95: 0, max: 0 };
  const o = [...xs].sort((a, b) => a - b);
  const q = (p: number) => o[Math.min(o.length - 1, Math.floor(p * o.length))];
  return {
    n: o.length,
    min: o[0],
    media: o.reduce((s, x) => s + x, 0) / o.length,
    p50: q(0.5),
    p95: q(0.95),
    max: o[o.length - 1],
  };
}

const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** Fração da entrada do box a partir da linha, e arco até a primeira vaga. */
function geometriaDoBox(pistaId: string) {
  const curva = tracadoSuavizado(pistaId);
  const { amostras, janela } = caminhoDoBox(curva, BOXES_POR_PISTA[pistaId]);
  const perimetro = lutDoTracado(curva).comprimentoTotal;
  let antes = 0;
  let viuParalelo = false;
  for (let i = 1; i < amostras.length; i++) {
    const a = amostras[i - 1];
    const b = amostras[i];
    if (a.paralelo && b.paralelo) viuParalelo = true;
    else if (!viuParalelo) antes += Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y);
  }
  return {
    perimetro,
    fE: (((janela.inicio / perimetro) % 1) + 1) % 1,
    ateVaga: antes + ESPACO_VAGA / 2,
  };
}

describe('medição do PR 2e', () => {
  it('imprime as tabelas', () => {
    const pistas = dataset.pistas;
    const loadouts: Loadout[][] = [];
    for (let g = 0; g < N_GRIDS; g++) loadouts.push(draftarCampeonato(dataset, 7000 + g).loadouts);

    const relatorio: Record<string, unknown> = { N_GRIDS, RAZOES_VOLTA_LENTA };
    const piorReplayS: Record<string, number> = { lenta: 0, media: 0, rapida: 0 };

    for (const pista of pistas) {
      const geo = geometriaDoBox(pista.id);
      const { razao } = limiteDoBox(pista.id);
      const cauda: number[] = [];
      const intervalo: number[] = [];
      const atrasadosPorCorrida: number[] = [];
      const voltasAMenos: number[] = [];
      let corridasSemAtrasado = 0;
      let corridasComAtrasado = 0;
      let corridasSoUmCarro = 0;
      let primeiroNaoEOficial = 0;
      let carrosPunidos = 0;
      let corridasComInversao = 0;
      let inversoes = 0;
      let corridasInversaoSoPunicao = 0;
      let inversaoComVoltasDiferentes = 0;
      let noPitNaBandeira = 0;
      let noBoxNaBandeira = 0;
      let paradoNaBandeira = 0;
      let bandeiraNaJanela = 0;
      let bandeiraNoBox = 0;
      const casosBandeiraNoBox: { grid: number; seed: number; jogadorId: string; volta: number }[] = [];
      let boxNoFim = 0;
      let paradasInvisiveis = 0;
      let eventosDepoisDaBandeira = 0;
      let dnfTotal = 0;
      let dnfDepoisDoFimHoje = 0;
      let dnfNaCauda = 0;
      let dnfDepoisDoFimNovo = 0;
      let dnfCruzaAntesDeQuebrar = 0;
      const porRazao = RAZOES_VOLTA_LENTA.map((r) => ({
        razao: r,
        corridasComEntrada: 0,
        corridasComVaga: 0,
        carrosEntrada: 0,
        carrosVaga: 0,
        fracaoVoltaDoVencedor: [] as number[],
      }));
      const duracao: Record<string, number[]> = { lenta: [], media: [], rapida: [] };
      const duracaoHoje: Record<string, number[]> = { lenta: [], media: [], rapida: [] };

      for (let k = 0; k < N_GRIDS; k++) {
        const seed = (7000 + k) * 1009 + pistas.indexOf(pista);
        const grid = simularQuali(dataset, loadouts[k], pista, seed);
        const r = simularCorrida(dataset, loadouts[k], pista, grid, seed);
        const linha = linhaDoTempoDoPit(r, pista);
        const terminou = r.classificacao.filter((c) => c.status === 'terminou');
        if (terminou.length === 0) continue;
        const soma = (id: string) => acumularVoltas(r.historicoVoltas[id]).at(-1) ?? 0;

        const tHoje = r.classificacao[0].tempoTotal;
        const tBandeira = Math.min(...terminou.map((c) => soma(c.jogadorId)));
        if (soma(r.classificacao[0].jogadorId) !== tBandeira) primeiroNaoEOficial++;

        const chegada = new Map<string, { voltas: number; t: number }>();
        for (const c of terminou) {
          const hist = r.historicoVoltas[c.jogadorId];
          if (Math.abs(c.tempoTotal - soma(c.jogadorId)) > 1e-6) carrosPunidos++;
          for (let v = 1; v <= hist.length; v++) {
            const t = linha.instanteDoProgresso(c.jogadorId, hist, v);
            if (t >= tBandeira || v === hist.length) {
              chegada.set(c.jogadorId, { voltas: v, t });
              break;
            }
          }
        }

        const tFim = Math.max(...[...chegada.values()].map((c) => c.t));
        cauda.push((tFim - tHoje) / 1000);
        intervalo.push((tFim - tBandeira) / 1000);
        if (terminou.length === 1) corridasSoUmCarro++;

        const atrasados = terminou.filter((c) => (chegada.get(c.jogadorId)?.voltas ?? 0) < pista.voltas);
        atrasadosPorCorrida.push(atrasados.length);
        if (atrasados.length === 0) corridasSemAtrasado++;
        else corridasComAtrasado++;
        for (const c of atrasados) voltasAMenos.push(pista.voltas - (chegada.get(c.jogadorId)?.voltas ?? 0));

        // Ordem oficial × ordem de passagem pela linha (mais voltas, depois quem cruzou antes).
        let inversoesDaCorrida = 0;
        let soPunicao = true;
        for (let i = 1; i < terminou.length; i++) {
          const a = chegada.get(terminou[i - 1].jogadorId);
          const b = chegada.get(terminou[i].jogadorId);
          if (a === undefined || b === undefined) continue;
          if (b.voltas > a.voltas || (b.voltas === a.voltas && b.t < a.t)) {
            inversoesDaCorrida++;
            if (a.voltas !== b.voltas) inversaoComVoltasDiferentes++;
            const puniu = (id: string, tt: number) => Math.abs(tt - soma(id)) > 1e-6;
            // Quem cruzou antes e ficou atrás no oficial é `b`: é ele que tem de ter a punição.
            if (!puniu(terminou[i].jogadorId, terminou[i].tempoTotal)) soPunicao = false;
          }
        }
        inversoes += inversoesDaCorrida;
        if (inversoesDaCorrida > 0) {
          corridasComInversao++;
          if (soPunicao) corridasInversaoSoPunicao++;
        }

        for (const c of r.classificacao) {
          const id = c.jogadorId;
          const paradas = linha.paradas(id);
          const naBandeira = paradas.find((p) => tBandeira >= p.inicio && tBandeira < p.fim);
          if (naBandeira !== undefined) {
            noPitNaBandeira++;
            if (tBandeira >= naBandeira.entrada && tBandeira < naBandeira.retorno) noBoxNaBandeira++;
            if (tBandeira >= naBandeira.chegada && tBandeira < naBandeira.partida) paradoNaBandeira++;
          }
          if (paradas.some((p) => tFim >= p.entrada && tFim < p.retorno)) boxNoFim++;

          if (c.status === 'dnf') {
            dnfTotal++;
            const parou = soma(id);
            if (parou >= tHoje) dnfDepoisDoFimHoje++;
            if (parou >= tHoje && parou < tFim) dnfNaCauda++;
            if (parou >= tFim) dnfDepoisDoFimNovo++;
            const hist = r.historicoVoltas[id];
            for (let v = 1; v < hist.length; v++) {
              if (linha.instanteDoProgresso(id, hist, v) >= tBandeira) {
                dnfCruzaAntesDeQuebrar++;
                break;
              }
            }
            continue;
          }

          const fim = chegada.get(id);
          if (fim === undefined) continue;
          const janela = paradas.find((p) => fim.t >= p.inicio && fim.t < p.fim);
          if (janela !== undefined) {
            bandeiraNaJanela++;
            if (fim.t >= janela.entrada && fim.t < janela.retorno) {
              bandeiraNoBox++;
              casosBandeiraNoBox.push({ grid: 7000 + k, seed, jogadorId: id, volta: fim.voltas });
            }
          }
          paradasInvisiveis += r.voltasDePit[id].filter((v) => v > fim.voltas).length;
          eventosDepoisDaBandeira += r.eventos.filter((e) => e.jogadorId === id && e.volta > fim.voltas).length;
        }

        // Até onde a volta lenta chega antes do fim do replay.
        for (const m of porRazao) {
          let entraram = 0;
          let pararam = 0;
          for (const c of terminou) {
            const fim = chegada.get(c.jogadorId);
            if (fim === undefined) continue;
            const voltaLimpa = mediana(r.historicoVoltas[c.jogadorId]);
            const v = (m.razao * geo.perimetro) / voltaLimpa;
            const ateEntrada = (geo.fE * geo.perimetro) / v;
            const limite = Math.min(m.razao, razao) * (geo.perimetro / voltaLimpa);
            if (fim.t + ateEntrada <= tFim) entraram++;
            if (fim.t + ateEntrada + geo.ateVaga / limite <= tFim) pararam++;
          }
          if (entraram > 0) m.corridasComEntrada++;
          if (pararam > 0) m.corridasComVaga++;
          m.carrosEntrada += entraram;
          m.carrosVaga += pararam;
          const voltaLenta = mediana(r.historicoVoltas[r.classificacao[0].jogadorId]) / m.razao;
          m.fracaoVoltaDoVencedor.push((tFim - tBandeira) / voltaLenta);
        }

        for (const nome of ['lenta', 'media', 'rapida'] as const) {
          const escala = tHoje / (pista.voltas * MS_REPLAY_POR_VOLTA[nome]);
          duracao[nome].push(tFim / escala / 1000);
          duracaoHoje[nome].push(tHoje / escala / 1000);
          piorReplayS[nome] = Math.max(piorReplayS[nome], tFim / escala / 1000);
        }
      }

      const escalaMedia = (nome: 'lenta' | 'media' | 'rapida') => {
        const d = resumo(duracao[nome].map((x, i) => x - duracaoHoje[nome][i]));
        return { p50: d.p50, p95: d.p95, max: d.max };
      };
      const linhaRel = {
        voltas: pista.voltas,
        tempoBaseS: pista.tempoBaseMs / 1000,
        fracaoEntradaBox: geo.fE,
        intervaloLiderUltimoS: resumo(intervalo),
        caudaSobreHojeS: resumo(cauda),
        telaAMaisS: { lenta: escalaMedia('lenta'), media: escalaMedia('media'), rapida: escalaMedia('rapida') },
        replayTotalS: { lenta: resumo(duracao.lenta), media: resumo(duracao.media), rapida: resumo(duracao.rapida) },
        atrasadosPorCorrida: resumo(atrasadosPorCorrida),
        corridasSemAtrasado,
        corridasComAtrasado,
        corridasSoUmCarro,
        voltasAMenosMax: Math.max(0, ...voltasAMenos),
        primeiroNaoEOficial,
        carrosPunidos,
        corridasComInversao,
        inversoes,
        corridasInversaoSoPunicao,
        inversaoComVoltasDiferentes,
        noPitNaBandeira,
        noBoxNaBandeira,
        paradoNaBandeira,
        bandeiraNaJanela,
        bandeiraNoBox,
        casosBandeiraNoBox,
        boxNoFim,
        paradasInvisiveis,
        eventosDepoisDaBandeira,
        dnfTotal,
        dnfDepoisDoFimHoje,
        dnfNaCauda,
        dnfDepoisDoFimNovo,
        dnfCruzaAntesDeQuebrar,
        voltaLenta: porRazao.map((m) => ({
          razao: m.razao,
          corridasComEntrada: m.corridasComEntrada,
          corridasComVaga: m.corridasComVaga,
          carrosEntrada: m.carrosEntrada,
          carrosVaga: m.carrosVaga,
          fracaoVoltaDoVencedor: resumo(m.fracaoVoltaDoVencedor),
        })),
      };
      relatorio[pista.id] = linhaRel;

      const i = linhaRel.intervaloLiderUltimoS;
      const t = linhaRel.telaAMaisS;
      console.log(
        `\n== ${pista.id} ${pista.voltas}v ${linhaRel.tempoBaseS}s fE ${geo.fE.toFixed(3)} | intervalo s p50 ${i.p50.toFixed(1)} p95 ${i.p95.toFixed(1)} max ${i.max.toFixed(1)} | tela a mais s (p50/p95/max) lenta ${t.lenta.p50.toFixed(1)}/${t.lenta.p95.toFixed(1)}/${t.lenta.max.toFixed(1)} media ${t.media.p50.toFixed(1)}/${t.media.p95.toFixed(1)}/${t.media.max.toFixed(1)} rapida ${t.rapida.p50.toFixed(1)}/${t.rapida.p95.toFixed(1)}/${t.rapida.max.toFixed(1)} | total lenta max ${linhaRel.replayTotalS.lenta.max.toFixed(1)}`,
      );
      console.log(
        `  atrasados p50 ${linhaRel.atrasadosPorCorrida.p50} max ${linhaRel.atrasadosPorCorrida.max}, corridas com ${corridasComAtrasado}/sem ${corridasSemAtrasado}, voltas a menos max ${linhaRel.voltasAMenosMax} | 1º na pista != oficial ${primeiroNaoEOficial}, punidos ${carrosPunidos}, inversões ${inversoes} em ${corridasComInversao} corridas (só punição ${corridasInversaoSoPunicao}; voltas diferentes ${inversaoComVoltasDiferentes})`,
      );
      console.log(
        `  pit na bandeira: janela ${noPitNaBandeira} box ${noBoxNaBandeira} parado ${paradoNaBandeira} | bandeira do carro na janela ${bandeiraNaJanela} no box ${bandeiraNoBox} | box no fim ${boxNoFim} | paradas invisíveis ${paradasInvisiveis} eventos depois ${eventosDepoisDaBandeira}`,
      );
      console.log(
        `  DNF ${dnfTotal}: depois do fim hoje ${dnfDepoisDoFimHoje}, na cauda ${dnfNaCauda}, depois do fim novo ${dnfDepoisDoFimNovo}, cruza a linha antes de quebrar ${dnfCruzaAntesDeQuebrar}`,
      );
      for (const m of linhaRel.voltaLenta) {
        console.log(
          `  lenta ${m.razao}: corridas c/ entrada ${m.corridasComEntrada} c/ vaga ${m.corridasComVaga}, carros ${m.carrosEntrada}/${m.carrosVaga}, volta do vencedor p50 ${m.fracaoVoltaDoVencedor.p50.toFixed(2)} max ${m.fracaoVoltaDoVencedor.max.toFixed(2)}`,
        );
      }
    }

    relatorio.piorReplayS = piorReplayS;
    relatorio.margemTimeoutS = Object.fromEntries(
      Object.entries(piorReplayS).map(([nome, s]) => [nome, TIMEOUT_S - s]),
    );
    console.log(`\npior replay s: ${JSON.stringify(piorReplayS)} | margem até ${TIMEOUT_S}s: ${JSON.stringify(relatorio.margemTimeoutS)}`);
    writeFileSync(SAIDA, JSON.stringify(relatorio, null, 1));
  }, 600000);
});
