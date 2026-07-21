import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';
import {
  acumularVoltas,
  classificacaoAoVivo,
  escalaReplay,
  fracaoVisual,
  MS_REPLAY_POR_VOLTA,
  perfilPista,
  pontoNoTracado,
  prepararCorrida,
  progressoNoReplay,
  voltaAtual,
  type Ponto,
} from './fluxo-corrida';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Joga as 5 rodadas de sorteio do humano (primeiro slot disponível) e a peça (primeira revelada) — mesmo padrão de useDraft.test.ts, até o draft concluir. */
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

describe('prepararCorrida', () => {
  it('é determinística: mesma seed ⇒ mesmo grid e mesma classificação', () => {
    const draft1 = jogarDraftAteConcluir('corrida-demo');
    const draft2 = jogarDraftAteConcluir('corrida-demo');
    const preparo1 = prepararCorrida(dataset, draft1);
    const preparo2 = prepararCorrida(dataset, draft2);

    expect(preparo2.grid).toEqual(preparo1.grid);
    expect(preparo2.resultado.classificacao).toEqual(preparo1.resultado.classificacao);
  });

  it('cobre os 22 jogadores no grid e na classificação', () => {
    const draft = jogarDraftAteConcluir('corrida-demo-22');
    const { grid, resultado } = prepararCorrida(dataset, draft);

    expect(grid.grid).toHaveLength(22);
    expect(resultado.classificacao).toHaveLength(22);
    expect(Object.keys(resultado.historicoVoltas)).toHaveLength(22);
  });

  it('lança erro se o draft não estiver concluído', () => {
    const inicial = iniciarDraftSingle(dataset, 'corrida-incompleto', 'facil');
    expect(() => prepararCorrida(dataset, inicial)).toThrow(/concluído/);
  });

  it('sem pistaId explícito, usa Monza (default preservado — não-regressão)', () => {
    const draft = jogarDraftAteConcluir('corrida-default-monza');
    const { pista } = prepararCorrida(dataset, draft);
    expect(pista.id).toBe('pista-monza');
  });

  it('com pistaId explícito, usa a pista pedida (Interlagos) — voltas/pesos diferentes de Monza', () => {
    const draft = jogarDraftAteConcluir('corrida-interlagos');
    const { pista } = prepararCorrida(dataset, draft, 'pista-interlagos');
    expect(pista.id).toBe('pista-interlagos');
    expect(pista.voltas).toBe(12);
  });

  it('a mesma seed produz resultados diferentes em pistas diferentes (a pista influencia a simulação)', () => {
    const draft1 = jogarDraftAteConcluir('corrida-comparar-pistas');
    const draft2 = jogarDraftAteConcluir('corrida-comparar-pistas');
    const emMonza = prepararCorrida(dataset, draft1, 'pista-monza');
    const emInterlagos = prepararCorrida(dataset, draft2, 'pista-interlagos');

    expect(emMonza.resultado.classificacao).not.toEqual(emInterlagos.resultado.classificacao);
  });

  it('lança erro claro pra pistaId inexistente', () => {
    const draft = jogarDraftAteConcluir('corrida-pista-invalida');
    expect(() => prepararCorrida(dataset, draft, 'pista-inexistente')).toThrow(
      /pista-inexistente.*não encontrada/,
    );
  });
});

describe('perfilPista', () => {
  it('ultrapassagem fácil ⇒ rótulo e emoji verdes (ex.: Monza)', () => {
    const monza = dataset.pistasById.get('pista-monza')!;
    expect(perfilPista(monza).ultrapassagem).toEqual({ rotulo: 'Fácil', emoji: '🟢' });
  });

  it('ultrapassagem média ⇒ rótulo e emoji amarelos (ex.: Spa)', () => {
    const spa = dataset.pistasById.get('pista-spa')!;
    expect(perfilPista(spa).ultrapassagem).toEqual({ rotulo: 'Média', emoji: '🟡' });
  });

  it('ultrapassagem difícil ⇒ rótulo e emoji vermelhos (ex.: Mônaco)', () => {
    const monaco = dataset.pistasById.get('pista-monaco')!;
    expect(perfilPista(monaco).ultrapassagem).toEqual({ rotulo: 'Difícil', emoji: '🔴' });
  });

  it('desgaste baixo (<40): Monza, Mônaco, Red Bull Ring', () => {
    for (const id of ['pista-monza', 'pista-monaco', 'pista-red-bull-ring']) {
      const pista = dataset.pistasById.get(id)!;
      expect(perfilPista(pista).desgaste).toBe('Baixo');
    }
  });

  it('desgaste médio (40-69): Spa, Interlagos, Imola', () => {
    for (const id of ['pista-spa', 'pista-interlagos', 'pista-imola']) {
      const pista = dataset.pistasById.get(id)!;
      expect(perfilPista(pista).desgaste).toBe('Médio');
    }
  });

  it('desgaste alto (>=70): Silverstone, Suzuka, Nürburgring, Montreal', () => {
    for (const id of ['pista-silverstone', 'pista-suzuka', 'pista-nurburgring', 'pista-montreal']) {
      const pista = dataset.pistasById.get(id)!;
      expect(perfilPista(pista).desgaste).toBe('Alto');
    }
  });

  it('chuva em porcentagem inteira arredondada, e voltas repassadas direto', () => {
    const interlagos = dataset.pistasById.get('pista-interlagos')!;
    const perfil = perfilPista(interlagos);
    expect(perfil.chuvaPercentual).toBe(60);
    expect(perfil.voltas).toBe(12);
  });
});

describe('progressoNoReplay', () => {
  const historicoCompleto = [1000, 1100, 950, 1200, 1050]; // 5 voltas, carro que terminou (voltasTotais=5)
  const totalCompleto = historicoCompleto.reduce((a, b) => a + b, 0);

  it('é 0 no início (tempoSimMs=0)', () => {
    expect(progressoNoReplay(historicoCompleto, 0, 5)).toBe(0);
  });

  it('é monotônico não-decrescente conforme tempoSimMs avança', () => {
    let anterior = -Infinity;
    for (let t = 0; t <= totalCompleto + 500; t += 37) {
      const progresso = progressoNoReplay(historicoCompleto, t, 5);
      expect(progresso).toBeGreaterThanOrEqual(anterior);
      anterior = progresso;
    }
  });

  it('é exatamente 1 quando tempoSimMs >= tempo total do carro que terminou', () => {
    expect(progressoNoReplay(historicoCompleto, totalCompleto, 5)).toBe(1);
    expect(progressoNoReplay(historicoCompleto, totalCompleto + 10_000, 5)).toBe(1);
  });

  it('DNF: congela em voltasCompletadas/voltasTotais mesmo com tempoSimMs bem à frente', () => {
    const historicoDnf = [1000, 1100, 950]; // abandonou na volta 3 de uma corrida de 5
    const totalDnf = historicoDnf.reduce((a, b) => a + b, 0);
    const esperado = 3 / 5;

    expect(progressoNoReplay(historicoDnf, totalDnf, 5)).toBeCloseTo(esperado, 10);
    expect(progressoNoReplay(historicoDnf, totalDnf + 50_000, 5)).toBeCloseTo(esperado, 10);
  });
});

describe('fracaoVisual (correção da revisão: N voltas visuais, não 1 volta na corrida inteira)', () => {
  const historicoCompleto = [1000, 1000, 1000, 1000, 1000]; // 5 voltas iguais, carro que terminou (voltasTotais=5)
  const totalCompleto = historicoCompleto.reduce((a, b) => a + b, 0);

  it('composição: enquanto o carro roda, é (progressoNoReplay × voltasTotais) módulo 1', () => {
    for (const t of [0, 250, 500, 750, 1000, 1500, 2500, 3999]) {
      const progresso = progressoNoReplay(historicoCompleto, t, 5);
      const esperado = (progresso * 5) % 1;
      expect(fracaoVisual(historicoCompleto, t, 'terminou', 5)).toBeCloseTo(esperado, 10);
    }
  });

  it('carro em corrida dá múltiplas passagens pelo mesmo ponto do traçado (fração cíclica por volta)', () => {
    // Meio da volta 1 (t=500) e meio da volta 3 (t=2500) caem no mesmo ponto do traçado.
    const meioVolta1 = fracaoVisual(historicoCompleto, 500, 'terminou', 5);
    const meioVolta3 = fracaoVisual(historicoCompleto, 2500, 'terminou', 5);
    expect(meioVolta1).toBeCloseTo(0.5, 10);
    expect(meioVolta3).toBeCloseTo(0.5, 10);
  });

  it('monotonicidade dentro de uma única volta (sem contar o wrap-around no fim dela)', () => {
    let anterior = -Infinity;
    for (let t = 2000; t < 3000; t += 50) {
      // dentro da volta 3 inteira (2000-3000), sem cruzar limite de volta
      const fracao = fracaoVisual(historicoCompleto, t, 'terminou', 5);
      expect(fracao).toBeGreaterThanOrEqual(anterior);
      anterior = fracao;
    }
  });

  it('terminou: 0 assim que o replay passa do tempo total do carro (congela na linha de chegada)', () => {
    expect(fracaoVisual(historicoCompleto, totalCompleto, 'terminou', 5)).toBe(0);
    expect(fracaoVisual(historicoCompleto, totalCompleto + 10_000, 'terminou', 5)).toBe(0);
  });

  it('DNF: 0.5 fixo assim que o replay passa do tempo total do carro (congela no meio do traçado, não na largada)', () => {
    const historicoDnf = [1000, 1100, 950]; // abandonou na volta 3 de uma corrida de 5 — voltasCompletadas/voltasTotais = 0.6 (não seria 0 via % 1 ingênuo)
    const totalDnf = historicoDnf.reduce((a, b) => a + b, 0);

    expect(fracaoVisual(historicoDnf, totalDnf, 'dnf', 5)).toBe(0.5);
    expect(fracaoVisual(historicoDnf, totalDnf + 50_000, 'dnf', 5)).toBe(0.5);
  });

  it('DNF ainda rodando (antes do incidente) segue a fração cíclica normal, não o 0.5 fixo do freeze', () => {
    const historicoDnf = [1000, 1100, 950];
    // t=300 na volta 1 (duração 1000) ⇒ fração cíclica 0.3, bem diferente do 0.5 fixo pós-abandono.
    expect(fracaoVisual(historicoDnf, 300, 'dnf', 5)).toBeCloseTo(0.3, 10);
  });
});

describe('voltaAtual', () => {
  const historico = [1000, 1000, 1000, 1000, 1000];

  it('começa na volta 1 e avança 1 volta por vez conforme tempoSimMs passa dos marcos acumulados', () => {
    expect(voltaAtual(historico, 0, 5)).toBe(1);
    expect(voltaAtual(historico, 999, 5)).toBe(1);
    expect(voltaAtual(historico, 1000, 5)).toBe(2);
    expect(voltaAtual(historico, 2500, 5)).toBe(3);
  });

  it('clampa em voltasTotais quando o carro termina', () => {
    expect(voltaAtual(historico, 5000, 5)).toBe(5);
    expect(voltaAtual(historico, 999_999, 5)).toBe(5);
  });
});

describe('acumularVoltas', () => {
  it('soma cumulativa, na ordem', () => {
    expect(acumularVoltas([100, 200, 50])).toEqual([100, 300, 350]);
    expect(acumularVoltas([])).toEqual([]);
  });
});

describe('escalaReplay', () => {
  // PR 2.6: `msPorVolta` passou a ser o 3º parâmetro explícito (mudança de
  // assinatura, comportamento idêntico) — cada velocidade testada com o
  // valor explícito, e o default (sem 3º argumento) documentado separado.
  it.each([
    ['lenta', MS_REPLAY_POR_VOLTA.lenta],
    ['media', MS_REPLAY_POR_VOLTA.media],
    ['rapida', MS_REPLAY_POR_VOLTA.rapida],
  ] as const)('a duração real do replay do líder, escalada, bate com ~voltas * msPorVolta (%s)', (_nome, msPorVolta) => {
    const tempoLiderMs = 900_000; // 15min de corrida simulada
    const voltas = 14;
    const fator = escalaReplay(tempoLiderMs, voltas, msPorVolta);
    const duracaoRealMs = tempoLiderMs / fator;
    expect(duracaoRealMs).toBeCloseTo(voltas * msPorVolta, 6);
  });

  it('sem 3º argumento, usa o default (média) — não-regressão de assinatura', () => {
    const tempoLiderMs = 900_000;
    const voltas = 14;
    expect(escalaReplay(tempoLiderMs, voltas)).toBe(
      escalaReplay(tempoLiderMs, voltas, MS_REPLAY_POR_VOLTA.media),
    );
  });

  it('recalibração: rápida preserva o valor único anterior (2200ms); média é ~2x mais lenta; lenta é ~4x mais lenta que rápida', () => {
    expect(MS_REPLAY_POR_VOLTA.rapida).toBe(2200);
    expect(MS_REPLAY_POR_VOLTA.media / MS_REPLAY_POR_VOLTA.rapida).toBeCloseTo(2, 0);
    expect(MS_REPLAY_POR_VOLTA.lenta / MS_REPLAY_POR_VOLTA.rapida).toBeCloseTo(4, 0);
    expect(MS_REPLAY_POR_VOLTA.lenta).toBeGreaterThan(MS_REPLAY_POR_VOLTA.media);
    expect(MS_REPLAY_POR_VOLTA.media).toBeGreaterThan(MS_REPLAY_POR_VOLTA.rapida);
  });
});

describe('classificacaoAoVivo', () => {
  // Seed encontrada por busca (script descartável, ver histórico do PR 2.6)
  // que produz ao menos 1 DNF em Suzuka com o padrão de escolhas de
  // `jogarDraftAteConcluir` — necessário pra cobrir o ramo 'dnf' do contrato
  // de ordenação com uma corrida real (não sintética).
  const draftComDnf = jogarDraftAteConcluir('busca-dnf-6');
  const { grid: gridComDnf, resultado: resultadoComDnf, pista: pistaComDnf } = prepararCorrida(
    dataset,
    draftComDnf,
    'pista-suzuka',
  );
  const gridLargadaComDnf = gridComDnf.grid.map((item) => item.jogadorId);

  it('tem ao menos 1 DNF na seed escolhida (pré-condição do teste)', () => {
    expect(resultadoComDnf.classificacao.some((c) => c.status === 'dnf')).toBe(true);
  });

  it('em tempoSimMs=0, a ordem é exatamente o grid de largada', () => {
    const classificacao = classificacaoAoVivo(resultadoComDnf, gridLargadaComDnf, 0, pistaComDnf.voltas);
    expect(classificacao.map((item) => item.jogadorId)).toEqual(gridLargadaComDnf);
    expect(classificacao.every((item) => item.status === 'correndo')).toBe(true);
  });

  it('em t = tempoTotal do vencedor: quem terminou está na ordem exata de resultado.classificacao, e todo DNF vem depois de todos que terminaram', () => {
    const tempoVencedor = resultadoComDnf.classificacao[0].tempoTotal;
    const classificacao = classificacaoAoVivo(
      resultadoComDnf,
      gridLargadaComDnf,
      tempoVencedor,
      pistaComDnf.voltas,
    );

    const idsQueTerminaram = resultadoComDnf.classificacao
      .filter((c) => c.status === 'terminou')
      .map((c) => c.jogadorId);
    const ordemTerminaramNaAoVivo = classificacao
      .filter((item) => item.status === 'terminou')
      .map((item) => item.jogadorId);
    // Subsequência: a ordem relativa de quem já terminou bate com a
    // classificação real da engine (mesmo que nem todos tenham cruzado a
    // linha ainda neste instante — o vencedor cruza exatamente agora).
    expect(ordemTerminaramNaAoVivo).toEqual(
      idsQueTerminaram.filter((id) => ordemTerminaramNaAoVivo.includes(id)),
    );
    expect(ordemTerminaramNaAoVivo).toContain(resultadoComDnf.classificacao[0].jogadorId);

    const ultimoIndiceTerminou = Math.max(
      ...classificacao.map((item, idx) => (item.status === 'terminou' ? idx : -1)),
    );
    const primeiroIndiceDnf = classificacao.findIndex((item) => item.status === 'dnf');
    if (primeiroIndiceDnf !== -1) {
      expect(primeiroIndiceDnf).toBeGreaterThan(ultimoIndiceTerminou);
    }
  });

  it('em t intermediário: 22 entradas, sem ids duplicados, e o 1º colocado tem progresso >= o de todos os demais', () => {
    const tempoVencedor = resultadoComDnf.classificacao[0].tempoTotal;
    const tempoIntermediario = Math.round(tempoVencedor / 2);
    const classificacao = classificacaoAoVivo(
      resultadoComDnf,
      gridLargadaComDnf,
      tempoIntermediario,
      pistaComDnf.voltas,
    );

    expect(classificacao).toHaveLength(22);
    expect(new Set(classificacao.map((item) => item.jogadorId)).size).toBe(22);

    const progressoDe = (jogadorId: string) =>
      progressoNoReplay(
        resultadoComDnf.historicoVoltas[jogadorId] ?? [],
        tempoIntermediario,
        pistaComDnf.voltas,
      );
    const progressoLider = progressoDe(classificacao[0].jogadorId);
    for (const item of classificacao) {
      expect(progressoLider).toBeGreaterThanOrEqual(progressoDe(item.jogadorId));
    }
  });

  it('em t após TODOS cruzarem a linha: os que terminaram reproduzem exatamente resultado.classificacao (cobre o desempate ambos-terminaram → tempoTotal)', () => {
    // Aviso da revisão do PR 2.6: em t = tempoTotal do vencedor só 1 carro
    // tem status 'terminou', então o ramo de desempate por tempoTotal entre
    // dois carros já congelados em progresso 1 não era exercitado. Aqui todos
    // os finalistas já cruzaram (t = 10x o tempo do vencedor cobre qualquer
    // tempoTotal), forçando o sort a resolver TODOS os pares de terminados
    // por tempoTotal — a ordem resultante tem que ser a chegada real.
    const tempoAposTodos = resultadoComDnf.classificacao[0].tempoTotal * 10;
    const classificacao = classificacaoAoVivo(
      resultadoComDnf,
      gridLargadaComDnf,
      tempoAposTodos,
      pistaComDnf.voltas,
    );

    const idsQueTerminaram = resultadoComDnf.classificacao
      .filter((c) => c.status === 'terminou')
      .map((c) => c.jogadorId);
    // Pré-condição anti-tautologia: há 2+ finalistas, senão não há desempate.
    expect(idsQueTerminaram.length).toBeGreaterThan(1);

    const terminadosNaAoVivo = classificacao.filter((item) => item.status === 'terminou');
    expect(terminadosNaAoVivo.map((item) => item.jogadorId)).toEqual(idsQueTerminaram);

    // Todo DNF fica atrás do último que terminou, com status 'dnf'.
    const caudaDnf = classificacao.slice(terminadosNaAoVivo.length);
    expect(caudaDnf.every((item) => item.status === 'dnf')).toBe(true);
    expect(caudaDnf.map((item) => item.jogadorId).sort()).toEqual(
      resultadoComDnf.classificacao
        .filter((c) => c.status === 'dnf')
        .map((c) => c.jogadorId)
        .sort(),
    );
  });
});

describe('pontoNoTracado', () => {
  // Quadrado unitário fechado (perímetro 4): (0,0)→(1,0)→(1,1)→(0,1)→(0,0).
  const quadrado: Ponto[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  it('fracao 0 = primeiro ponto', () => {
    expect(pontoNoTracado(quadrado, 0)).toEqual({ x: 0, y: 0 });
  });

  it('fracao 1 volta ao primeiro ponto (fecha o loop)', () => {
    expect(pontoNoTracado(quadrado, 1)).toEqual({ x: 0, y: 0 });
  });

  it('fracoes 0.25/0.5/0.75 caem exatamente nos cantos do quadrado', () => {
    expect(pontoNoTracado(quadrado, 0.25)).toEqual({ x: 1, y: 0 });
    expect(pontoNoTracado(quadrado, 0.5)).toEqual({ x: 1, y: 1 });
    expect(pontoNoTracado(quadrado, 0.75)).toEqual({ x: 0, y: 1 });
  });

  it('ponto intermediário cai sobre o segmento (meio do primeiro lado)', () => {
    expect(pontoNoTracado(quadrado, 0.125)).toEqual({ x: 0.5, y: 0 });
  });

  it('fracao módulo 1: fracoes fora de [0,1) se comportam como sua parte fracionária', () => {
    expect(pontoNoTracado(quadrado, 1.25)).toEqual(pontoNoTracado(quadrado, 0.25));
    expect(pontoNoTracado(quadrado, -0.25)).toEqual(pontoNoTracado(quadrado, 0.75));
  });
});
