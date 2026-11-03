/**
 * Medição prévia do PR 2d (incidentes na pista, DNF no ponto do abandono, punição
 * cumprida no box, narração). Não muda `src/`: lê a engine, a linha do tempo do pit
 * e a geometria do box, e PROTOTIPA aqui o custo concentrado, sem tocar no produto.
 *
 * Mesmos grids e seeds de `medir-pr2e.preview.test.ts` (100 grids, 10 pistas).
 *
 * PROTÓTIPO DO CUSTO CONCENTRADO: na volta do incidente o carro anda no ritmo limpo
 * e fica parado `custoMs` na fração F, sorteada por hash `narracao:` num intervalo
 * livre (fora das janelas de pit). Fora da volta do incidente vale o progresso de
 * produção. O DNF para na fração G da última volta e não anda mais.
 *
 * INFRAÇÃO: o motor não tem volta da infração (ver §Punição no relatório). `L` é
 * enumerado em todas as voltas possíveis, para a tabela não depender de um sorteio.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/medir-pr2d.preview.test.ts --reporter=verbose --silent=false
 */

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { CORRIDA_CONFIG, simularCorrida } from '../src/engine/corrida';
import { criarDataset } from '../src/engine/dataset';
import { simularQuali } from '../src/engine/quali';
import { deriveSeed } from '../src/engine/rng';
import type { Loadout, ResultadoCorrida, TipoEvento } from '../src/engine/types';
import { caminhoDoBox } from '../src/ui/box';
import { replayDaCorrida } from '../src/ui/fim-da-corrida';
import { acumularVoltas, lutDoTracado, MS_REPLAY_POR_VOLTA } from '../src/ui/fluxo-corrida';
import { narrarEvento, narrarEventos } from '../src/ui/narracao';
import { custoPitEstimado, DISTANCIA_RAMPA, limiteDoBox } from '../src/ui/pit-replay';
import { tracadoSuavizado } from '../src/ui/suavizacao';
import { BOXES_POR_PISTA } from '../src/ui/tracados';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const N_GRIDS = 100;
const GRIDS_DA_ORDEM = 30;
const SAIDA = process.env.MEDIR_PR2D_SAIDA ?? 'docs/pr2d-medicao.json';
const TIMEOUT_S = 300;
const MARGEM_LOCAL = 0.08;
const FOLGA_PIT = 0.02;
const PASSO_ORDEM_MS = 1000;
const PISO_STOP_AND_GO_MS = 2000;
const QUADRO_MS = 1000 / 60;
const VELOCIDADES = ['lenta', 'media', 'rapida'] as const;

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

const f = (x: number, d = 1) => x.toFixed(d);
const texto = (r: ReturnType<typeof resumo>, d = 1) =>
  `n ${r.n} min ${f(r.min, d)} p50 ${f(r.p50, d)} p95 ${f(r.p95, d)} max ${f(r.max, d)}`;
const hash01 = (seed: number, rotulo: string) => (deriveSeed(seed, rotulo) >>> 0) / 2 ** 32;
const conta = (mapa: Record<string, number>, chave: string | number) => {
  mapa[chave] = (mapa[chave] ?? 0) + 1;
};

function geometriaDoBox(pistaId: string) {
  const curva = tracadoSuavizado(pistaId);
  const { amostras, janela } = caminhoDoBox(curva, BOXES_POR_PISTA[pistaId]);
  const perimetro = lutDoTracado(curva).comprimentoTotal;
  let comprimentoBox = 0;
  for (let i = 1; i < amostras.length; i++) {
    comprimentoBox += Math.hypot(amostras[i].p.x - amostras[i - 1].p.x, amostras[i].p.y - amostras[i - 1].p.y);
  }
  const fE = (((janela.inicio / perimetro) % 1) + 1) % 1;
  return {
    perimetro,
    comprimentoBox,
    fE,
    fS: fE + (janela.fim - janela.inicio) / perimetro,
    rampa: DISTANCIA_RAMPA / perimetro,
  };
}

interface Parada {
  frac: number;
  custo: number;
  ts: number;
  te: number;
  ritmo: number;
  tipo: TipoEvento;
}

interface Plano {
  volta: number;
  ta: number;
  tb: number;
  sa: number;
  sb: number;
  ritmo: number;
  paradas: Parada[];
}

/** Progresso protótipo de um carro: os planos das voltas com incidente, e o DNF parado. */
function montarPlanos(r: ResultadoCorrida, pista: { id: string; voltas: number; tempoBaseMs: number }) {
  const replay = replayDaCorrida(r, pista);
  const geo = geometriaDoBox(pista.id);
  const planos = new Map<string, Plano[]>();
  const dnf = new Map<string, { volta: number; g: number; t: number }>();
  const intervalos: number[] = [];
  let degenerados = 0;
  let semTempo = 0;

  for (const c of r.classificacao) {
    const id = c.jogadorId;
    const hist = r.historicoVoltas[id];
    const acum = acumularVoltas(hist);
    const paradas = replay.paradas(id);

    const segmento = (v: number) => {
      const ini = v >= 2 ? acum[v - 2] : 0;
      const pitAntes = paradas.find((p) => p.volta === v - 1);
      const pitNa = paradas.find((p) => p.volta === v);
      const sa = pitAntes === undefined ? 0 : (pitAntes.fim - ini) / hist[v - 1];
      const sb = pitNa === undefined ? 1 : geo.fE - geo.rampa;
      return {
        ta: pitAntes?.fim ?? ini,
        tb: pitNa?.inicio ?? acum[v - 1],
        sa,
        sb,
        a: Math.max(MARGEM_LOCAL, sa + FOLGA_PIT),
        b: Math.min(1 - MARGEM_LOCAL, sb - FOLGA_PIT),
      };
    };

    const chegada = replay.chegada(id);
    const voltasNaTela = chegada?.voltas ?? hist.length;
    const incidentes = r.eventos.filter(
      (e) =>
        e.jogadorId === id &&
        (e.tipo === 'erro-piloto' || e.tipo === 'problema-tecnico') &&
        e.volta <= voltasNaTela,
    );
    const voltas = new Set(incidentes.map((e) => e.volta));
    if (c.status === 'dnf') voltas.add(hist.length);

    const lista: Plano[] = [];
    for (const v of [...voltas].sort((x, y) => x - y)) {
      const seg = segmento(v);
      if (seg.b <= seg.a) degenerados++;
      intervalos.push(seg.b - seg.a);
      let { sb, tb, b } = seg;
      if (c.status === 'dnf' && v === hist.length) {
        const tipo = r.eventos.find((e) => e.jogadorId === id && e.volta === v && e.tipo.startsWith('quebra'))?.tipo;
        const g = seg.a + hash01(r.seed, `narracao:abandono:${id}:${v}:${tipo}`) * (seg.b - seg.a);
        const t = seg.ta + ((g - seg.sa) / (seg.sb - seg.sa)) * (seg.tb - seg.ta);
        dnf.set(id, { volta: v, g, t });
        sb = g;
        tb = t;
        b = g - FOLGA_PIT;
      }
      const daVolta = incidentes
        .filter((e) => e.volta === v)
        .map((e) => ({
          tipo: e.tipo,
          custo: e.custoMs,
          frac: seg.a + hash01(r.seed, `narracao:local:${id}:${v}:${e.tipo}`) * Math.max(0, b - seg.a),
        }))
        .sort((x, y) => x.frac - y.frac);
      const custo = daVolta.reduce((s, e) => s + e.custo, 0);
      if (tb - seg.ta - custo <= 0) {
        semTempo++;
        continue;
      }
      const ritmo = (sb - seg.sa) / (tb - seg.ta - custo);
      const plano: Plano = { volta: v, ta: seg.ta, tb, sa: seg.sa, sb, ritmo, paradas: [] };
      let t = seg.ta;
      let frac = seg.sa;
      for (const e of daVolta) {
        t += (e.frac - frac) / ritmo;
        plano.paradas.push({ ...e, ts: t, te: t + e.custo, ritmo });
        t += e.custo;
        frac = e.frac;
      }
      lista.push(plano);
    }
    planos.set(id, lista);
  }

  const novo = (id: string, t: number) => {
    const base = replay.progresso(id, r.historicoVoltas[id], t);
    const chegada = replay.chegada(id);
    if (chegada !== undefined && t >= chegada.instante) return base;
    const quebra = dnf.get(id);
    if (quebra !== undefined && t >= quebra.t) return (quebra.volta - 1 + quebra.g) / pista.voltas;
    const plano = planos.get(id)?.find((p) => t >= p.ta && t < p.tb);
    if (plano === undefined) return base;
    let frac = plano.sa;
    let inicio = plano.ta;
    for (const p of plano.paradas) {
      if (t < p.ts) break;
      frac = p.frac;
      inicio = p.te;
      if (t < p.te) return (plano.volta - 1 + p.frac) / pista.voltas;
    }
    return (plano.volta - 1 + frac + (t - inicio) * plano.ritmo) / pista.voltas;
  };

  return { replay, geo, planos, dnf, novo, intervalos, degenerados, semTempo };
}

describe('medição do PR 2d', () => {
  it('imprime as tabelas', () => {
    const pistas = dataset.pistas;
    const loadouts: Loadout[][] = [];
    for (let g = 0; g < N_GRIDS; g++) loadouts.push(draftarCampeonato(dataset, 7000 + g).loadouts);

    const custos: Record<string, number[]> = {};
    const custosSeco: Record<string, number> = {};
    const custosChuva: Record<string, number> = {};
    const eventosPorCorrida: number[] = [];
    const dnfPorCorrida: number[] = [];
    const dnfPorVolta: Record<string, number> = {};
    const dnfPorVoltaRelativa: Record<string, number> = {};
    const duracaoReal: Record<string, number[]> = { lenta: [], media: [], rapida: [] };
    const quadros: Record<string, number[]> = { lenta: [], media: [], rapida: [] };
    const dessincronia: number[] = [];
    const dessincroniaAtras: number[] = [];
    const posicoesPainel: Record<string, number> = {};
    const posicoesContrafactual: Record<string, number> = {};
    const adiantamento: number[] = [];
    const saltoOrdemVelho: number[] = [];
    const saltoOrdemNovo: number[] = [];
    const ritmoRelativo: number[] = [];
    const continuidade = { maiorQueda: 0, maiorAvanco: 0, passos: 0 };
    const larguraLivre: number[] = [];
    const paradosPit: number[] = [];
    const repetidasNaCorrida: number[] = [];
    const nomesRepetidos: number[] = [];
    const tamanhoNomes: number[] = [];
    let corridas = 0;
    let comChuva = 0;
    let incidentes = 0;
    let naVoltaDePit = 0;
    let naVoltaDepoisDoPit = 0;
    let doisNaVolta = 0;
    let invisiveis = 0;
    let doLider = 0;
    let liderCaiu = 0;
    let degenerados = 0;
    let semTempo = 0;
    let maxFronteira = 0;
    let caiuAtrasDe = 0;
    let entrouNosBoxes = 0;
    let msNarrar = 0;
    let chamadasNarrar = 0;
    const d = {
      total: 0,
      saltoVisivelHoje: 0,
      depoisDoFimHoje: 0,
      depoisDoFimNovo: 0,
      depoisDaBandeiraNovo: 0,
      voltaAposPit: 0,
      comErroNaVolta: 0,
      volta1: 0,
      ultimaVolta: 0,
      corridasSemTerminar: 0,
      lideravaAoQuebrar: 0,
    };
    const p = {
      punidos: 0,
      corridasComPunido: 0,
      eventoNaUltimaVolta: 0,
      caso1: 0,
      caso2: 0,
      caso3: 0,
      primeiroNaoOficialHoje: 0,
      primeiroNaoOficialCumprida: 0,
      carrosQueMudamVoltas: 0,
    };
    const voltaUltimoPit: number[] = [];
    const paradasDoPunido: Record<string, number> = {};
    const valoresPunicao: number[] = [];
    const piorFimS: Record<string, number> = { lenta: 0, media: 0, rapida: 0 };
    const piorFimHojeS: Record<string, number> = { lenta: 0, media: 0, rapida: 0 };
    const aumentoFimSim: number[] = [];
    const porPista: Record<string, unknown> = {};

    for (const pista of pistas) {
      const geo = geometriaDoBox(pista.id);
      const perdaEmpirica: number[] = [];
      const cabeStopAndGo = { ate2s: 0, total: 0 };
      const punicoesDaPista: number[] = [];
      const { razao } = limiteDoBox(pista.id);
      const trechoBase = (geo.fS - geo.fE) * pista.tempoBaseMs;
      const perdaGeometrica = (r: number) =>
        geo.comprimentoBox / ((r * geo.perimetro) / pista.tempoBaseMs) - trechoBase;
      let incidentesDaPista = 0;
      let dnfDaPista = 0;
      let punidosDaPista = 0;

      for (let k = 0; k < N_GRIDS; k++) {
        const seed = (7000 + k) * 1009 + pistas.indexOf(pista);
        const grid = simularQuali(dataset, loadouts[k], pista, seed);
        const r = simularCorrida(dataset, loadouts[k], pista, grid, seed);
        corridas++;
        if (r.chuva) comChuva++;
        const m = montarPlanos(r, pista);
        const { replay, novo } = m;
        degenerados += m.degenerados;
        semTempo += m.semTempo;
        larguraLivre.push(...m.intervalos);
        const tHoje = r.classificacao[0].tempoTotal;
        const escala = (nome: (typeof VELOCIDADES)[number]) => tHoje / (pista.voltas * MS_REPLAY_POR_VOLTA[nome]);
        const terminaram = r.classificacao.filter((c) => c.status === 'terminou');
        if (terminaram.length === 0) d.corridasSemTerminar++;

        eventosPorCorrida.push(r.eventos.length);
        dnfPorCorrida.push(r.classificacao.filter((c) => c.status === 'dnf').length);
        for (const e of r.eventos) {
          (custos[e.tipo] ??= []).push(e.custoMs);
          conta(r.chuva ? custosChuva : custosSeco, e.tipo);
        }

        // Narração de hoje: tempo por chamada, repetição, consequência.
        const t0 = performance.now();
        const narradas = narrarEventos(r);
        msNarrar += performance.now() - t0;
        chamadasNarrar++;
        caiuAtrasDe += narradas.filter((n) => n.caiuAtrasDe !== null).length;
        entrouNosBoxes += narradas.filter((n) => n.entrouNosBoxes).length;
        const frases = r.eventos
          .filter((e) => e.tipo === 'erro-piloto')
          .map((e) => narrarEvento(e, r.seed, r.chuva));
        repetidasNaCorrida.push(frases.length - new Set(frases).size);

        // Nomes de piloto no grid.
        const nomes = loadouts[k].map((l) => dataset.pilotosById.get(l.pilotoId)?.nome ?? '?');
        nomesRepetidos.push(nomes.length - new Set(nomes).size);
        if (k === 0) tamanhoNomes.push(...nomes.map((n) => n.length));

        // Incidentes no protótipo.
        const liderEm = (t: number) => {
          let melhor = '';
          let valor = -1;
          for (const c of r.classificacao) {
            const x = novo(c.jogadorId, t);
            if (x > valor) {
              valor = x;
              melhor = c.jogadorId;
            }
          }
          return melhor;
        };
        for (const c of r.classificacao) {
          const id = c.jogadorId;
          const hist = r.historicoVoltas[id];
          const acum = acumularVoltas(hist);
          const pits = r.voltasDePit[id] ?? [];
          const chegada = replay.chegada(id);
          const voltasNaTela = chegada?.voltas ?? hist.length;
          const doCarro = r.eventos.filter(
            (e) => e.jogadorId === id && (e.tipo === 'erro-piloto' || e.tipo === 'problema-tecnico'),
          );
          invisiveis += doCarro.filter((e) => e.volta > voltasNaTela).length;
          for (const plano of m.planos.get(id) ?? []) {
            if (plano.paradas.length > 1) doisNaVolta++;
            for (const e of plano.paradas) {
              incidentes++;
              incidentesDaPista++;
              // Ritmo do plano sobre o ritmo da mediana de voltas do carro: 1 = volta limpa.
              const mediana = [...hist].sort((x, y) => x - y)[Math.floor(hist.length / 2)];
              if (pits.includes(plano.volta) || pits.includes(plano.volta - 1)) ritmoRelativo.push(e.ritmo * mediana);
              if (pits.includes(plano.volta)) naVoltaDePit++;
              if (pits.includes(plano.volta - 1)) naVoltaDepoisDoPit++;
              for (const nome of VELOCIDADES) {
                const realMs = e.custo / escala(nome);
                duracaoReal[nome].push(realMs);
                quadros[nome].push(realMs / QUADRO_MS);
              }
              // Hoje o ticker revela no início da volta do LÍDER oficial.
              const hl = r.historicoVoltas[r.classificacao[0].jogadorId];
              const al = acumularVoltas(hl);
              const revelaHoje = plano.volta >= 2 ? (al[plano.volta - 2] ?? al.at(-1) ?? 0) : 0;
              const atraso = (e.ts - revelaHoje) / escala('media') / 1000;
              dessincronia.push(atraso);
              if (plano.volta < voltasNaTela) dessincroniaAtras.push(atraso);

              const antes = novo(id, e.ts - 1);
              const depois = novo(id, e.te);
              const semCusto = antes + (e.ritmo * e.custo) / pista.voltas;
              adiantamento.push((e.frac * e.custo) / (acum[plano.volta - 1] - (plano.volta >= 2 ? acum[plano.volta - 2] : 0)));
              let aFrente0 = 0;
              let aFrente1 = 0;
              let contrafactual = 0;
              for (const o of r.classificacao) {
                if (o.jogadorId === id) continue;
                if (novo(o.jogadorId, e.ts - 1) > antes) aFrente0++;
                const y = novo(o.jogadorId, e.te);
                if (y > depois) aFrente1++;
                if (y > depois && y <= semCusto) contrafactual++;
              }
              conta(posicoesPainel, Math.min(5, Math.max(0, aFrente1 - aFrente0)));
              conta(posicoesContrafactual, Math.min(5, contrafactual));
              if (aFrente0 === 0) {
                doLider++;
                if (liderEm(e.te) !== id) liderCaiu++;
              }
            }
          }

          // Fronteira de volta: o protótipo tem de cair no mesmo progresso do produto.
          for (let v = 1; v <= hist.length; v++) {
            if (m.dnf.get(id)?.volta === v) continue;
            const t = acum[v - 1];
            maxFronteira = Math.max(maxFronteira, Math.abs(novo(id, t) - replay.progresso(id, hist, t)));
          }

          if (c.status === 'dnf') {
            d.total++;
            dnfDaPista++;
            const v = hist.length;
            const soma = acum.at(-1) ?? 0;
            const quebra = m.dnf.get(id);
            conta(dnfPorVolta, v);
            conta(dnfPorVoltaRelativa, Math.min(9, Math.floor(((v - 1) / pista.voltas) * 10)));
            if (soma < replay.fim) d.saltoVisivelHoje++;
            else d.depoisDoFimHoje++;
            if (quebra !== undefined && quebra.t >= replay.fim) d.depoisDoFimNovo++;
            if (quebra !== undefined && quebra.t >= replay.bandeirada) d.depoisDaBandeiraNovo++;
            if (pits.includes(v - 1)) d.voltaAposPit++;
            if (r.eventos.some((e) => e.jogadorId === id && e.volta === v && e.tipo === 'erro-piloto')) d.comErroNaVolta++;
            if (v === 1) d.volta1++;
            if (v === pista.voltas) d.ultimaVolta++;
            if (quebra !== undefined && liderEm(quebra.t - 1) === id) d.lideravaAoQuebrar++;
          }

          // Pit real: perda do box sem parar e tempo parado.
          for (const parada of replay.paradas(id)) {
            const parado = parada.partida - parada.chegada;
            paradosPit.push(parado);
            const limpo = hist[parada.volta - 1] - custoPitEstimado(r, id, parada.volta);
            perdaEmpirica.push(parada.fim - parada.inicio - parado - (geo.fS - geo.fE + 2 * geo.rampa) * limpo);
          }
        }

        // Punição.
        const punidos = r.eventos.filter((e) => e.tipo === 'investigacao');
        if (punidos.length > 0) p.corridasComPunido++;
        const cumprida = new Map<string, { x: number; depoisDe: number }>();
        for (const e of punidos) {
          p.punidos++;
          punidosDaPista++;
          valoresPunicao.push(e.custoMs);
          punicoesDaPista.push(e.custoMs);
          if (e.volta === pista.voltas) p.eventoNaUltimaVolta++;
          const id = e.jogadorId;
          const chegada = replay.chegada(id);
          const voltasTela = chegada?.voltas ?? pista.voltas;
          const paradas = replay.paradas(id).filter((q) => chegada === undefined || q.inicio < chegada.instante);
          conta(paradasDoPunido, paradas.length);
          voltaUltimoPit.push((paradas.at(-1)?.volta ?? 0) / pista.voltas);
          for (let L = 1; L <= voltasTela; L++) {
            if (paradas.some((q) => q.volta > L)) p.caso1++;
            else if (L <= voltasTela - 2) p.caso2++;
            else p.caso3++;
          }
          const ultima = paradas.at(-1);
          if (ultima !== undefined) cumprida.set(id, { x: e.custoMs, depoisDe: ultima.partida });
          const perda = perdaGeometrica(razao);
          cabeStopAndGo.total++;
          if (e.custoMs - perda >= PISO_STOP_AND_GO_MS) cabeStopAndGo.ate2s++;
        }

        // Bandeirada e fim, com TODA punição cumprida no último pit (pior caso para o prazo).
        const soma = (id: string) => acumularVoltas(r.historicoVoltas[id]).at(-1) ?? 0;
        if (terminaram.length > 0) {
          const ordemNaPista = (somaDe: (id: string) => number) =>
            [...terminaram].sort((a, b) => somaDe(a.jogadorId) - somaDe(b.jogadorId))[0].jogadorId;
          if (ordemNaPista(soma) !== r.classificacao[0].jogadorId) p.primeiroNaoOficialHoje++;
          const somaCumprida = (id: string) => soma(id) + (cumprida.get(id)?.x ?? 0);
          if (ordemNaPista(somaCumprida) !== r.classificacao[0].jogadorId) p.primeiroNaoOficialCumprida++;
          const bandeirada = Math.min(...terminaram.map((c) => somaCumprida(c.jogadorId)));
          let fimNovo = 0;
          for (const c of terminaram) {
            const id = c.jogadorId;
            const hist = r.historicoVoltas[id];
            const serve = cumprida.get(id);
            let voltas = 0;
            let t = 0;
            for (let v = 1; v <= hist.length; v++) {
              const base = replay.instanteDoProgresso(id, hist, v);
              t = serve !== undefined && base >= serve.depoisDe ? base + serve.x : base;
              voltas = v;
              if (t >= bandeirada) break;
            }
            fimNovo = Math.max(fimNovo, t);
            if (voltas !== replay.chegada(id)?.voltas) p.carrosQueMudamVoltas++;
          }
          aumentoFimSim.push(fimNovo - replay.fim);
          for (const nome of VELOCIDADES) {
            piorFimS[nome] = Math.max(piorFimS[nome], fimNovo / escala(nome) / 1000);
            piorFimHojeS[nome] = Math.max(piorFimHojeS[nome], replay.fim / escala(nome) / 1000);
          }
        }

        // Salto de posição entre amostras de 1 s simulado: antes × protótipo.
        if (k < GRIDS_DA_ORDEM) {
          const ordem = (fn: (id: string, t: number) => number, t: number) => {
            const lista = r.classificacao.map((c) => ({ id: c.jogadorId, x: fn(c.jogadorId, t) }));
            lista.sort((a, b) => b.x - a.x || (a.id < b.id ? -1 : 1));
            return new Map(lista.map((c, i) => [c.id, i]));
          };
          const velho = (id: string, t: number) => replay.progresso(id, r.historicoVoltas[id], t);
          // Depois da volta 1 (em t = 0 todos empatam) e antes da bandeirada (quem chega empata).
          const inicio = (1.5 * replay.bandeirada) / pista.voltas;
          let anteriorV = ordem(velho, inicio);
          let anteriorN = ordem(novo, inicio);
          let piorV = 0;
          let piorN = 0;
          for (let t = inicio + PASSO_ORDEM_MS; t < replay.bandeirada; t += PASSO_ORDEM_MS) {
            const v = ordem(velho, t);
            const n = ordem(novo, t);
            for (const c of r.classificacao) {
              piorV = Math.max(piorV, Math.abs((v.get(c.jogadorId) ?? 0) - (anteriorV.get(c.jogadorId) ?? 0)));
              piorN = Math.max(piorN, Math.abs((n.get(c.jogadorId) ?? 0) - (anteriorN.get(c.jogadorId) ?? 0)));
            }
            anteriorV = v;
            anteriorN = n;
          }
          // Continuidade por carro: nenhuma queda de progresso e nenhum avanço acima do ritmo.
          for (const c of r.classificacao) {
            let anterior = novo(c.jogadorId, 0);
            for (let t = 250; t < replay.fim; t += 250) {
              const atual = novo(c.jogadorId, t);
              const passo = (atual - anterior) * pista.voltas;
              continuidade.maiorQueda = Math.max(continuidade.maiorQueda, -passo);
              continuidade.maiorAvanco = Math.max(continuidade.maiorAvanco, passo);
              continuidade.passos++;
              anterior = atual;
            }
          }
          saltoOrdemVelho.push(piorV);
          saltoOrdemNovo.push(piorN);
        }
      }

      const perda = resumo(perdaEmpirica.map((x) => x / 1000));
      // A geometria ignora as rampas: corrige pela diferença à perda empírica do limite vigente.
      const correcaoMs = perda.p50 * 1000 - perdaGeometrica(razao);
      const stopAndGoPorLimite = Object.fromEntries(
        [razao, 0.7, 0.85, 1].map((limite) => [
          limite,
          punicoesDaPista.filter((x) => x - perdaGeometrica(limite) - correcaoMs >= PISO_STOP_AND_GO_MS).length,
        ]),
      );
      porPista[pista.id] = {
        voltas: pista.voltas,
        tempoBaseS: pista.tempoBaseMs / 1000,
        razao,
        incidentes: incidentesDaPista,
        dnf: dnfDaPista,
        punidos: punidosDaPista,
        perdaBoxEmpiricaS: perda,
        perdaGeometricaS: Object.fromEntries([razao, 0.7, 0.85].map((x) => [x, perdaGeometrica(x) / 1000])),
        fE: geo.fE,
        fS: geo.fS,
        cabeStopAndGo,
        stopAndGoPorLimite,
      };
      console.log(
        `${pista.id} ${pista.voltas}v perda box s ${texto(perda)} | geom ${[razao, 0.7, 0.85].map((x) => `${x}:${f(perdaGeometrica(x) / 1000)}`).join(' ')} | stop&go cabe ${JSON.stringify(stopAndGoPorLimite)} de ${cabeStopAndGo.total}`,
      );
    }

    const custosS = Object.fromEntries(
      Object.entries(custos).map(([tipo, xs]) => [
        tipo,
        { ...resumo(xs.map((x) => x / 1000)), seco: custosSeco[tipo] ?? 0, chuva: custosChuva[tipo] ?? 0, porCorrida: xs.length / corridas },
      ]),
    );
    const totalCasos = p.caso1 + p.caso2 + p.caso3;
    const relatorio = {
      N_GRIDS,
      corridas,
      comChuva,
      constantes: {
        erro: [CORRIDA_CONFIG.erroCustoMinMs, CORRIDA_CONFIG.erroCustoMaxMs],
        problema: [CORRIDA_CONFIG.problemaCustoMinMs, CORRIDA_CONFIG.problemaCustoMaxMs],
        investigacao: [CORRIDA_CONFIG.investigacaoPenalidadeMinMs, CORRIDA_CONFIG.investigacaoPenalidadeMaxMs],
      },
      custosS,
      eventosPorCorrida: resumo(eventosPorCorrida),
      incidentes: {
        total: incidentes,
        invisiveisDepoisDaLinha: invisiveis,
        naVoltaDePit,
        naVoltaDepoisDoPit,
        doisNaVolta,
        larguraLivre: resumo(larguraLivre),
        degenerados,
        semTempo,
        doLider,
        liderCaiu,
        duracaoRealMs: Object.fromEntries(VELOCIDADES.map((n) => [n, resumo(duracaoReal[n])])),
        quadros60: Object.fromEntries(VELOCIDADES.map((n) => [n, resumo(quadros[n])])),
        tickerHojeAdiantaSMedia: resumo(dessincronia),
        tickerHojeAdiantaSMediaVoltaCompleta: resumo(dessincroniaAtras),
        posicoesPainel,
        posicoesContrafactual,
        adiantamentoEmVoltas: resumo(adiantamento),
        maxDiferencaNaFronteira: maxFronteira,
        continuidade250ms: continuidade,
        ritmoRelativoEmVoltaComPit: resumo(ritmoRelativo),
        saltoOrdem1sVelho: resumo(saltoOrdemVelho),
        saltoOrdem1sNovo: resumo(saltoOrdemNovo),
      },
      dnf: { ...d, porCorrida: resumo(dnfPorCorrida), dnfPorVolta, dnfPorVoltaRelativa },
      punicao: {
        ...p,
        valoresS: resumo(valoresPunicao.map((x) => x / 1000)),
        paradasDoPunido,
        voltaUltimoPitRelativa: resumo(voltaUltimoPit),
        casosPorInfracaoUniforme: { caso1: p.caso1 / totalCasos, caso2: p.caso2 / totalCasos, caso3: p.caso3 / totalCasos },
        aumentoFimS: resumo(aumentoFimSim.map((x) => x / 1000)),
        piorFimS,
        piorFimHojeS,
        margemS: Object.fromEntries(VELOCIDADES.map((n) => [n, TIMEOUT_S - piorFimS[n]])),
        paradoPitS: resumo(paradosPit.map((x) => x / 1000)),
      },
      narracao: {
        caiuAtrasDe,
        entrouNosBoxes,
        msPorChamadaNarrarEventos: msNarrar / chamadasNarrar,
        repetidasPorCorrida: resumo(repetidasNaCorrida),
        nomesRepetidosPorCorrida: resumo(nomesRepetidos),
        tamanhoNomes: resumo(tamanhoNomes),
      },
      porPista,
    };
    writeFileSync(SAIDA, JSON.stringify(relatorio, null, 1));
    console.log(JSON.stringify({ ...relatorio, porPista: undefined }, null, 1));
  }, 590000);
});
