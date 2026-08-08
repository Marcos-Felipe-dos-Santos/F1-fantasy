/**
 * Testes do fluxo puro do modo Campeonato (PR 6.4) — baseline vermelho
 * escrito antes da implementação (`src/ui/fluxo-campeonato.ts` ainda não
 * existe quando este arquivo foi criado).
 *
 * Usa o dataset VIVO (`src/data/`), não a fixture congelada: nenhum teste
 * aqui depende de id específico de piloto/chassi/equipe — os loadouts são
 * construídos genericamente a partir de `dataset.equipeAnos` e
 * `dataset.pecas`, e os únicos valores "golden" (soma de voltas 68/132) vêm
 * de `pistas.json`, que é idêntico entre dataset vivo e fixture congelada.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnos from '../data/equipe-anos.json';
import pecas from '../data/pecas.json';
import pistas from '../data/pistas.json';
import { simularCampeonato } from '../engine/campeonato';
import { createRng } from '../engine/rng';
import type { Loadout } from '../engine/types';
import {
  avancarEtapa,
  calendarioPadrao,
  calendarioAnotado,
  calendarioSorteado,
  campeonatoConcluido,
  classificacaoApos,
  ehCampeonato,
  FORMATO_PADRAO,
  formatoDoCalendario,
  type FormatoPartida,
  type FormatoTemporada,
  iniciarCampeonato,
  mostraSeletorDePista,
  N_ETAPAS,
  resumoCampeonatoSalvo,
  ROTULO_FORMATO,
  simularOResto,
  variacaoDePosicao,
} from './fluxo-campeonato';

const dataset = criarDataset(equipeAnos, pecas, pistas);

/** Constrói `n` loadouts distintos a partir das primeiras `n` equipe/anos do dataset (genérico, não depende de ids fixos). */
function loadoutsDeTeste(n: number): Loadout[] {
  const peca = dataset.pecas[0];
  return Array.from({ length: n }, (_, i) => {
    const equipeAno = dataset.equipeAnos[i];
    return {
      jogadorId: `jogador-${i}`,
      pilotoId: equipeAno.pilotos[0].id,
      chassiId: equipeAno.chassi.id,
      motorId: equipeAno.motor.id,
      estrategistaId: equipeAno.estrategista.id,
      pitId: equipeAno.pit.id,
      pecaId: peca.id,
    };
  });
}

describe('calendarioPadrao', () => {
  it('sem argumento devolve 5 ids (default = FORMATO_PADRAO = "curta")', () => {
    expect(FORMATO_PADRAO).toBe('curta');
    const calendario = calendarioPadrao(dataset);
    expect(calendario).toHaveLength(5);
  });

  it('"completa" devolve 10 ids', () => {
    const calendario = calendarioPadrao(dataset, 'completa');
    expect(calendario).toHaveLength(10);
  });

  it('devolve os ids na ordem do dataset.pistas', () => {
    const calendario = calendarioPadrao(dataset, 'completa');
    expect(calendario).toEqual(dataset.pistas.map((p) => p.id));
  });

  // ATENÇÃO (cosmético 1 da revisão do 6.4): este teste NÃO trava a ordem do
  // calendário. As 10 pistas em ordem alfabética dão, nas 5 primeiras, exatamente
  // os mesmos 68 (imola 14 + interlagos 12 + monaco 15 + montreal 13 + monza 14),
  // então uma reordenação passaria batido aqui. Quem detecta ordem é o teste
  // "devolve os ids na ordem do dataset.pistas" acima — os dois são
  // complementares; não apague aquele achando que este cobre.
  it('soma de voltas: temporada curta = 68, completa = 135', () => {
    const somaVoltas = (ids: string[]) =>
      ids.reduce((soma, id) => soma + dataset.pistasById.get(id)!.voltas, 0);

    // A curta segue em 68 porque o Nürburgring é a 6ª pista em ordem alfabética
    // e fica de fora das 5 primeiras; só a completa sentiu o 10 → 13 voltas do
    // GP-Strecke (132 + 3).
    expect(somaVoltas(calendarioPadrao(dataset, 'curta'))).toBe(68);
    expect(somaVoltas(calendarioPadrao(dataset, 'completa'))).toBe(135);
  });

  it('lança para formato fora do union (save/URL adulterado), em vez de devolver o calendário inteiro', () => {
    // `slice(0, undefined)` devolveria as 10 pistas em silêncio.
    expect(() => calendarioPadrao(dataset, 'media' as FormatoTemporada)).toThrow(
      /formato inválido/,
    );
  });

  it('lança quando o dataset tem menos pistas que o formato, em vez de saturar', () => {
    const datasetCurto = { ...dataset, pistas: dataset.pistas.slice(0, 3) };
    expect(() => calendarioPadrao(datasetCurto, 'curta')).toThrow(/precisa de 5/);
  });

  it('N_ETAPAS reflete os tamanhos de cada formato', () => {
    expect(N_ETAPAS.curta).toBe(5);
    expect(N_ETAPAS.completa).toBe(10);
  });

  it('a temporada curta é prefixo (mesmos ids, na mesma ordem) da completa', () => {
    const curta = calendarioPadrao(dataset, 'curta');
    const completa = calendarioPadrao(dataset, 'completa');
    expect(completa.slice(0, curta.length)).toEqual(curta);
  });
});

/**
 * Baseline vermelho do PR 8.1 — escrito antes de `calendarioSorteado` existir.
 *
 * `calendarioPadrao` (ordem fixa do dataset) NÃO é tocado: ele é o calendário
 * dos testes e do harness, e o teste "devolve os ids na ordem do dataset.pistas"
 * acima trava essa ordem de propósito. O sorteio entra como função IRMÃ, e é
 * ela que a UI vai usar (Fase 8).
 */
describe('calendarioSorteado', () => {
  it('mesma seed devolve o mesmo calendário (determinismo)', () => {
    expect(calendarioSorteado(dataset, 42, 'completa')).toEqual(
      calendarioSorteado(dataset, 42, 'completa'),
    );
    expect(calendarioSorteado(dataset, 42)).toEqual(calendarioSorteado(dataset, 42));
  });

  it('seeds diferentes dão ordens diferentes (o sorteio de fato sorteia)', () => {
    // Não é garantia matemática pra QUALQUER par de seeds (duas permutações
    // podem coincidir), mas é asserção sobre estes dois valores concretos.
    expect(calendarioSorteado(dataset, 1, 'completa')).not.toEqual(
      calendarioSorteado(dataset, 2, 'completa'),
    );
  });

  it('não é a ordem do dataset (senão o sorteio seria decorativo)', () => {
    expect(calendarioSorteado(dataset, 42, 'completa')).not.toEqual(dataset.pistas.map((p) => p.id));
  });

  it('curta é PREFIXO da completa pra QUALQUER seed (invariante herdada de calendarioPadrao)', () => {
    // Vale por construção — `formato` não entra no `deriveSeed` nem no input do
    // `shuffle`, então as duas chamadas consomem o MESMO stream e só diferem no
    // corte. O loop trava a propriedade em vez de uma seed de sorte, e é ele
    // que mata a regressão "cortar antes de embaralhar" pra toda seed futura.
    for (let seed = 0; seed < 50; seed++) {
      const curta = calendarioSorteado(dataset, seed, 'curta');
      const completa = calendarioSorteado(dataset, seed, 'completa');
      expect(completa.slice(0, curta.length)).toEqual(curta);
    }
  });

  it('devolve o tamanho do formato, com ids DISTINTOS vindos do dataset', () => {
    const idsDoDataset = new Set(dataset.pistas.map((p) => p.id));
    for (const [formato, n] of [
      ['curta', 5],
      ['completa', 10],
    ] as const) {
      const calendario = calendarioSorteado(dataset, 99, formato);
      expect(calendario).toHaveLength(n);
      expect(new Set(calendario).size).toBe(n);
      for (const id of calendario) expect(idsDoDataset.has(id)).toBe(true);
    }
  });

  it('a completa é uma PERMUTAÇÃO do dataset — nenhuma pista some, nenhuma duplica', () => {
    // PRECONDIÇÃO EXPLÍCITA (aviso 2 da revisão): só é permutação porque o
    // dataset tem exatamente 10 pistas. Se uma 11ª entrar, a completa passa a
    // ser um SUBCONJUNTO de 10 e este teste falha por premissa velha, não por
    // bug de calendário — o assert abaixo faz a falha dizer isso.
    expect(dataset.pistas).toHaveLength(N_ETAPAS.completa);
    expect([...calendarioSorteado(dataset, 123, 'completa')].sort()).toEqual(
      dataset.pistas.map((p) => p.id).sort(),
    );
  });

  it('default é o formato curto, igual a calendarioPadrao', () => {
    expect(calendarioSorteado(dataset, 42)).toEqual(calendarioSorteado(dataset, 42, FORMATO_PADRAO));
    expect(calendarioSorteado(dataset, 42)).toHaveLength(N_ETAPAS.curta);
  });

  it('herda os dois guards de calendarioPadrao: formato fora do union e dataset pequeno', () => {
    expect(() => calendarioSorteado(dataset, 42, 'media' as FormatoTemporada)).toThrow(
      /formato inválido/,
    );
    const datasetCurto = { ...dataset, pistas: dataset.pistas.slice(0, 3) };
    expect(() => calendarioSorteado(datasetCurto, 42, 'curta')).toThrow(/precisa de 5/);
  });

  it('o sorteio vive num namespace de seed próprio — não repete o embaralhamento de outro consumidor da mesma seed', () => {
    // `seedDaEtapa` usa o namespace `camp:<pistaId>`. Se o calendário usasse a
    // seed CRUA, dois usos diferentes da mesma seed base ficariam acoplados.
    // Guarda concreta: o calendário da seed N não pode ser igual a embaralhar
    // as pistas com a seed crua N.
    const cru = createRng(42).shuffle(dataset.pistas.map((p) => p.id));
    expect(calendarioSorteado(dataset, 42, 'completa')).not.toEqual(cru);
  });

  it('campeonato sorteado roda de ponta a ponta e dá a MESMA classificação que o calendário na ordem do dataset', () => {
    // A pontuação é comutativa e `seedDaEtapa` depende só do id da pista
    // (doc de `simularCampeonato`): embaralhar o calendário muda a ORDEM das
    // etapas, nunca o campeão. Este teste é a guarda dessa promessa.
    // Mesma precondição do teste de permutação: com 11 pistas os dois
    // calendários disputariam CONJUNTOS diferentes de corridas e a divergência
    // seria legítima (aviso 2 da revisão).
    expect(dataset.pistas).toHaveLength(N_ETAPAS.completa);
    const loadouts = loadoutsDeTeste(4);
    const sorteado = iniciarCampeonato(
      dataset,
      loadouts,
      42,
      calendarioSorteado(dataset, 42, 'completa'),
    );
    const padrao = iniciarCampeonato(dataset, loadouts, 42, calendarioPadrao(dataset, 'completa'));
    expect(classificacaoApos(sorteado, 10)).toEqual(classificacaoApos(padrao, 10));
    expect(sorteado.calendario).not.toEqual(padrao.calendario);
  });
});

/**
 * PR 8.4-mínimo — as decisões da `TelaInicio` moram aqui, não no `.tsx`.
 * O projeto não tem jsdom (ver cabeçalho de `persistencia.test.ts`): nenhum
 * componente é testado diretamente, então a regra condicional pedida pelo dev
 * ("o seletor de Pista some nos campeonatos") só vira teste se for função pura.
 */
describe('formato da partida (TelaInicio)', () => {
  it('ehCampeonato separa a corrida única dos dois campeonatos', () => {
    expect(ehCampeonato('unica')).toBe(false);
    expect(ehCampeonato('curta')).toBe(true);
    expect(ehCampeonato('completa')).toBe(true);
  });

  it('o seletor de pista SÓ aparece na corrida única', () => {
    expect(mostraSeletorDePista('unica')).toBe(true);
    expect(mostraSeletorDePista('curta')).toBe(false);
    expect(mostraSeletorDePista('completa')).toBe(false);
  });

  it('há rótulo pros três formatos, e os dois campeonatos anunciam o número de pistas', () => {
    const formatos: FormatoPartida[] = ['unica', 'curta', 'completa'];
    for (const formato of formatos) expect(ROTULO_FORMATO[formato]).toBeTruthy();
    expect(ROTULO_FORMATO.curta).toContain(String(N_ETAPAS.curta));
    expect(ROTULO_FORMATO.completa).toContain(String(N_ETAPAS.completa));
  });

  it('os valores de campeonato passam DIRETO pra calendarioSorteado, sem tradução', () => {
    // É o motivo de `FormatoPartida` ser `'unica' | FormatoTemporada` em vez
    // de um union novo: nenhuma tabela de conversão pra sair de sincronia.
    const formato: FormatoPartida = 'curta';
    if (!ehCampeonato(formato)) throw new Error('esperado campeonato');
    expect(calendarioSorteado(dataset, 42, formato)).toHaveLength(N_ETAPAS.curta);
  });
});

describe('resumoCampeonatoSalvo (botão "Continuar campeonato")', () => {
  it('deriva o formato do TAMANHO do calendário — o save não guarda esse campo', () => {
    expect(formatoDoCalendario(calendarioSorteado(dataset, 1, 'curta'))).toBe('curta');
    expect(formatoDoCalendario(calendarioSorteado(dataset, 1, 'completa'))).toBe('completa');
  });

  it('descreve onde o jogador parou, em linguagem 1-based de UI', () => {
    const calendario = calendarioSorteado(dataset, 42, 'curta');
    // `etapaAtual` 0-based = 2 ⇒ já correu 2, está PRESTES a correr a 3ª.
    expect(resumoCampeonatoSalvo(calendario, 2)).toEqual({
      formato: 'curta',
      corridaAtual: 3,
      totalCorridas: 5,
      concluido: false,
    });
  });

  it('campeonato recém-começado aponta pra corrida 1, não pra corrida 0', () => {
    expect(resumoCampeonatoSalvo(calendarioSorteado(dataset, 42, 'completa'), 0)).toMatchObject({
      corridaAtual: 1,
      totalCorridas: 10,
      concluido: false,
    });
  });

  it('campeonato CONCLUÍDO satura no total em vez de anunciar "corrida 6 de 5"', () => {
    expect(resumoCampeonatoSalvo(calendarioSorteado(dataset, 42, 'curta'), 5)).toEqual({
      formato: 'curta',
      corridaAtual: 5,
      totalCorridas: 5,
      concluido: true,
    });
  });

  it('devolve null (não lança) pra save irreconhecível — a tela só não mostra o botão', () => {
    // Tamanho que não corresponde a formato nenhum: save adulterado ou de um
    // dataset com outro número de pistas.
    expect(resumoCampeonatoSalvo(['pista-monza', 'pista-imola', 'pista-spa'], 1)).toBeNull();
    expect(resumoCampeonatoSalvo([], 0)).toBeNull();
    // Cursor fora de faixa, pelos dois lados.
    const calendario = calendarioSorteado(dataset, 42, 'curta');
    expect(resumoCampeonatoSalvo(calendario, -1)).toBeNull();
    expect(resumoCampeonatoSalvo(calendario, 6)).toBeNull();
    expect(resumoCampeonatoSalvo(calendario, 1.5)).toBeNull();
  });
});

describe('iniciarCampeonato', () => {
  it('pré-simula o campeonato inteiro: etapas.length === calendario.length, etapaAtual === 0', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 42, calendario);

    expect(estado.etapaAtual).toBe(0);
    expect(estado.etapas).toHaveLength(calendario.length);
    expect(estado.calendario).toEqual(calendario);
    expect(estado.seed).toBe(42);
  });

  it('é determinística: mesma seed + mesmos loadouts ⇒ estado idêntico', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const estado1 = iniciarCampeonato(dataset, loadouts, 42, calendario);
    const estado2 = iniciarCampeonato(dataset, loadouts, 42, calendario);

    expect(estado2).toEqual(estado1);
  });

  it('as 5 primeiras etapas da temporada curta são idênticas às 5 primeiras da completa (mesma seed)', () => {
    const loadouts = loadoutsDeTeste(4);
    const curta = calendarioPadrao(dataset, 'curta');
    const completa = calendarioPadrao(dataset, 'completa');

    const estadoCurta = iniciarCampeonato(dataset, loadouts, 7, curta);
    const estadoCompleta = iniciarCampeonato(dataset, loadouts, 7, completa);

    expect(estadoCompleta.etapas.slice(0, curta.length)).toEqual(estadoCurta.etapas);
  });

  it('lança erro alto para pista inexistente no dataset (nunca undefined silencioso)', () => {
    const loadouts = loadoutsDeTeste(4);
    expect(() =>
      iniciarCampeonato(dataset, loadouts, 1, ['pista-inexistente']),
    ).toThrow(/pista-inexistente/);
  });

  it('lança erro para calendário vazio', () => {
    const loadouts = loadoutsDeTeste(4);
    expect(() => iniciarCampeonato(dataset, loadouts, 1, [])).toThrow();
  });

  it('lança erro para pista duplicada no calendário (mensagem clara)', () => {
    const loadouts = loadoutsDeTeste(4);
    expect(() =>
      iniciarCampeonato(dataset, loadouts, 1, ['pista-monza', 'pista-monza']),
    ).toThrow(/pista-monza/);
  });
});

describe('avancarEtapa', () => {
  it('é pura: não muta o estado recebido e devolve etapaAtual + 1', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const inicial = iniciarCampeonato(dataset, loadouts, 42, calendario);
    const copiaDoInicial = structuredClone(inicial);

    const proximo = avancarEtapa(inicial);

    expect(inicial).toEqual(copiaDoInicial);
    expect(proximo.etapaAtual).toBe(1);
    expect(proximo).not.toBe(inicial);
  });

  it('satura em calendario.length (idempotente, não lança)', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    let estado = iniciarCampeonato(dataset, loadouts, 42, calendario);

    for (let i = 0; i < calendario.length + 3; i++) {
      estado = avancarEtapa(estado);
    }

    expect(estado.etapaAtual).toBe(calendario.length);
    expect(campeonatoConcluido(estado)).toBe(true);

    const alemDoFim = avancarEtapa(estado);
    expect(alemDoFim.etapaAtual).toBe(calendario.length);
  });
});

describe('simularOResto', () => {
  it('salta etapaAtual direto pro fim', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const inicial = iniciarCampeonato(dataset, loadouts, 42, calendario);

    const final = simularOResto(inicial);

    expect(final.etapaAtual).toBe(calendario.length);
    expect(campeonatoConcluido(final)).toBe(true);
  });
});

describe('campeonatoConcluido', () => {
  it('false no início, true no fim', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const inicial = iniciarCampeonato(dataset, loadouts, 42, calendario);

    expect(campeonatoConcluido(inicial)).toBe(false);
    expect(campeonatoConcluido(simularOResto(inicial))).toBe(true);
  });
});

describe('classificacaoApos', () => {
  it('n = 0 ⇒ todos com 0 ponto', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 42, calendario);

    const classificacao = classificacaoApos(estado, 0);

    expect(classificacao).toHaveLength(loadouts.length);
    for (const linha of classificacao) {
      expect(linha.pontos).toBe(0);
      expect(linha.vitorias).toBe(0);
      expect(linha.podios).toBe(0);
    }
  });

  it('n = calendario.length ⇒ igual à classificação do ResultadoCampeonato pré-simulado', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const pistasResolvidas = calendario.map((id) => dataset.pistasById.get(id)!);
    const referencia = simularCampeonato(dataset, loadouts, pistasResolvidas, 42);

    const estado = iniciarCampeonato(dataset, loadouts, 42, calendario);
    const classificacao = classificacaoApos(estado, calendario.length);

    expect(classificacao).toEqual(referencia.classificacao);
  });

  it('classificação evolui etapa a etapa (n=1 difere de n=2 depois de etapas distintas)', () => {
    const loadouts = loadoutsDeTeste(4);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 42, calendario);

    const apos1 = classificacaoApos(estado, 1);
    const apos2 = classificacaoApos(estado, 2);

    expect(apos1).not.toEqual(apos2);
  });

  // Aviso 1 da revisão do 6.4: `slice` aceita tudo e devolve tabela errada em
  // SILÊNCIO. Cada caso abaixo tinha um resultado plausível-porém-errado antes
  // do guard; o `NaN` era o pior (temporada inteira zerada como se fosse
  // estado legítimo).
  it.each([
    ['negativo (era "todas menos a última")', -1],
    ['NaN (era temporada zerada em silêncio)', NaN],
    ['fracionário (era truncado)', 2.7],
    ['maior que o calendário (era saturado)', 999],
  ])('classificacaoApos lança para nEtapas %s', (_rotulo, nEtapas) => {
    const estado = iniciarCampeonato(dataset, loadoutsDeTeste(4), 42, calendarioPadrao(dataset));
    expect(() => classificacaoApos(estado, nEtapas)).toThrow(/nEtapas inválido/);
  });

  it('usa jogadorIds explícito do estado, não o grid de etapas[0]', () => {
    const loadouts = loadoutsDeTeste(4);
    const estado = iniciarCampeonato(dataset, loadouts, 42, calendarioPadrao(dataset));

    expect(estado.jogadorIds).toEqual(loadouts.map((l) => l.jogadorId));
    // Com o universo vindo do estado, zerar `etapas` não produz mais um
    // `TypeError` obscuro em `etapas[0].resultado` — o guard de nEtapas pega
    // primeiro, com mensagem que aponta pro save inválido (aviso 2).
    const corrompido = { ...estado, etapas: [] };
    expect(() => classificacaoApos(corrompido, 3)).toThrow(/nEtapas inválido/);
    expect(classificacaoApos(corrompido, 0)).toHaveLength(loadouts.length);
  });

  // Cosmético 4 da revisão: a cobertura de DNF no universo era incidental (a
  // seed 42 por acaso produz um abandono). Se o balanceamento mudar e ninguém
  // abandonar, a cobertura sumiria sem ninguém notar — então a premissa vira
  // asserção explícita.
  it('quem abandona continua no universo da classificação acumulada', () => {
    const loadouts = loadoutsDeTeste(4);
    const estado = iniciarCampeonato(dataset, loadouts, 42, calendarioPadrao(dataset));

    const dnfs = estado.etapas[0].resultado.classificacao.filter((c) => c.status === 'dnf');
    expect(dnfs.length).toBeGreaterThan(0);

    const classificacao = classificacaoApos(estado, 1);
    expect(classificacao).toHaveLength(loadouts.length);
    for (const dnf of dnfs) {
      expect(classificacao.some((linha) => linha.jogadorId === dnf.jogadorId)).toBe(true);
    }
  });
});

describe('sincronia entre calendario e etapas (aviso 3 da revisão do 6.4)', () => {
  it('mutar o array do chamador depois de iniciar não dessincroniza o cursor', () => {
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadoutsDeTeste(4), 42, calendario);

    // O chamador ainda tem a referência do array que passou.
    calendario.push('pista-montreal', 'pista-imola');

    expect(estado.calendario).toHaveLength(5);
    expect(estado.etapas).toHaveLength(5);

    let cursor = estado;
    for (let i = 0; i < 5; i++) cursor = avancarEtapa(cursor);

    // Sem a cópia + o uso de etapas.length, isto daria etapaAtual 7 e
    // campeonatoConcluido só na 7ª — com a tela lendo etapas[5] undefined.
    expect(cursor.etapaAtual).toBe(5);
    expect(campeonatoConcluido(cursor)).toBe(true);
    expect(simularOResto(estado).etapaAtual).toBe(5);
  });
});

/**
 * PR 8.3 — dados das telas de campeonato. Funções puras porque o projeto não
 * tem jsdom: se a variação de posição ou o "já correu / é a próxima" morassem
 * no `.tsx`, não haveria teste nenhum sobre eles.
 */
describe('variacaoDePosicao (tela de classificação, PR 8.3)', () => {
  const loadouts = loadoutsDeTeste(6);
  const estado = iniciarCampeonato(dataset, loadouts, 42, calendarioPadrao(dataset, 'completa'));

  it('depois da PRIMEIRA corrida a variação é null pra todos — não havia tabela antes', () => {
    const variacao = variacaoDePosicao(estado, 1);
    expect(variacao.size).toBe(loadouts.length);
    for (const valor of variacao.values()) expect(valor).toBeNull();
  });

  it('nEtapas 0 também é null pra todos (nem corrida houve)', () => {
    for (const valor of variacaoDePosicao(estado, 0).values()) expect(valor).toBeNull();
  });

  it('positivo = SUBIU, negativo = caiu, e a soma das variações é ZERO', () => {
    // A soma ser zero é a guarda de coerência: posição é permutação, então
    // toda subida de alguém é a queda de outro. Um sinal trocado quebraria.
    const variacao = variacaoDePosicao(estado, 3);
    const valores = [...variacao.values()];
    for (const valor of valores) expect(valor).not.toBeNull();
    expect(valores.reduce((soma: number, v) => soma + (v ?? 0), 0)).toBe(0);
  });

  it('bate com a diferença real de índices entre as duas tabelas', () => {
    const antes = classificacaoApos(estado, 4);
    const depois = classificacaoApos(estado, 5);
    const variacao = variacaoDePosicao(estado, 5);
    for (const [indice, linha] of depois.entries()) {
      const indiceAntes = antes.findIndex((l) => l.jogadorId === linha.jogadorId);
      expect(variacao.get(linha.jogadorId)).toBe(indiceAntes - indice);
    }
  });

  it('herda a validação alta de classificacaoApos (NaN não vira tabela vazia)', () => {
    expect(() => variacaoDePosicao(estado, Number.NaN)).toThrow(/nEtapas inválido/);
    expect(() => variacaoDePosicao(estado, 999)).toThrow(/nEtapas inválido/);
    expect(() => variacaoDePosicao(estado, -1)).toThrow(/nEtapas inválido/);
  });
});

describe('calendarioAnotado (tela de calendário, PR 8.3)', () => {
  const loadouts = loadoutsDeTeste(4);
  const calendario = calendarioSorteado(dataset, 42, 'curta');

  it('no começo: nada disputado, a primeira é a próxima, nenhum vencedor revelado', () => {
    const anotado = calendarioAnotado(iniciarCampeonato(dataset, loadouts, 42, calendario));
    expect(anotado).toHaveLength(5);
    expect(anotado.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(anotado.filter((e) => e.disputada)).toHaveLength(0);
    expect(anotado.filter((e) => e.proxima).map((e) => e.numero)).toEqual([1]);
    for (const etapa of anotado) expect(etapa.vencedorId).toBeNull();
  });

  it('NÃO vaza o vencedor da próxima corrida, mesmo com tudo já simulado em memória', () => {
    // O ponto do teste: `iniciarCampeonato` pré-simula TODAS as etapas. Se o
    // calendário lesse `etapas[i].resultado` sem checar o cursor, a tela
    // entregaria o vencedor da corrida que o jogador ainda vai assistir.
    const estado = avancarEtapa(iniciarCampeonato(dataset, loadouts, 42, calendario));
    const anotado = calendarioAnotado(estado);
    expect(anotado[0].disputada).toBe(true);
    expect(anotado[0].vencedorId).not.toBeNull();
    for (const etapa of anotado.slice(1)) {
      expect(etapa.disputada).toBe(false);
      expect(etapa.vencedorId).toBeNull();
    }
  });

  it('o vencedor revelado é o 1º da classificação daquela etapa', () => {
    const estado = avancarEtapa(iniciarCampeonato(dataset, loadouts, 42, calendario));
    expect(calendarioAnotado(estado)[0].vencedorId).toBe(
      estado.etapas[0].resultado.classificacao[0].jogadorId,
    );
  });

  it('a ordem do calendário anotado é a do calendário SORTEADO, não a do dataset', () => {
    const estado = iniciarCampeonato(dataset, loadouts, 42, calendario);
    expect(calendarioAnotado(estado).map((e) => e.pistaId)).toEqual(calendario);
  });

  it('campeonato concluído: tudo disputado e NENHUMA marcada como próxima', () => {
    const estado = simularOResto(iniciarCampeonato(dataset, loadouts, 42, calendario));
    const anotado = calendarioAnotado(estado);
    expect(anotado.every((e) => e.disputada)).toBe(true);
    expect(anotado.filter((e) => e.proxima)).toHaveLength(0);
    for (const etapa of anotado) expect(etapa.vencedorId).not.toBeNull();
  });
});
