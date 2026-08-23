/**
 * `corridaDaSala` (PR 2/4 de "corrida online") — a fonte única que
 * `useSalaOnline` vai chamar. É esta função que faz os 22 clientes de uma
 * sala derivarem, cada um sozinho, a MESMA corrida a partir da MESMA
 * `(draft, seedCorrida)`.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';
import { classificacaoDaSala, corridaDaSala, etapasDaSala } from './corrida-online';
import { prepararCorrida } from './fluxo-corrida';
import { pistaSorteada } from '../engine/pista-sorteada';
import { calendarioSorteado, seedDaEtapa, simularEtapa } from '../engine/campeonato';
import type { Loadout } from '../engine/types';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Mesmo caminho de `fluxo-corrida.test.ts`: joga o humano até o draft concluir. */
function jogarDraftAteConcluir(seedTexto: string): DraftState {
  let atual = iniciarDraftSingle(dataset, seedTexto, 'facil');
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, ID_HUMANO);
    if (revelacao.fase !== 'sorteios') break;
    const slot = revelacao.slotsDisponiveis[0];
    const escolha: EscolhaDraft =
      slot === 'piloto'
        ? {
            tipo: 'piloto',
            pilotoId: (() => {
              const equipeAno = dataset.equipeAnos.find(
                (ea) => ea.equipe === revelacao.equipeAno.equipe && ea.ano === revelacao.equipeAno.ano,
              );
              if (!equipeAno) throw new Error('equipe/ano sorteada não encontrada no dataset de teste');
              return equipeAno.pilotos[0].id;
            })(),
          }
        : { tipo: 'componente', slot };
    atual = aplicarEscolhaHumano(dataset, atual, escolha);
  }
  const revelacao = revelarRodada(atual, ID_HUMANO);
  if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) {
    throw new Error('esperado fase peca com peças reveladas');
  }
  return aplicarEscolhaHumano(dataset, atual, { tipo: 'peca', pecaId: revelacao.pecasReveladas[0] });
}

/**
 * O mesmo caminho de `jogarDraftAteConcluir`, mas PARANDO na fase de peça — o
 * estado em que `loadouts` já está populado e `fase` ainda **não** é
 * `'concluido'`. É esse par que a guarda de `classificacaoDaSala` protege, e
 * sem ele o teste do aviso A1 passaria por vacuidade.
 */
function draftNaFaseDePeca(seedTexto: string): DraftState {
  let atual = iniciarDraftSingle(dataset, seedTexto, 'facil');
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, ID_HUMANO);
    if (revelacao.fase !== 'sorteios') break;
    const slot = revelacao.slotsDisponiveis[0];
    const escolha: EscolhaDraft =
      slot === 'piloto'
        ? {
            tipo: 'piloto',
            pilotoId: (() => {
              const equipeAno = dataset.equipeAnos.find(
                (ea) => ea.equipe === revelacao.equipeAno.equipe && ea.ano === revelacao.equipeAno.ano,
              );
              if (!equipeAno) throw new Error('equipe/ano sorteada não encontrada no dataset de teste');
              return equipeAno.pilotos[0].id;
            })(),
          }
        : { tipo: 'componente', slot };
    atual = aplicarEscolhaHumano(dataset, atual, escolha);
  }
  return atual;
}

describe('corridaDaSala', () => {
  it('é a fonte única e determinística: mesma (draft, seedCorrida) ⇒ mesma pista e mesmo resultado', () => {
    const draft1 = jogarDraftAteConcluir('corrida-sala-det');
    const draft2 = jogarDraftAteConcluir('corrida-sala-det');

    const a = corridaDaSala(dataset, draft1, 12345);
    const b = corridaDaSala(dataset, draft2, 12345);

    expect(a.pistaId).toBe(b.pistaId);
    expect(a.resultado.classificacao).toEqual(b.resultado.classificacao);
    expect(a.grid).toEqual(b.grid);
  });

  it('deriva a pista com pistaSorteada (não outro sorteio próprio)', () => {
    const draft = jogarDraftAteConcluir('corrida-sala-pista');
    const corrida = corridaDaSala(dataset, draft, 777);
    expect(corrida.pistaId).toBe(pistaSorteada(dataset, 777));
    expect(corrida.pista.id).toBe(corrida.pistaId);
  });

  it('🔑 SEM `pistaId`, a simulação usa a seed CRUA — a outra metade da bifurcação (aviso A3)', () => {
    // 🔴 **A revisão do 3.5.3 achou este buraco e a MEDIÇÃO confirmou:** o
    // docblock de `corridaDaSala` declara as duas semânticas de seed como
    // carga estrutural, mas só a metade da ETAPA estava travada. Medido: a
    // mutação `const seedDaSimulacao = seedDaEtapa(seed, idDaPista);`
    // (incondicional, matando o ternário) deixava a suíte **INTEIRA verde,
    // 1557/1557**, com `tsc` e `eslint` limpos — a corrida avulsa online
    // passaria a ser simulada com seed derivada, deixando de bater com a
    // avulsa OFFLINE, e nada acusaria.
    //
    // Simétrico do teste de conformidade das etapas: recompõe pelo caminho
    // independente (`prepararCorrida` com a seed crua) e exige igualdade.
    const draft = jogarDraftAteConcluir('avulsa-seed-crua');
    const seed = 987_654;
    const pistaId = pistaSorteada(dataset, seed);
    const esperada = prepararCorrida(dataset, draft, pistaId, seed);

    const avulsa = corridaDaSala(dataset, draft, seed);
    expect(avulsa.pistaId).toBe(pistaId);
    expect(avulsa.grid).toEqual(esperada.grid);
    expect(avulsa.resultado).toEqual(esperada.resultado);

    // 🔴 ANTI-VACUIDADE: a seed DERIVADA tem que produzir outra corrida na
    // MESMA pista. Sem isto, as duas semânticas poderiam coincidir e a
    // asserção acima passaria sem distinguir nada.
    const comoEtapa = corridaDaSala(dataset, draft, seed, pistaId);
    expect(comoEtapa.pistaId).toBe(pistaId);
    expect(comoEtapa.resultado).not.toEqual(esperada.resultado);
  });

  it('seedCorrida diferente ⇒ resultado diferente (a seed está sendo usada)', () => {
    const draft = jogarDraftAteConcluir('corrida-sala-seed');
    const a = corridaDaSala(dataset, draft, 1);
    const b = corridaDaSala(dataset, draft, 2);

    // Anti-vacuidade fraca: ou a pista muda, ou (mesma pista) a classificação muda.
    const diferente =
      a.pistaId !== b.pistaId || JSON.stringify(a.resultado.classificacao) !== JSON.stringify(b.resultado.classificacao);
    expect(diferente).toBe(true);
  });
});

/* ========================================================================== *
 * 🏆 PR 3.5.3 — CLIENTE MULTIETAPA (derivação pura do snapshot)
 *
 * 🔒 **Por que estes testes existem AQUI e não no hook:** o projeto não tem
 * `jsdom` nem `@testing-library` (medido em `package.json`), então nada que
 * more dentro de `useSalaOnline` pode ser alcançado por teste. O pareamento
 * `seedsAbertas[k]` ↔ `calendario[k]` é o coração do PR, e ele vive do lado
 * PURO justamente para que as mutações abaixo possam ser vistas vermelhas —
 * a lição da sexta instância do 3.5.2: **baseline que não alcança a guarda
 * não é baseline.**
 *
 * Cada bloco declara, e ASSERTA, a pré-condição que faz a mutação alvo ser
 * alcançada. Pré-condição suposta é justamente o que sai do lugar.
 * ========================================================================== */

/**
 * As seeds que o servidor sortearia e publicaria — literais fixos, sem RNG no
 * teste.
 *
 * 🔑 **A segunda seed foi ESCOLHIDA, não sorteada, e o motivo importa:** a
 * primeira candidata (`2415019033`) sorteava, por `pistaSorteada`, exatamente
 * a pista que o calendário já dava para a etapa 1. Nessa colisão a mutação
 * `M-pista` sobreviveria por acaso naquela etapa. Quem pegou isso foi a
 * asserção de PRÉ-CONDIÇÃO do teste da pista — que é o argumento inteiro a
 * favor de assertar pré-condição em vez de supô-la.
 */
const SEED_CALENDARIO = 1903767602;
const SEEDS_ETAPAS = [3187109758, 2415019035, 881203344, 4013558712, 190288147];

/**
 * Os loadouts na MESMA ordem em que `prepararCorrida` os monta
 * (`fluxo-corrida.ts`: `Object.entries(...).sort()` por `jogadorId`). É a
 * ordem em que os carros entram na simulação, então recompor a etapa de forma
 * independente exige reproduzi-la — não é detalhe de estilo.
 */
function loadoutsOrdenados(draft: DraftState): Loadout[] {
  return Object.entries(draft.loadouts)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, loadout]) => loadout);
}

describe('etapasDaSala — as etapas abertas derivadas do snapshot', () => {
  it('🔑 CONFORMIDADE BIT A BIT com a etapa OFFLINE (`simularEtapa` recomposto aqui)', () => {
    // 🔴 O teste que sustenta o PR. Recompõe a etapa de forma INDEPENDENTE —
    // pela engine, sem passar por nada de `corrida-online.ts` — e exige
    // igualdade bit a bit. É ele, e só ele, que mata `M-seed-omitida`: como
    // `prepararCorrida` tem default `seed = draftState.seed`, esquecer o 4º
    // argumento COMPILA LIMPO e produz uma corrida determinística e errada.
    const draft = jogarDraftAteConcluir('etapas-conformidade');
    const calendario = calendarioSorteado(dataset, SEED_CALENDARIO, 'curta');
    const etapas = etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS);

    expect(etapas).toHaveLength(SEEDS_ETAPAS.length);
    const loadouts = loadoutsOrdenados(draft);
    for (let k = 0; k < etapas.length; k++) {
      const pistaId = calendario[k];
      const pista = dataset.pistasById.get(pistaId);
      if (!pista) throw new Error(`pista "${pistaId}" fora do dataset de teste`);
      const esperada = simularEtapa(
        dataset,
        loadouts,
        pista,
        seedDaEtapa(SEEDS_ETAPAS[k], pistaId),
      );
      expect(etapas[k].pistaId, `etapa ${k}: pista`).toBe(esperada.pistaId);
      expect(etapas[k].grid, `etapa ${k}: grid`).toEqual(esperada.grid);
      expect(etapas[k].resultado, `etapa ${k}: resultado`).toEqual(esperada.resultado);
    }
  });

  it('🔑 a pista da etapa vem do CALENDÁRIO, nunca de `pistaSorteada` (pré-condição assertada)', () => {
    // Alvo: `M-pista` (trocar `calendario[k]` por `pistaSorteada(seed)`). Sem a
    // pré-condição abaixo a mutação poderia sobreviver por COINCIDÊNCIA — as
    // duas derivações caindo na mesma pista — e o teste passaria sem provar
    // nada. Por isso ela é assertada, não suposta.
    const draft = jogarDraftAteConcluir('etapas-pista');
    const calendario = calendarioSorteado(dataset, SEED_CALENDARIO, 'curta');

    const colidem = SEEDS_ETAPAS.filter((seed, k) => pistaSorteada(dataset, seed) === calendario[k]);
    expect(
      colidem,
      'PRÉ-CONDIÇÃO: nenhuma seed pode sortear justamente a pista do calendário — se colidir, a mutação sobrevive por acaso e o teste vira teatro',
    ).toEqual([]);

    const etapas = etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS);
    expect(etapas.map((e) => e.pistaId)).toEqual(calendario.slice(0, SEEDS_ETAPAS.length));
  });

  it('🔑 o par é POR ÍNDICE: `seedsAbertas[k]` casa com `calendario[k]` (pré-condição assertada)', () => {
    // Alvo: `M-indice` (`calendario[k]` → `calendario[0]`). Pré-condição: ao
    // menos duas etapas abertas e entradas de calendário DISTINTAS — com uma
    // etapa só, ou com pistas repetidas, o índice errado é indistinguível do
    // certo.
    const draft = jogarDraftAteConcluir('etapas-indice');
    const calendario = calendarioSorteado(dataset, SEED_CALENDARIO, 'curta');
    expect(calendario[0], 'PRÉ-CONDIÇÃO: as duas primeiras pistas têm que diferir').not.toBe(
      calendario[1],
    );

    const etapas = etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS.slice(0, 2));
    expect(etapas).toHaveLength(2);
    expect(etapas[0].pistaId).toBe(calendario[0]);
    expect(etapas[1].pistaId).toBe(calendario[1]);

    // E a seed também é pareada por índice: trocar as duas seeds de lugar tem
    // que mudar o resultado das duas etapas.
    const trocadas = etapasDaSala(dataset, draft, SEED_CALENDARIO, [
      SEEDS_ETAPAS[1],
      SEEDS_ETAPAS[0],
    ]);
    expect(trocadas[0].resultado).not.toEqual(etapas[0].resultado);
    expect(trocadas[1].resultado).not.toEqual(etapas[1].resultado);
  });

  it('🔑 NUNCA as etapas futuras: só o que está em `seedsAbertas` é computado', () => {
    // Alvo: `M-futuras` (derivar sobre `calendario.length` em vez de
    // `seedsAbertas.length`). Pré-condição: cursor NO MEIO — menos etapas
    // abertas do que o calendário tem. Com o campeonato inteiro aberto, a
    // mutação é invisível.
    const draft = jogarDraftAteConcluir('etapas-futuras');
    const calendario = calendarioSorteado(dataset, SEED_CALENDARIO, 'curta');
    const abertas = SEEDS_ETAPAS.slice(0, 2);
    expect(
      abertas.length,
      'PRÉ-CONDIÇÃO: o cursor precisa estar no MEIO do campeonato',
    ).toBeLessThan(calendario.length);

    const etapas = etapasDaSala(dataset, draft, SEED_CALENDARIO, abertas);
    expect(etapas).toHaveLength(2);
    expect(etapas.some((e) => e.pistaId === calendario[2])).toBe(false);
  });

  it('🔑 DERIVAÇÃO PURA: o mesmo snapshot devolve as mesmas etapas, e o cursor andando PRESERVA o prefixo', () => {
    // É a propriedade que faz o F5 funcionar sem estado local: quem recarrega
    // recompõe exatamente as etapas anteriores, e a etapa 0 não muda quando a
    // etapa 1 abre.
    const draft = jogarDraftAteConcluir('etapas-f5');
    const antes = etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS.slice(0, 1));
    const denovo = etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS.slice(0, 1));
    const depois = etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS.slice(0, 2));

    expect(denovo).toEqual(antes);
    expect(depois[0]).toEqual(antes[0]);
    expect(depois).toHaveLength(2);
  });

  it('devolve [] sem calendário ou sem seeds abertas (sala legado / draft em andamento), com anti-vacuidade', () => {
    const draft = jogarDraftAteConcluir('etapas-legado');
    expect(etapasDaSala(dataset, draft, null, SEEDS_ETAPAS)).toEqual([]);
    expect(etapasDaSala(dataset, draft, SEED_CALENDARIO, [])).toEqual([]);
    // 🔴 ANTI-VACUIDADE: o caso não-vazio no MESMO bloco. Sem ele, uma função
    // que devolvesse `[]` sempre passaria nas duas asserções acima.
    expect(etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS)).toHaveLength(5);
  });

  it('LANÇA quando o servidor abre mais etapas do que o calendário tem (nunca pista `undefined`)', () => {
    const draft = jogarDraftAteConcluir('etapas-incoerente');
    const demais = [...SEEDS_ETAPAS, 42, 43];
    expect(() => etapasDaSala(dataset, draft, SEED_CALENDARIO, demais)).toThrow(/etapasDaSala/);
  });
});

describe('classificacaoDaSala — a tabela acumulada do campeonato online', () => {
  it('🔑 acumula SÓ as etapas abertas, e os pontos batem com a soma recomposta etapa a etapa', () => {
    // Alvo: `M-classif` (acumular sobre uma fatia). Pré-condição assertada: a
    // segunda etapa tem que MOVER a tabela — se ela somasse zero ponto pra
    // todo mundo, cortar a etapa seria indistinguível de mantê-la.
    const draft = jogarDraftAteConcluir('classif-online');
    const etapas = etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS.slice(0, 2));

    const pontosPorEtapa = etapas.map((etapa) => {
      const soma = new Map<string, number>();
      for (const item of etapa.resultado.classificacao) {
        soma.set(item.jogadorId, (soma.get(item.jogadorId) ?? 0) + item.pontos);
      }
      return soma;
    });
    const pontuaramNaSegunda = [...pontosPorEtapa[1].values()].some((p) => p > 0);
    expect(
      pontuaramNaSegunda,
      'PRÉ-CONDIÇÃO: a etapa 1 precisa distribuir pontos, senão cortá-la não muda a tabela',
    ).toBe(true);

    const tabela = classificacaoDaSala(etapas, draft);
    for (const linha of tabela) {
      const esperado =
        (pontosPorEtapa[0].get(linha.jogadorId) ?? 0) + (pontosPorEtapa[1].get(linha.jogadorId) ?? 0);
      expect(linha.pontos, `pontos de ${linha.jogadorId}`).toBe(esperado);
    }

    // E uma etapa só produz uma tabela DIFERENTE — a acumulação é real.
    const soUma = classificacaoDaSala(etapas.slice(0, 1), draft);
    expect(soUma.map((l) => l.pontos)).not.toEqual(tabela.map((l) => l.pontos));
  });

  it('cobre todos os jogadores do draft, mesmo sem etapa nenhuma aberta', () => {
    const draft = jogarDraftAteConcluir('classif-vazia');
    const tabela = classificacaoDaSala([], draft);
    expect(tabela).toHaveLength(Object.keys(draft.loadouts).length);
    expect(tabela.every((l) => l.pontos === 0)).toBe(true);
  });

  it('🔑 devolve [] com o draft EM ANDAMENTO, mesmo com loadouts já populados (aviso A1)', () => {
    // 🔴 **A armadilha que a segunda passada da revisão achou.** `aplicarEscolha`
    // popula `loadouts` INCREMENTALMENTE, antes de `fase: 'concluido'`: medido,
    // na fase de peça deste mesmo draft já há loadouts, e sem a guarda esta
    // função devolvia uma linha zerada por jogador. Um painel do 3.5.4 aberto
    // com `classificacao.length > 0` mostraria a tabela do campeonato DURANTE O
    // DRAFT, cheia de zeros, antes de existir etapa nenhuma.
    //
    // 🔒 **A guarda mora na função PURA, não no hook** — a primeira tentativa de
    // conserto a pôs no `useMemo` e a mutação que a apagava SOBREVIVEU a tudo
    // (sem jsdom, guarda dentro do hook não tem baseline possível). Este teste é
    // o baseline que faltava.
    const emAndamento = draftNaFaseDePeca('classif-em-andamento');

    // 🔴 ANTI-VACUIDADE, e ela é o coração deste teste: sem estas duas
    // asserções, um draft sem loadouts nenhum passaria por vacuidade — que é
    // exatamente o caso em que a guarda não faz diferença.
    expect(emAndamento.fase, 'PRÉ-CONDIÇÃO: o draft tem que estar EM ANDAMENTO').not.toBe(
      'concluido',
    );
    expect(
      Object.keys(emAndamento.loadouts).length,
      'PRÉ-CONDIÇÃO: já tem que haver loadouts, senão a guarda não é exercida',
    ).toBeGreaterThan(0);

    expect(classificacaoDaSala([], emAndamento)).toEqual([]);

    // E com o draft CONCLUÍDO ela volta a devolver a linha por jogador — a
    // guarda discrimina por fase, não zera sempre.
    const concluido = jogarDraftAteConcluir('classif-concluido');
    expect(classificacaoDaSala([], concluido)).toHaveLength(
      Object.keys(concluido.loadouts).length,
    );
  });
});
