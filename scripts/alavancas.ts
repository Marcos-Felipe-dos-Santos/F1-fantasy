/**
 * Medição comparativa de alavancas contra a dominância do draft (PR 6.3.1).
 *
 * Report-only: NENHUMA alavanca daqui está no jogo — este módulo só EXISTE
 * pra ajudar o dev a decidir, com números, se vale a pena implementar uma
 * mitigação (pit de meio de temporada, lastro de sucesso, temporada curta)
 * antes de investir em UI de campeonato. `src/` continua intocado; toda
 * lógica nova mora em `scripts/`. Zero dependência nova; toda aleatoriedade
 * vem do RNG semeado da engine (`createRng`/`deriveSeed`), nunca de
 * `Math.random()`.
 *
 * Convenção de correlação (igual ao PR 6.3, `medirDominanciaDraft`): ambos os
 * ranks usam 1 = MELHOR (1 = loadout mais forte; 1 = campeão). ρ = +1
 * significa "o draft decide tudo"; ρ = 0 significa "o draft não explica
 * nada". A força correlacionada nas métricas de `medirCenario` é SEMPRE a do
 * DRAFT (antes de qualquer pit) — a pergunta que o portão faz é "o draft
 * decide?", não "o loadout final decide?".
 */

import type { Dataset } from '../src/engine/dataset';
import { createRng, deriveSeed } from '../src/engine/rng';
import { acumularClassificacao, seedDaEtapa, simularEtapa } from '../src/engine/campeonato';
import { CORRIDA_CONFIG } from '../src/engine/corrida';
import { idComponenteDoSlot } from '../src/engine/draft-utils';
import type { EtapaCampeonato, Loadout, LinhaClassificacao, Piloto, Pista } from '../src/engine/types';
import { draftarCampeonato, rankMedio, scoreCarroPista, scoreCorridaPista, spearman } from './balance';

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Cenários — configuração das alavancas medidas.
// ---------------------------------------------------------------------------

/**
 * Forma da penalidade ao longo da classificação:
 * - `harmonica` (a que o dev propôs): o k-ésimo colocado perde `intensidade/k`.
 *   Decai rápido — com 22 jogadores, o líder perde X, o 2º X/2, mas do 5º em
 *   diante a penalidade já é menor que X/5. Na prática é um lastro de PÓDIO.
 * - `linear`: `intensidade * (n - k) / (n - 1)` — líder perde X, ÚLTIMO perde
 *   0, com gradiente constante. Espalha a pressão pela tabela inteira.
 *
 * A distinção existe porque a medição mostrou que a forma harmônica muda o
 * campeão em ~19% das temporadas e NÃO move o ρ: ρ correlaciona os 22
 * jogadores, e um lastro que só aperta o pódio quase não reordena o pelotão.
 * Sem a variante linear no relatório, o dev leria "lastro não funciona"
 * quando o número real é "lastro de pódio não move a métrica do pelotão".
 */
export type FormaLastro = 'harmonica' | 'linear';

export interface ConfigLastro {
  /** Penalidade do LÍDER como fração do score de corrida (0.07 = 7%). A distribuição pelo resto da tabela depende de `forma`. */
  intensidade: number;
  /** 1-based: primeira etapa em que o lastro vale. Etapas anteriores rodam sem penalidade nenhuma. */
  aPartirDaEtapa: number;
  /** Default `harmonica` (a forma proposta pelo dev). Ver `FormaLastro`. */
  forma?: FormaLastro;
}

export interface ConfigPit {
  /** 1-based: a troca acontece DEPOIS desta etapa (5 = após a 5ª). */
  aposEtapa: number;
}

export interface Cenario {
  nome: string;
  /** Nº de etapas do calendário, a partir de `dataset.pistas` (10 = cheia, 5 = curta). */
  nEtapas: number;
  pit?: ConfigPit;
  lastro?: ConfigLastro;
}

// ---------------------------------------------------------------------------
// Força de um loadout — combinada (quali + corrida), nas pistas efetivamente
// corridas (não necessariamente as 10 do calendário cheio).
// ---------------------------------------------------------------------------

/**
 * Força média de um loadout, sobre `pistas` (as pistas EFETIVAMENTE corridas
 * pelo cenário — numa temporada curta de 5 etapas, a força tem que ser medida
 * nessas 5, não nas 10 do calendário cheio, senão o portão mediria força
 * contra um calendário que nunca rodou). Média de
 * `(scoreCarroPista + scoreCorridaPista) / 2` — mesma fórmula de
 * `forcaMediaCombinada` do PR 6.3 (`scripts/balance.ts`), generalizada pro
 * conjunto de pistas do cenário.
 */
export function forcaCombinada(dataset: Dataset, loadout: Loadout, pistas: Pista[]): number {
  assert(pistas.length > 0, 'forcaCombinada: pistas não pode ser vazio');
  const soma = pistas.reduce(
    (acc, pista) =>
      acc + (scoreCarroPista(dataset, loadout, pista) + scoreCorridaPista(dataset, loadout, pista)) / 2,
    0,
  );
  return soma / pistas.length;
}

// ---------------------------------------------------------------------------
// Lastro de sucesso (alavanca C) — 100% via piloto.rit.
// ---------------------------------------------------------------------------

/**
 * Fator de penalidade por posição na classificação parcial. O líder (posição
 * 1) sempre recebe `intensidade`; a queda pelo resto da tabela segue
 * `lastro.forma` (ver `FormaLastro`). Isolada de propósito (testável com uma
 * classificação montada à mão, sem precisar simular nada).
 */
export function fatoresLastroDaClassificacao(
  classificacaoParcial: LinhaClassificacao[],
  lastro: ConfigLastro,
): Map<string, number> {
  const n = classificacaoParcial.length;
  const forma = lastro.forma ?? 'harmonica';
  const fatores = new Map<string, number>();
  classificacaoParcial.forEach((linha, idx) => {
    const k = idx + 1;
    // n === 1: não há gradiente possível; o único jogador é o líder e leva a
    // intensidade cheia (evita divisão por zero na forma linear).
    const fator =
      forma === 'harmonica'
        ? lastro.intensidade / k
        : n === 1
          ? lastro.intensidade
          : (lastro.intensidade * (n - k)) / (n - 1);
    fatores.set(linha.jogadorId, fator);
  });
  return fatores;
}

/**
 * Fator de lastro por jogador, ANTES de simular a etapa `i` (0-based). Regra
 * (decisão aprovada do plano):
 * - Sem `lastro` configurado, ou `(i + 1) < lastro.aPartirDaEtapa`, ou `i === 0`
 *   (não existe classificação parcial ainda — a 1ª etapa nunca tem lastro,
 *   mesmo que `aPartirDaEtapa` seja 1) ⇒ fator 0 pra todos.
 * - Senão, deriva a classificação parcial das etapas já corridas e aplica
 *   `fatoresLastroDaClassificacao`.
 */
function fatoresLastroPorEtapa(
  etapasJaCorridas: EtapaCampeonato[],
  jogadorIds: string[],
  lastro: ConfigLastro | undefined,
  i: number,
): Map<string, number> {
  if (!lastro || i + 1 < lastro.aPartirDaEtapa || i === 0) {
    return new Map(jogadorIds.map((id) => [id, 0]));
  }
  const classificacaoParcial = acumularClassificacao(etapasJaCorridas, jogadorIds);
  return fatoresLastroDaClassificacao(classificacaoParcial, lastro);
}

/**
 * Aplica o lastro de sucesso a UM piloto, numa pista concreta: clona o
 * registro de piloto do dataset com o `rit` BASE reduzido por
 * `Δrit = f * scoreCorridaPista(dataset, loadout, pista) / CORRIDA_CONFIG.pesoPiloto`.
 *
 * Por que isso funciona exatamente (álgebra, não aproximação): o score de
 * corrida é `S = pesoPiloto * rit_efetivo + resto`, onde `rit_efetivo =
 * rit_base + bonus_da_peça` (se a peça mirar `rit`; senão `bonus = 0`).
 * Substituindo `rit_base` por `rit_base - Δrit` e deixando a MESMA peça
 * reaplicar o MESMO bônus por cima (o loadout clonado só troca `pilotoId`,
 * não `pecaId`): `rit_efetivo_novo = rit_efetivo_original - Δrit`, logo
 * `S_novo = S - pesoPiloto * Δrit = S - f * S = (1 - f) * S` — EXATO,
 * independente de a peça mirar `rit` ou não (o bônus se cancela na álgebra).
 * O score de quali (`scoreCarroPista`, que usa `quali`, nunca `rit`) fica
 * intacto porque `quali` não é tocado pelo clone.
 *
 * Falha alto se o lastro empurrar `rit` pra negativo — sinal de intensidade
 * absurda, nunca deve virar nota negativa em silêncio.
 */
export function clonarPilotoComLastro(
  dataset: Dataset,
  loadout: Loadout,
  pista: Pista,
  f: number,
): { idClone: string; piloto: Piloto } {
  const pilotoBase = dataset.pilotosById.get(loadout.pilotoId);
  if (!pilotoBase) {
    throw new Error(`clonarPilotoComLastro: pilotoId "${loadout.pilotoId}" não encontrado no dataset`);
  }
  const scoreCorrida = scoreCorridaPista(dataset, loadout, pista);
  const deltaRit = (f * scoreCorrida) / CORRIDA_CONFIG.pesoPiloto;
  const ritNovo = pilotoBase.notas.rit - deltaRit;
  if (ritNovo < 0) {
    throw new Error(
      `clonarPilotoComLastro: lastro deixaria rit negativo (jogadorId="${loadout.jogadorId}", pista="${pista.id}", f=${f}, ritNovo=${ritNovo})`,
    );
  }
  const idClone = `${loadout.pilotoId}#lastro:${loadout.jogadorId}`;
  const piloto: Piloto = { ...pilotoBase, id: idClone, notas: { ...pilotoBase.notas, rit: ritNovo } };
  return { idClone, piloto };
}

// ---------------------------------------------------------------------------
// Pit de meio de temporada (alavanca B).
// ---------------------------------------------------------------------------

/** Percentis (Hazen) dos 6 tipos de componente, construídos uma vez por dataset. */
export interface TabelaPercentis {
  piloto: Map<string, number>;
  chassi: Map<string, number>;
  motor: Map<string, number>;
  estrategista: Map<string, number>;
  pit: Map<string, number>;
  peca: Map<string, number>;
}

/** Média aritmética simples das notas de um componente — mesma noção usada pelo bot `praGanhar` (`src/engine/bots.ts`, não exportada de lá). */
function mediaNotas(notas: Record<string, number>): number {
  const valores = Object.values(notas);
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

/** Percentil de Hazen: `(rankMedio(valores,'asc')[i] - 0.5) / n`. */
function percentisDe(itens: { id: string; valor: number }[]): Map<string, number> {
  const valores = itens.map((x) => x.valor);
  const ranks = rankMedio(valores, 'asc');
  const n = valores.length;
  const mapa = new Map<string, number>();
  itens.forEach((item, i) => {
    mapa.set(item.id, (ranks[i] - 0.5) / n);
  });
  return mapa;
}

/**
 * Constrói a tabela de percentis dos 6 tipos de componente do dataset
 * (piloto/chassi/motor/estrategista/pit por média de notas; peça por
 * `bonus - 0.5 * risco`, mesma métrica do bot `praGanhar`). Uma vez por
 * dataset, passada aos chamadores — sem cache escondido.
 */
export function criarTabelaPercentis(dataset: Dataset): TabelaPercentis {
  return {
    piloto: percentisDe(
      dataset.pilotos.map((p) => ({ id: p.id, valor: mediaNotas(p.notas as unknown as Record<string, number>) })),
    ),
    chassi: percentisDe(
      dataset.chassis.map((c) => ({ id: c.id, valor: mediaNotas(c.notas as unknown as Record<string, number>) })),
    ),
    motor: percentisDe(
      dataset.motores.map((m) => ({ id: m.id, valor: mediaNotas(m.notas as unknown as Record<string, number>) })),
    ),
    estrategista: percentisDe(
      dataset.estrategistas.map((e) => ({
        id: e.id,
        valor: mediaNotas(e.notas as unknown as Record<string, number>),
      })),
    ),
    pit: percentisDe(
      dataset.pits.map((p) => ({ id: p.id, valor: mediaNotas(p.notas as unknown as Record<string, number>) })),
    ),
    peca: percentisDe(dataset.pecas.map((p) => ({ id: p.id, valor: p.bonus - 0.5 * p.risco }))),
  };
}

type SlotTrocavel = 'piloto' | 'chassi' | 'motor' | 'estrategista' | 'pit' | 'peca';

/** Ordem fixa de desempate do slot mais fraco — o primeiro da lista vence em caso de empate de percentil. */
const ORDEM_SLOTS: readonly SlotTrocavel[] = ['piloto', 'chassi', 'motor', 'estrategista', 'pit', 'peca'];

interface Candidato {
  id: string;
  valor: number;
}

/** Maior valor vence; empate desempata por id em ordem lexicográfica (menor vence) — mesma lógica de `melhorCandidato` de `src/engine/bots.ts` (não exportada de lá; reimplementada aqui, scripts/-only). */
function melhorCandidato<T extends Candidato>(candidatos: T[]): T {
  return candidatos.reduce((atual, proximo) => {
    if (proximo.valor > atual.valor) return proximo;
    if (proximo.valor < atual.valor) return atual;
    return proximo.id < atual.id ? proximo : atual;
  });
}

function exigirPercentil(mapa: Map<string, number>, id: string, campo: string): number {
  const v = mapa.get(id);
  if (v === undefined) {
    throw new Error(`aplicarPitMeioTemporada: percentil de ${campo} ausente pro id "${id}"`);
  }
  return v;
}

/**
 * Pit de meio de temporada: cada jogador troca o componente MAIS FRACO do seu
 * loadout (menor percentil dentro do próprio slot, comparável entre slots de
 * tamanhos diferentes) por um sorteio novo aceito às cegas — é loteria, não
 * um segundo draft (se o jogador pudesse escolher o melhor de vários, a
 * alavanca amplificaria a dominância em vez de mitigar). A peça icônica ENTRA
 * na troca, respeitando o pool de 2 cópias.
 */
export function aplicarPitMeioTemporada(
  dataset: Dataset,
  tabela: TabelaPercentis,
  loadouts: Loadout[],
  copiasRestantes: Record<string, number>,
  seedBase: number,
): { loadouts: Loadout[]; copiasRestantes: Record<string, number>; trocasPorSlot: Record<string, number> } {
  const copias = { ...copiasRestantes };
  const trocasPorSlot: Record<string, number> = {};
  const jogadorIds = loadouts.map((l) => l.jogadorId);
  const loadoutPorJogador = new Map(loadouts.map((l) => [l.jogadorId, l]));

  const rngOrdem = createRng(deriveSeed(seedBase, 'pit:ordem'));
  const ordem = rngOrdem.shuffle(jogadorIds);

  for (const jogadorId of ordem) {
    const loadout = loadoutPorJogador.get(jogadorId);
    if (!loadout) {
      throw new Error(`aplicarPitMeioTemporada: loadout ausente pro jogador "${jogadorId}"`);
    }

    const percentisPorSlot: Record<SlotTrocavel, number> = {
      piloto: exigirPercentil(tabela.piloto, loadout.pilotoId, 'piloto'),
      chassi: exigirPercentil(tabela.chassi, loadout.chassiId, 'chassi'),
      motor: exigirPercentil(tabela.motor, loadout.motorId, 'motor'),
      estrategista: exigirPercentil(tabela.estrategista, loadout.estrategistaId, 'estrategista'),
      pit: exigirPercentil(tabela.pit, loadout.pitId, 'pit'),
      peca: exigirPercentil(tabela.peca, loadout.pecaId, 'peca'),
    };

    let slotMaisFraco: SlotTrocavel = ORDEM_SLOTS[0];
    let menorPercentil = percentisPorSlot[slotMaisFraco];
    for (const slot of ORDEM_SLOTS.slice(1)) {
      if (percentisPorSlot[slot] < menorPercentil) {
        menorPercentil = percentisPorSlot[slot];
        slotMaisFraco = slot;
      }
    }

    const rng = createRng(deriveSeed(seedBase, `pit:${jogadorId}`));
    let novoLoadout: Loadout;

    if (slotMaisFraco === 'peca') {
      const atual = loadout.pecaId;
      copias[atual] = (copias[atual] ?? 0) + 1;
      const disponiveis = dataset.pecas
        .filter((p) => p.id !== atual && (copias[p.id] ?? 0) > 0)
        .map((p) => p.id);
      if (disponiveis.length === 0) {
        throw new Error(`aplicarPitMeioTemporada: nenhuma peça disponível pra troca do jogador "${jogadorId}"`);
      }
      const novaPeca = rng.pick(disponiveis);
      copias[novaPeca] = (copias[novaPeca] ?? 0) - 1;
      novoLoadout = { ...loadout, pecaId: novaPeca };
    } else {
      const ea = rng.pick(dataset.equipeAnos);
      if (slotMaisFraco === 'piloto') {
        const titulares: Candidato[] = ea.pilotos.map((p) => ({
          id: p.id,
          valor: mediaNotas(p.notas as unknown as Record<string, number>),
        }));
        const melhor = melhorCandidato(titulares);
        novoLoadout = { ...loadout, pilotoId: melhor.id };
      } else if (slotMaisFraco === 'chassi') {
        novoLoadout = { ...loadout, chassiId: idComponenteDoSlot(ea, 'chassi') };
      } else if (slotMaisFraco === 'motor') {
        novoLoadout = { ...loadout, motorId: idComponenteDoSlot(ea, 'motor') };
      } else if (slotMaisFraco === 'estrategista') {
        novoLoadout = { ...loadout, estrategistaId: idComponenteDoSlot(ea, 'estrategista') };
      } else {
        novoLoadout = { ...loadout, pitId: idComponenteDoSlot(ea, 'pit') };
      }
    }

    loadoutPorJogador.set(jogadorId, novoLoadout);
    trocasPorSlot[slotMaisFraco] = (trocasPorSlot[slotMaisFraco] ?? 0) + 1;
  }

  const novosLoadouts = loadouts.map((l) => {
    const atualizado = loadoutPorJogador.get(l.jogadorId);
    if (!atualizado) {
      throw new Error(`aplicarPitMeioTemporada: loadout atualizado ausente pro jogador "${l.jogadorId}"`);
    }
    return atualizado;
  });

  return { loadouts: novosLoadouts, copiasRestantes: copias, trocasPorSlot };
}

// ---------------------------------------------------------------------------
// Laço de campeonato com alavancas.
// ---------------------------------------------------------------------------

/**
 * Simula um campeonato aplicando as alavancas do `cenario` (pit de meio de
 * temporada e/ou lastro de sucesso). Quando `cenario` não tem nenhuma das
 * duas, o laço é bit a bit idêntico a `simularCampeonato` da engine — mesma
 * seed por etapa (`seedDaEtapa`), mesmo dataset, mesmos loadouts —, o que
 * sustenta a comparação entre cenários (teste de anti-tautologia,
 * `scripts/alavancas.test.ts`).
 */
export function simularCampeonatoComAlavancas(
  dataset: Dataset,
  tabela: TabelaPercentis,
  loadoutsIniciais: Loadout[],
  copiasRestantes: Record<string, number>,
  pistas: Pista[],
  seedBase: number,
  cenario: Cenario,
): { classificacao: LinhaClassificacao[]; loadoutsFinais: Loadout[]; trocasPorSlot: Record<string, number> } {
  assert(loadoutsIniciais.length >= 1, 'simularCampeonatoComAlavancas: precisa de ao menos 1 loadout');
  assert(
    pistas.length === cenario.nEtapas,
    `simularCampeonatoComAlavancas: cenario.nEtapas (${cenario.nEtapas}) difere do nº de pistas fornecido (${pistas.length})`,
  );

  const jogadorIds = loadoutsIniciais.map((l) => l.jogadorId);
  let loadoutsAtuais = loadoutsIniciais;
  let copiasAtuais = copiasRestantes;
  const trocasPorSlot: Record<string, number> = {};

  // Dataset derivado (cópia rasa + `pilotosById` copiado), UMA vez por
  // campeonato, só quando o cenário tem lastro — perf: evita copiar o Map de
  // ~1542 pilotos quando o cenário não precisa dele. O array `dataset.pilotos`
  // fica com o conteúdo ORIGINAL de propósito: `resolverCarro` (e por
  // consequência `simularQuali`/`simularCorrida`) só leem `pilotosById`, nunca
  // o array — copiar 1542 entradas por etapa não teria leitor nenhum (trava:
  // `scripts/alavancas.test.ts`, teste 7).
  const datasetDerivado: Dataset | undefined = cenario.lastro
    ? { ...dataset, pilotosById: new Map(dataset.pilotosById) }
    : undefined;

  const etapas: EtapaCampeonato[] = [];

  for (let i = 0; i < pistas.length; i++) {
    if (cenario.pit && i === cenario.pit.aposEtapa) {
      const resultadoPit = aplicarPitMeioTemporada(dataset, tabela, loadoutsAtuais, copiasAtuais, seedBase);
      loadoutsAtuais = resultadoPit.loadouts;
      copiasAtuais = resultadoPit.copiasRestantes;
      for (const [slot, n] of Object.entries(resultadoPit.trocasPorSlot)) {
        trocasPorSlot[slot] = (trocasPorSlot[slot] ?? 0) + n;
      }
    }

    const fatores = fatoresLastroPorEtapa(etapas, jogadorIds, cenario.lastro, i);
    const algumF = [...fatores.values()].some((f) => f > 0);

    let datasetDaEtapa = dataset;
    let loadoutsDaEtapa = loadoutsAtuais;

    if (algumF) {
      if (!datasetDerivado) {
        throw new Error('simularCampeonatoComAlavancas: fator de lastro > 0 sem dataset derivado (invariante quebrada)');
      }
      loadoutsDaEtapa = loadoutsAtuais.map((loadout) => {
        const f = fatores.get(loadout.jogadorId) ?? 0;
        if (f === 0) return loadout;
        const { idClone, piloto } = clonarPilotoComLastro(dataset, loadout, pistas[i], f);
        datasetDerivado.pilotosById.set(idClone, piloto);
        return { ...loadout, pilotoId: idClone };
      });
      datasetDaEtapa = datasetDerivado;
    }

    const etapa = simularEtapa(datasetDaEtapa, loadoutsDaEtapa, pistas[i], seedDaEtapa(seedBase, pistas[i].id));
    etapas.push(etapa);
  }

  const classificacao = acumularClassificacao(etapas, jogadorIds);
  return { classificacao, loadoutsFinais: loadoutsAtuais, trocasPorSlot };
}

// ---------------------------------------------------------------------------
// Métricas do cenário.
// ---------------------------------------------------------------------------

export interface MetricasAlavanca {
  nome: string;
  rhoMedio: number;
  rhoStdDev: number;
  rhoMin: number;
  rhoMax: number;
  pCampeaoTop3: number;
  pForaTop5NoPodio: number;
  /** Só em cenários com pit: ρ contra a força PÓS-troca (mede se a decisão migrou do draft pra loteria). */
  rhoPosPit?: number;
  stdDevPontos: number;
  trocasPorSlot?: Record<string, number>;
  /**
   * `jogadorId` do campeão de cada campeonato, na ordem das seeds (0..n-1).
   * Existe pro relatório poder computar P(campeão ≠ baseline) — a medição que
   * revelou o efeito REAL do lastro harmônico, invisível no ρ: a alavanca
   * troca o campeão em ~19% das temporadas sem mover a correlação, porque ρ
   * pesa os 22 jogadores e o lastro harmônico só aperta o pódio.
   */
  campeoes: string[];
}

function exigirPosicao(mapa: Map<string, number>, id: string): number {
  const v = mapa.get(id);
  if (v === undefined) {
    throw new Error(`medirCenario: posição final ausente pro jogador "${id}"`);
  }
  return v;
}

function exigirRank(mapa: Map<string, number>, id: string): number {
  const v = mapa.get(id);
  if (v === undefined) {
    throw new Error(`medirCenario: rank de força ausente pro jogador "${id}"`);
  }
  return v;
}

function exigirLoadout(mapa: Map<string, Loadout>, id: string): Loadout {
  const v = mapa.get(id);
  if (!v) {
    throw new Error(`medirCenario: loadout final ausente pro jogador "${id}"`);
  }
  return v;
}

const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Mede `cenario` em cima de `nCampeonatos` campeonatos, com a MESMA
 * população de drafts (`draftarCampeonato(dataset, c)`, `c` = 0..n-1) usada
 * pelo portão de decisão do PR 6.3 — números comparáveis entre cenários e
 * com `medirDominanciaDraft`.
 */
export function medirCenario(
  dataset: Dataset,
  tabela: TabelaPercentis,
  cenario: Cenario,
  nCampeonatos: number,
): MetricasAlavanca {
  assert(
    cenario.nEtapas <= dataset.pistas.length,
    `medirCenario: cenario.nEtapas (${cenario.nEtapas}) maior que o nº de pistas do dataset (${dataset.pistas.length})`,
  );
  const pistas = dataset.pistas.slice(0, cenario.nEtapas);

  const rhos: number[] = [];
  const rhosPosPit: number[] = [];
  const campeoes: string[] = [];
  let countCampeaoTop3 = 0;
  let countForaTop5NoPodio = 0;
  let somaStdDevPontos = 0;
  const trocasAgregadas: Record<string, number> = {};

  for (let c = 0; c < nCampeonatos; c++) {
    const { loadouts, copiasRestantes } = draftarCampeonato(dataset, c);
    const jogadorIds = loadouts.map((l) => l.jogadorId);

    const { classificacao, loadoutsFinais, trocasPorSlot } = simularCampeonatoComAlavancas(
      dataset,
      tabela,
      loadouts,
      copiasRestantes,
      pistas,
      c,
      cenario,
    );

    if (cenario.pit) {
      for (const [slot, n] of Object.entries(trocasPorSlot)) {
        trocasAgregadas[slot] = (trocasAgregadas[slot] ?? 0) + n;
      }
    }

    const scoresDraft = loadouts.map((l) => forcaCombinada(dataset, l, pistas));
    const rankForcaArr = rankMedio(scoresDraft, 'desc');
    const rankForcaPorJogador = new Map(jogadorIds.map((id, i) => [id, rankForcaArr[i]]));

    const posicaoFinalPorJogador = new Map(classificacao.map((linha, i) => [linha.jogadorId, i + 1]));
    const posicoesFinais = jogadorIds.map((id) => exigirPosicao(posicaoFinalPorJogador, id));

    rhos.push(spearman(scoresDraft.map((s) => -s), posicoesFinais));

    if (cenario.pit) {
      const loadoutFinalPorJogador = new Map(loadoutsFinais.map((l) => [l.jogadorId, l]));
      const scoresPosPit = jogadorIds.map((id) =>
        forcaCombinada(dataset, exigirLoadout(loadoutFinalPorJogador, id), pistas),
      );
      rhosPosPit.push(spearman(scoresPosPit.map((s) => -s), posicoesFinais));
    }

    const campeaoId = classificacao[0].jogadorId;
    campeoes.push(campeaoId);
    if (exigirRank(rankForcaPorJogador, campeaoId) <= 3) countCampeaoTop3++;

    const podioIds = classificacao.slice(0, 3).map((l) => l.jogadorId);
    if (podioIds.some((id) => exigirRank(rankForcaPorJogador, id) > 5)) countForaTop5NoPodio++;

    const valoresPontos = classificacao.map((l) => l.pontos);
    const mediaPontos = media(valoresPontos);
    const variancia = valoresPontos.reduce((acc, v) => acc + (v - mediaPontos) ** 2, 0) / valoresPontos.length;
    somaStdDevPontos += Math.sqrt(variancia);
  }

  const rhoMedio = media(rhos);
  const varianciaRho = rhos.reduce((acc, r) => acc + (r - rhoMedio) ** 2, 0) / rhos.length;

  return {
    nome: cenario.nome,
    rhoMedio,
    rhoStdDev: Math.sqrt(varianciaRho),
    rhoMin: Math.min(...rhos),
    rhoMax: Math.max(...rhos),
    pCampeaoTop3: countCampeaoTop3 / nCampeonatos,
    pForaTop5NoPodio: countForaTop5NoPodio / nCampeonatos,
    rhoPosPit: cenario.pit ? media(rhosPosPit) : undefined,
    stdDevPontos: somaStdDevPontos / nCampeonatos,
    trocasPorSlot: cenario.pit ? trocasAgregadas : undefined,
    campeoes,
  };
}
