/**
 * PR 3.1b — OS DOIS TESTES QUE VALEM A FASE 3 (portão do dev).
 *
 * 1. CONFORMIDADE — o redutor de turnos da rede (`deQuemEhAVez`, `ordemPeca`,
 *    `indicePeca`) bate com a engine, em ≥20 seeds, a CADA passo do draft.
 * 2. COMMUTATIVIDADE — os mesmos sorteios chegando em ordens diferentes
 *    produzem o mesmo `DraftState`. É isso que sustenta o servidor magro: a
 *    rede reordena, e a partida não pode depender da ordem de chegada.
 *
 * Por que este arquivo existe separado do `draft-rede.test.ts`: o risco central
 * do 3.1b, nas palavras do dev, é **regra de turno duplicada entre engine e
 * redutor, derivando em silêncio**. O redutor NÃO PODE chamar `aplicarEscolha`
 * — o servidor não carrega o dataset — então este é o único lugar onde os dois
 * se encontram. Um teste de unidade do redutor não fecharia esse buraco: ele
 * confirmaria o redutor contra si mesmo.
 *
 * 🔎 UMA DIFERENÇA DE FORMA, DECLARADA: `alvoHumano` (hotseat, `fluxo-local.ts`)
 * devolve UM id na fase sorteios — o primeiro humano em ordem de cadastro. Isso
 * é convenção de UI (decisão D1), documentada lá como não sendo regra de
 * engine: os sorteios de cada jogador são sub-streams independentes
 * (`draft:sorteios:<id>`), então a ordem entre humanos não muda nada. Online a
 * fase é genuinamente CONCORRENTE — 22 jogadores não podem esperar uns aos
 * outros —, então `deQuemEhAVez` devolve o CONJUNTO de quem pode jogar. A
 * conformidade é então verificada por IGUALDADE DE CONJUNTO nos dois sentidos
 * contra o `progresso` da engine, o que é estritamente mais forte que
 * "`alvoHumano` pertence ao conjunto" (que um redutor devolvendo os 22 humanos
 * passaria).
 */

import { describe, expect, it } from 'vitest';
import { criarDataset, type Dataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { aplicarEscolha, criarDraft, resolverBots, revelarRodada } from '../engine/draft';
import { encontrarEquipeAno, RODADAS_SORTEIO } from '../engine/draft-utils';
import { createRng, deriveSeed } from '../engine/rng';
import type { DraftState, EscolhaDraft, Jogador } from '../engine/types';
import { alvoHumano } from '../ui/fluxo-local';
import { congelarRoster } from './sala';
import { criarDraftRede, deQuemEhAVez, reduzirDraft, turnoCorrente } from './draft-rede';
import { QTD_JOGADORES, type EstadoDraftRede } from './tipos';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** 20 seeds — o mínimo que o dev exigiu no portão. */
const SEEDS = Array.from({ length: 20 }, (_, i) => 1 + i * 7919);

const T0 = 1_000_000;
/** O `agora` avança a cada evento: relógio parado esconderia bug de cronômetro. */
const PASSO_MS = 1_000;

function rosterDe(seed: number, qtdHumanos: number): Jogador[] {
  const humanos = Array.from({ length: qtdHumanos }, (_, i) => ({
    id: `humano-${String(i + 1).padStart(2, '0')}`,
    nome: `Jogador ${i + 1}`,
    pronto: true,
  }));
  return congelarRoster(humanos, seed, 'dificil');
}

const idsHumanos = (roster: Jogador[]): string[] =>
  roster.filter((j) => j.tipo === 'humano').map((j) => j.id);

/**
 * Uma escolha válida qualquer pro jogador da vez — determinística e sem RNG
 * próprio. Não é estratégia: o que este arquivo mede é TURNO, não decisão. É
 * também o que o teste usa para "jogar pelo ausente": no jogo de verdade isso
 * será `escolherBot` (semeado), e o ponto é o mesmo — precisa ser
 * determinístico e idêntico nos 22 clientes.
 */
function escolhaValida(state: DraftState, jogadorId: string, ds: Dataset): EscolhaDraft {
  const revelacao = revelarRodada(state, jogadorId);
  if (revelacao.fase === 'sorteios') {
    const naoPiloto = revelacao.slotsDisponiveis.find((s) => s !== 'piloto');
    if (naoPiloto !== undefined) return { tipo: 'componente', slot: naoPiloto };
    const equipeAno = encontrarEquipeAno(ds, revelacao.equipeAno);
    return { tipo: 'piloto', pilotoId: equipeAno.pilotos[0].id };
  }
  if (revelacao.fase === 'peca') {
    const reveladas = revelacao.pecasReveladas;
    if (!reveladas || reveladas.length === 0) {
      throw new Error(`escolhaValida: sem peças reveladas pra "${jogadorId}"`);
    }
    return { tipo: 'peca', pecaId: reveladas[0] };
  }
  throw new Error(`escolhaValida: nada a escolher pra "${jogadorId}" (fase ${revelacao.fase})`);
}

/** Quem a ENGINE considera apto a jogar agora — o espelho do `deQuemEhAVez`. */
function aptosNaEngine(state: DraftState, ausentes: Set<string>): string[] {
  if (state.fase === 'concluido') return [];
  if (state.fase === 'sorteios') {
    return state.jogadores
      .filter((j) => state.progresso[j.id].rodada <= RODADAS_SORTEIO && !ausentes.has(j.id))
      .map((j) => j.id);
  }
  const vez = state.ordemPeca[state.indicePeca];
  return vez === undefined || ausentes.has(vez) ? [] : [vez];
}

/**
 * O CONTRATO do cliente diante de um ausente, executado — é isto que o 3.3
 * terá de implementar. A rede zera o ausente e pula a casa dele; a engine não
 * sabe o que é ausência e ficaria esperando. Então o cliente joga por ele,
 * imediatamente, do mesmo jeito que `resolverBots` resolve os bots.
 */
function resolverAusentes(state: DraftState, ausentes: Set<string>, ds: Dataset): DraftState {
  let atual = state;
  let guarda = 0;
  while (atual.fase !== 'concluido') {
    if ((guarda += 1) > 500) throw new Error('resolverAusentes: laço travado');
    let alvo: string | undefined;
    if (atual.fase === 'sorteios') {
      alvo = [...ausentes].find((id) => atual.progresso[id].rodada <= RODADAS_SORTEIO);
    } else {
      const vez = atual.ordemPeca[atual.indicePeca];
      alvo = ausentes.has(vez) ? vez : undefined;
    }
    if (alvo === undefined) return atual;
    atual = resolverBots(aplicarEscolha(atual, ds, alvo, escolhaValida(atual, alvo, ds)), ds);
  }
  return atual;
}

const ordenado = (ids: string[]): string[] => [...ids].sort();

/**
 * Roda um draft inteiro com os dois modelos lado a lado, comparando a cada
 * passo. `abandonarEm` diz em que passo cada abandono acontece.
 */
function rodarConformidade(
  seed: number,
  qtdHumanos: number,
  abandonos: { naSorteiosAposPasso?: number; naPeca?: boolean } = {},
): {
  passos: number;
  alvosNaoNulos: number;
  ausentes: Set<string>;
  fasesDosAbandonos: string[];
} {
  const roster = rosterDe(seed, qtdHumanos);
  const humanos = idsHumanos(roster);

  let engine = resolverBots(criarDraft(dataset, roster, seed), dataset);
  let rede: EstadoDraftRede = criarDraftRede(roster, seed, T0);
  const ausentes = new Set<string>();

  // A `ordemPeca` é regra de jogo e mora na engine — a rede a recalcula com a
  // MESMA função (`calcularOrdemPeca`), não com uma cópia da fórmula.
  expect(rede.ordemPeca).toEqual(engine.ordemPeca);

  const rngOrdem = createRng(deriveSeed(seed, 'teste:ordem-de-chegada'));
  let passos = 0;
  let alvosNaoNulos = 0;
  const fasesDosAbandonos: string[] = [];

  while (engine.fase !== 'concluido') {
    passos += 1;
    if (passos > 500) throw new Error('conformidade: draft não terminou — laço travado');
    const agora = T0 + passos * PASSO_MS;

    // (a) A PREMISSA do modelo da rede: bots nunca ficam pendentes quando o
    // controle está com um humano. `resolverBots` resolve TODOS os bots da fase
    // sorteios antes de devolver o controle, e é só por isso que a rede pode
    // inicializar os bots já completos. Se isto quebrar, a transição de fase
    // dispara em momentos diferentes dos dois lados e todo o resto vira
    // decoração.
    if (engine.fase === 'sorteios') {
      const botsPendentes = engine.jogadores.filter(
        (j) => j.tipo === 'bot' && engine.progresso[j.id].rodada <= RODADAS_SORTEIO,
      );
      expect(botsPendentes, `seed ${seed}: bot pendente com o controle no humano`).toEqual([]);
    }

    // (b) Igualdade de CONJUNTO, nos dois sentidos.
    expect(ordenado(deQuemEhAVez(rede)), `seed ${seed}, passo ${passos}`).toEqual(
      ordenado(aptosNaEngine(engine, ausentes)),
    );

    // (c) As duas fases têm que andar juntas.
    expect(rede.fase, `seed ${seed}, passo ${passos}: fase`).toBe(engine.fase);

    // (d) Na fase peça o turno é ESTRITO: compara o ponteiro a cada evento, não
    // só nas bordas — um off-by-one no pulo de bots se realinha no fim e
    // passaria numa comparação só de extremidades. E TODO humano fora da vez é
    // recusado, não só um: um redutor com `ordemPeca` diferente mas fixa
    // recusaria o jogador do controle negativo em 21 de 22 casos por acaso.
    if (engine.fase === 'peca') {
      expect(rede.indicePeca, `seed ${seed}, passo ${passos}: indicePeca`).toBe(engine.indicePeca);
      const daVez = deQuemEhAVez(rede)[0];
      for (const outro of humanos.filter((id) => id !== daVez && !ausentes.has(id))) {
        const r = reduzirDraft(
          rede,
          { tipo: 'escolher', escolha: null, turnoEsperado: turnoCorrente(rede, outro) },
          outro,
          agora,
        );
        expect(r.erro, `seed ${seed}: "${outro}" jogou fora da vez e foi aceito`).not.toBeNull();
      }
    }

    // (e) Coerência com o hotseat. O contador impede que esta asserção passe
    // por nunca disparar — se `alvoHumano` passasse a devolver `null` sempre,
    // o `expect` final pegaria.
    const alvo = alvoHumano(engine, humanos.filter((id) => !ausentes.has(id)));
    if (alvo !== null) {
      alvosNaoNulos += 1;
      expect(deQuemEhAVez(rede)).toContain(alvo);
    }

    const aptos = deQuemEhAVez(rede);
    expect(aptos.length, `seed ${seed}, passo ${passos}: ninguém pode jogar`).toBeGreaterThan(0);

    // Abandono programado POR FASE, não por número mágico de passo: quantos
    // passos a fase sorteios tem depende do roster e dos abandonos anteriores,
    // e um índice fixo poderia nunca cair na fase peça — o teste passaria sem
    // exercitar o caminho que ele existe para exercitar. `fasesDosAbandonos`
    // é conferido pelo chamador.
    const abandonaAgora =
      (rede.fase === 'sorteios' &&
        abandonos.naSorteiosAposPasso !== undefined &&
        passos === abandonos.naSorteiosAposPasso &&
        aptos.length > 1) ||
      (rede.fase === 'peca' && abandonos.naPeca === true && !fasesDosAbandonos.includes('peca'));

    if (abandonaAgora) {
      const candidato = aptos[0];
      const r = reduzirDraft(rede, { tipo: 'abandonar' }, candidato, agora);
      expect(r.erro, `seed ${seed}: abandono de "${candidato}" recusado`).toBeNull();
      rede = r.estado;
      ausentes.add(candidato);
      fasesDosAbandonos.push(engine.fase);
      // O CONTRATO: o cliente joga pelo ausente no MESMO evento em que vê a
      // ausência no log. Atrasar deixaria os dois lados em fases diferentes.
      engine = resolverAusentes(engine, ausentes, dataset);
      continue;
    }

    // Joga alguém do conjunto — em ordem sorteada, pra exercitar a concorrência
    // da fase sorteios em vez de sempre o mesmo jogador.
    const jogadorId = rngOrdem.pick(aptos);
    const escolha = escolhaValida(engine, jogadorId, dataset);
    const r = reduzirDraft(
      rede,
      { tipo: 'escolher', escolha, turnoEsperado: turnoCorrente(rede, jogadorId) },
      jogadorId,
      agora,
    );
    expect(r.erro, `seed ${seed}, passo ${passos}: rede recusou "${jogadorId}"`).toBeNull();
    rede = r.estado;

    engine = resolverBots(aplicarEscolha(engine, dataset, jogadorId, escolha), dataset);
    engine = resolverAusentes(engine, ausentes, dataset);
  }

  expect(rede.fase, `seed ${seed}: rede não concluiu junto com a engine`).toBe('concluido');
  expect(deQuemEhAVez(rede)).toEqual([]);
  expect(Object.keys(engine.loadouts)).toHaveLength(QTD_JOGADORES);
  return { passos, alvosNaoNulos, ausentes, fasesDosAbandonos };
}

describe('CONFORMIDADE — o redutor de turnos bate com a engine (portão do dev)', () => {
  it.each(SEEDS)(
    'seed %i: deQuemEhAVez, ordemPeca e indicePeca conformes a cada passo do draft',
    (seed) => {
      const { passos, alvosNaoNulos } = rodarConformidade(seed, 4);
      expect(passos).toBeGreaterThan(20);
      // Anti-vacuidade da asserção (e): ela precisa ter disparado de fato.
      expect(alvosNaoNulos).toBeGreaterThan(0);
    },
  );

  it.each([2, 22])(
    'com %i humanos a conformidade se mantém (22 = nenhum bot, a borda da premissa)',
    (qtdHumanos) => {
      for (const seed of SEEDS.slice(0, 5)) {
        const { passos } = rodarConformidade(seed, qtdHumanos);
        expect(passos).toBeGreaterThan(qtdHumanos);
      }
    },
  );

  it.each(SEEDS.slice(0, 10))(
    'seed %i: com ABANDONO nas duas fases, os dois lados reconvergem',
    (seed) => {
      // Um abandono na fase sorteios e um na fase peça. É aqui que os dois
      // modelos são estruturalmente diferentes: a rede zera o ausente e pula a
      // casa dele; a engine não sabe o que é ausência. Sem este teste, o portão
      // nunca tocaria o caminho de ausência.
      const { ausentes, fasesDosAbandonos } = rodarConformidade(seed, 5, {
        naSorteiosAposPasso: 3,
        naPeca: true,
      });
      // MEDIDO, não presumido: os dois abandonos caíram em fases diferentes.
      // Sem esta asserção, um número de passo mal escolhido faria os dois
      // caírem na fase sorteios e o teste passaria sem exercitar a fase peça.
      expect(fasesDosAbandonos).toEqual(['sorteios', 'peca']);
      expect(ausentes.size).toBe(2);
    },
  );

  it('a rede RECUSA quem não é da vez na fase peça (o turno é estrito)', () => {
    const seed = SEEDS[0];
    const roster = rosterDe(seed, 4);
    let engine = resolverBots(criarDraft(dataset, roster, seed), dataset);
    let rede = criarDraftRede(roster, seed, T0);

    while (engine.fase === 'sorteios') {
      const jogadorId = deQuemEhAVez(rede)[0];
      const escolha = escolhaValida(engine, jogadorId, dataset);
      engine = resolverBots(aplicarEscolha(engine, dataset, jogadorId, escolha), dataset);
      rede = reduzirDraft(
        rede,
        { tipo: 'escolher', escolha, turnoEsperado: turnoCorrente(rede, jogadorId) },
        jogadorId,
        T0,
      ).estado;
    }

    expect(rede.fase).toBe('peca');
    const daVez = deQuemEhAVez(rede)[0];
    const outro = idsHumanos(roster).find((id) => id !== daVez)!;
    const r = reduzirDraft(
      rede,
      { tipo: 'escolher', escolha: null, turnoEsperado: turnoCorrente(rede, outro) },
      outro,
      T0,
    );
    expect(r.erro).toBe('nao-e-sua-vez');
    expect(r.estado).toBe(rede);
  });
});

describe('COMMUTATIVIDADE — mesmos sorteios, ordens diferentes, mesmo resultado', () => {
  /** Roda o draft inteiro na engine, guardando a sequência (jogador, escolha) por fase. */
  function roteiro(seed: number): {
    roster: Jogador[];
    sorteios: { jogadorId: string; escolha: EscolhaDraft }[];
    pecas: { jogadorId: string; escolha: EscolhaDraft }[];
    finalDosSorteios: DraftState;
    loadouts: DraftState['loadouts'];
  } {
    const roster = rosterDe(seed, 4);
    let engine = resolverBots(criarDraft(dataset, roster, seed), dataset);
    const sorteios: { jogadorId: string; escolha: EscolhaDraft }[] = [];
    const pecas: { jogadorId: string; escolha: EscolhaDraft }[] = [];
    let finalDosSorteios: DraftState | null = null;

    while (engine.fase !== 'concluido') {
      const eraSorteios = engine.fase === 'sorteios';
      const jogadorId = aptosNaEngine(engine, new Set())[0];
      const escolha = escolhaValida(engine, jogadorId, dataset);
      (eraSorteios ? sorteios : pecas).push({ jogadorId, escolha });
      engine = resolverBots(aplicarEscolha(engine, dataset, jogadorId, escolha), dataset);
      if (eraSorteios && engine.fase !== 'sorteios') finalDosSorteios = engine;
    }

    return {
      roster,
      sorteios,
      pecas,
      finalDosSorteios: finalDosSorteios!,
      loadouts: engine.loadouts,
    };
  }

  /**
   * Reordena os eventos **entre** jogadores, preservando a ordem **de cada**
   * jogador. É exatamente o que a rede faz e o que ela NÃO faz:
   * - o WebSocket entrega em ordem por conexão, então as escolhas de um mesmo
   *   jogador chegam na ordem em que ele as fez;
   * - o que varia é o intercalamento entre os 22.
   *
   * Uma permutação TOTAL não seria commutatividade, seria outra coisa: a
   * rodada 3 de um jogador só existe depois da 2 (a equipe/ano sorteada muda a
   * cada rodada), e a engine a rejeita — corretamente. Medido: com permutação
   * total, `aplicarEscolha` lança "piloto não pertence à equipe/ano sorteada"
   * em 20 de 20 seeds. O teste que passasse assim estaria medindo outra coisa.
   */
  function intercalar<T extends { jogadorId: string }>(itens: T[], seed: number): T[] {
    const filas = new Map<string, T[]>();
    for (const item of itens) {
      const fila = filas.get(item.jogadorId);
      if (fila) fila.push(item);
      else filas.set(item.jogadorId, [item]);
    }
    const rng = createRng(deriveSeed(seed, 'teste:intercalamento'));
    const saida: T[] = [];
    while (saida.length < itens.length) {
      const comPendencia = [...filas.keys()].filter((id) => filas.get(id)!.length > 0);
      saida.push(filas.get(rng.pick(comPendencia))!.shift()!);
    }
    return saida;
  }

  it.each(SEEDS)(
    'seed %i: permutar os sorteios não muda o DraftState nem os loadouts finais',
    (seed) => {
      const { roster, sorteios, pecas, finalDosSorteios, loadouts } = roteiro(seed);

      // Permutação REAL, não a identidade — senão o teste passaria vazio.
      const permutados = intercalar(sorteios, seed);
      expect(permutados.map((e) => e.jogadorId)).not.toEqual(sorteios.map((e) => e.jogadorId));

      let engine = resolverBots(criarDraft(dataset, roster, seed), dataset);
      for (const { jogadorId, escolha } of permutados) {
        engine = resolverBots(aplicarEscolha(engine, dataset, jogadorId, escolha), dataset);
      }
      expect(engine).toEqual(finalDosSorteios);

      // E os loadouts finais, jogando a fase peça na ordem obrigatória.
      for (const { jogadorId, escolha } of pecas) {
        engine = resolverBots(aplicarEscolha(engine, dataset, jogadorId, escolha), dataset);
      }
      expect(engine.loadouts).toEqual(loadouts);
      expect(engine.fase).toBe('concluido');
    },
  );

  it.each(SEEDS)(
    'seed %i: no redutor da rede, a ordem de chegada não muda o estado de turno',
    (seed) => {
      const { roster, sorteios } = roteiro(seed);

      /** Roda os eventos com o relógio ANDANDO — relógio parado esconderia o A2. */
      function rodar(eventos: typeof sorteios): EstadoDraftRede {
        let rede = criarDraftRede(roster, seed, T0);
        let passo = 0;
        for (const { jogadorId, escolha } of eventos) {
          passo += 1;
          const r = reduzirDraft(
            rede,
            { tipo: 'escolher', escolha, turnoEsperado: turnoCorrente(rede, jogadorId) },
            jogadorId,
            T0 + passo * PASSO_MS,
          );
          expect(r.erro, `rede recusou "${jogadorId}" na fase sorteios`).toBeNull();
          rede = r.estado;
        }
        return rede;
      }

      const direto = rodar(sorteios);
      const permutado = rodar(intercalar(sorteios, seed));

      // O `log` é append-only e guarda a ordem de CHEGADA — é ele, e o relógio
      // que depende dela, que legitimamente diferem. Tudo que DECIDE o jogo tem
      // que ser idêntico.
      expect(permutado.fase).toEqual(direto.fase);
      expect(permutado.rodada).toEqual(direto.rodada);
      expect(permutado.ordemPeca).toEqual(direto.ordemPeca);
      expect(permutado.indicePeca).toEqual(direto.indicePeca);
      expect(permutado.ausentes).toEqual(direto.ausentes);
      expect(ordenado(deQuemEhAVez(permutado))).toEqual(ordenado(deQuemEhAVez(direto)));
      expect(permutado.log).toHaveLength(direto.log.length);
    },
  );

  it.each(SEEDS.slice(0, 10))(
    'seed %i: intercalar um fluxo MISTO (escolha + ausência) também comuta',
    (seed) => {
      const { roster, sorteios } = roteiro(seed);
      const humanos = idsHumanos(roster);
      // O último a abandonar não pode ser o único restante, senão a fase vira
      // antes de os outros eventos chegarem; usa-se um só, e cedo.
      const desistente = humanos[humanos.length - 1];
      const semDesistente = sorteios.filter((e) => e.jogadorId !== desistente);

      function rodar(eventos: typeof sorteios): EstadoDraftRede {
        let rede = criarDraftRede(roster, seed, T0);
        let passo = 0;
        const r0 = reduzirDraft(rede, { tipo: 'abandonar' }, desistente, T0);
        expect(r0.erro).toBeNull();
        rede = r0.estado;
        for (const { jogadorId, escolha } of eventos) {
          passo += 1;
          const r = reduzirDraft(
            rede,
            { tipo: 'escolher', escolha, turnoEsperado: turnoCorrente(rede, jogadorId) },
            jogadorId,
            T0 + passo * PASSO_MS,
          );
          expect(r.erro, `recusou "${jogadorId}" com um ausente na sala`).toBeNull();
          rede = r.estado;
        }
        return rede;
      }

      const direto = rodar(semDesistente);
      const permutado = rodar(intercalar(semDesistente, seed));
      expect(permutado.fase).toEqual(direto.fase);
      expect(permutado.rodada).toEqual(direto.rodada);
      expect(permutado.indicePeca).toEqual(direto.indicePeca);
      expect(permutado.ausentes).toEqual([desistente]);
      expect(ordenado(deQuemEhAVez(permutado))).toEqual(ordenado(deQuemEhAVez(direto)));
    },
  );

  it('CONTROLE NEGATIVO: permutar a fase PEÇA é rejeitado (senão o redutor ignora ordemPeca)', () => {
    const seed = SEEDS[0];
    const { roster, sorteios, pecas } = roteiro(seed);

    let rede = criarDraftRede(roster, seed, T0);
    for (const { jogadorId, escolha } of sorteios) {
      const r = reduzirDraft(
        rede,
        { tipo: 'escolher', escolha, turnoEsperado: turnoCorrente(rede, jogadorId) },
        jogadorId,
        T0,
      );
      expect(r.erro).toBeNull();
      rede = r.estado;
    }
    expect(rede.fase).toBe('peca');

    // A fase peça tem ordem obrigatória: quem chegar fora dela é recusado.
    const foraDeOrdem = [...pecas].reverse();
    expect(foraDeOrdem[0].jogadorId).not.toBe(pecas[0].jogadorId);
    const r = reduzirDraft(
      rede,
      {
        tipo: 'escolher',
        escolha: foraDeOrdem[0].escolha,
        turnoEsperado: turnoCorrente(rede, foraDeOrdem[0].jogadorId),
      },
      foraDeOrdem[0].jogadorId,
      T0,
    );
    expect(r.erro).toBe('nao-e-sua-vez');
    expect(r.estado).toBe(rede);
  });
});
