import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';
import {
  acumularVoltas,
  classificacaoAoVivo,
  escalaReplay,
  fracaoVisual,
  lutDoTracado,
  MS_REPLAY_POR_VOLTA,
  perfilPista,
  pontoNoTracado,
  prepararCorrida,
  progressoNoReplay,
  voltaAtual,
  type Ponto,
} from './fluxo-corrida';
import { tracadoSuavizado } from './suavizacao';

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

  it('desgaste médio (40-69): Spa, Interlagos, Imola, Nürburgring', () => {
    for (const id of ['pista-spa', 'pista-interlagos', 'pista-imola', 'pista-nurburgring']) {
      const pista = dataset.pistasById.get(id)!;
      expect(perfilPista(pista).desgaste).toBe('Médio');
    }
  });

  it('desgaste alto (>=70): Silverstone, Suzuka, Montreal', () => {
    for (const id of ['pista-silverstone', 'pista-suzuka', 'pista-montreal']) {
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

  describe('status "pit" (PR 2.7)', () => {
    // Carro com ao menos 1 parada — pré-condição pra localizar uma volta de pit real.
    const idComParada = resultadoComDnf.classificacao.find(
      (c) => (resultadoComDnf.voltasDePit[c.jogadorId] ?? []).length > 0,
    )!.jogadorId;
    const historicoComParada = resultadoComDnf.historicoVoltas[idComParada];
    const primeiraVoltaPit = resultadoComDnf.voltasDePit[idComParada][0];
    const acumuladoComParada = acumularVoltas(historicoComParada);
    const inicioVoltaPit = primeiraVoltaPit === 1 ? 0 : acumuladoComParada[primeiraVoltaPit - 2];
    const fimVoltaPit = acumuladoComParada[primeiraVoltaPit - 1];
    const tempoDentroDoPit = (inicioVoltaPit + fimVoltaPit) / 2;

    it('pré-condição do teste: a 1a parada não é na volta 1 (garante um t "fora do pit" trivial em t=1)', () => {
      expect(primeiraVoltaPit).toBeGreaterThan(1);
    });

    it('no meio da volta do 1o pit, o carro aparece com status "pit"', () => {
      const classificacao = classificacaoAoVivo(
        resultadoComDnf,
        gridLargadaComDnf,
        tempoDentroDoPit,
        pistaComDnf.voltas,
      );
      const item = classificacao.find((i) => i.jogadorId === idComParada)!;
      expect(item.status).toBe('pit');
    });

    it('fora de qualquer volta de pit, o status volta a "correndo"', () => {
      const classificacao = classificacaoAoVivo(resultadoComDnf, gridLargadaComDnf, 1, pistaComDnf.voltas);
      const item = classificacao.find((i) => i.jogadorId === idComParada)!;
      expect(item.status).toBe('correndo');
    });

    it('a ORDEM da classificação ao vivo é idêntica com e sem o carro em pit — pit não reordena', () => {
      const resultadoSemPit = {
        ...resultadoComDnf,
        voltasDePit: { ...resultadoComDnf.voltasDePit, [idComParada]: [] },
      };
      const ordemComPit = classificacaoAoVivo(
        resultadoComDnf,
        gridLargadaComDnf,
        tempoDentroDoPit,
        pistaComDnf.voltas,
      ).map((i) => i.jogadorId);
      const ordemSemPit = classificacaoAoVivo(
        resultadoSemPit,
        gridLargadaComDnf,
        tempoDentroDoPit,
        pistaComDnf.voltas,
      ).map((i) => i.jogadorId);
      expect(ordemComPit).toEqual(ordemSemPit);

      // A diferença é só o rótulo do carro em pit — 'pit' vs 'correndo' — não a posição.
      const itemComPit = classificacaoAoVivo(
        resultadoComDnf,
        gridLargadaComDnf,
        tempoDentroDoPit,
        pistaComDnf.voltas,
      ).find((i) => i.jogadorId === idComParada)!;
      const itemSemPit = classificacaoAoVivo(
        resultadoSemPit,
        gridLargadaComDnf,
        tempoDentroDoPit,
        pistaComDnf.voltas,
      ).find((i) => i.jogadorId === idComParada)!;
      expect(itemComPit.status).toBe('pit');
      expect(itemSemPit.status).toBe('correndo');
    });
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

/**
 * PR 7.5: memoização da LUT de comprimento de arco por IDENTIDADE do array de
 * traçado (não por conteúdo). `tracadoSuavizado` (suavizacao.ts:257) já
 * devolve sempre a mesma referência pro mesmo `pistaId`, então cachear por
 * identidade evita remontar a tabela de segmentos a cada frame do replay sem
 * precisar mudar a assinatura pública de `pontoNoTracado`.
 */
describe('lutDoTracado (memoização por identidade)', () => {
  const quadrado: Ponto[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  it('mesma referência de traçado devolve a MESMA LUT (prova do cache)', () => {
    expect(lutDoTracado(quadrado)).toBe(lutDoTracado(quadrado));
  });

  it('arrays distintos com o mesmo conteúdo devolvem LUTs distintas (chave é identidade, não conteúdo)', () => {
    const copia: Ponto[] = quadrado.map((p) => ({ ...p }));
    expect(lutDoTracado(copia)).not.toBe(lutDoTracado(quadrado));
  });

  it('pontoNoTracado usa a LUT cacheada (a LUT já vem populada após a chamada)', () => {
    const outro: Ponto[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    pontoNoTracado(outro, 0.3);
    const lut = lutDoTracado(outro);
    expect(lut).toBe(lutDoTracado(outro));
    expect(lut.segmentos.length).toBe(outro.length);
    expect(lut.comprimentoTotal).toBeGreaterThan(0);
  });

  // Bordas de `pontoNoTracado`: lacuna pré-existente, fechada aqui porque o
  // PR 7.5 mexeu justamente na vizinhança destes três caminhos — a LUT passou
  // a ser construída ANTES do check de `comprimentoTotal === 0`.
  it('traçado vazio lança', () => {
    expect(() => pontoNoTracado([], 0.5)).toThrow('traçado vazio');
  });

  it('traçado de 1 ponto devolve esse ponto', () => {
    const unico: Ponto[] = [{ x: 7, y: 9 }];
    expect(pontoNoTracado(unico, 0.42)).toEqual({ x: 7, y: 9 });
  });

  it('traçado degenerado (2 pontos idênticos, comprimento total 0) devolve o primeiro ponto', () => {
    const degenerado: Ponto[] = [
      { x: 3, y: 4 },
      { x: 3, y: 4 },
    ];
    expect(pontoNoTracado(degenerado, 0.75)).toEqual({ x: 3, y: 4 });
    expect(lutDoTracado(degenerado).comprimentoTotal).toBe(0);
  });
});

/**
 * Goldens capturados da implementação ANTES do PR 7.5 (varredura linear
 * remontando os segmentos a cada chamada) — rede de segurança pra provar
 * identidade BIT A BIT depois da memoização da LUT. Igualdade EXATA (`toBe`),
 * nunca `toBeCloseTo`: a memoização só pode trocar alocação, nunca a
 * aritmética de ponto flutuante (por isso a varredura linear com
 * `alvo -= segmento.comprimento` foi preservada tal qual).
 */
describe('pontoNoTracado sobre tracadoSuavizado — goldens bit a bit', () => {
  const FRACOES = [0, 0.125, 0.25, 0.5, 0.75, 0.999];

  const GOLDEN_PONTO: Record<string, [number, number][]> = {
    'pista-monaco': [[150, 520], [343.14919773614577, 533.679968629951], [500.1518297302881, 459.44843301868974], [474.26405663947963, 116.36663435777841], [300.10247352652124, 338.5429307676336], [148.9851737738031, 518.814752051671]],
    'pista-spa': [[100, 500], [317.8603509221873, 462.9632153459497], [386.5574093132492, 279.07405097537196], [872.8534621203278, 204.70753385159446], [585.4467635843083, 503.6759170062563], [101.31460634571317, 501.48314804112107]],
    'pista-monza': [[150, 500], [415.73054376182705, 513.6820903781669], [680.8430237566658, 492.7604771876899], [828.5329232533277, 155.67031006876175], [304.56266430399995, 104.31948458385577], [147.95046937015002, 499.411538510025]],
    'pista-silverstone': [[120, 500], [354.1418526939863, 519.9446085686449], [588.2111928524535, 489.93535009144085], [662.4355331323331, 184.8665843428323], [237.5813493211116, 125.37269299352644], [118.48277237487251, 498.86604735486287]],
    'pista-suzuka': [[900, 300], [740.776883928995, 539.7632805022446], [500.0000000000001, 300.0000000000001], [100, 300.0000000000004], [500.00000000000045, 299.9999999999995], [899.9785515317714, 297.26033323657146]],
    'pista-interlagos': [[150, 200], [420.73889124984146, 168.3404372596405], [495.0438715253009, 359.3379214570515], [762.1566909998221, 499.52859940286226], [677.3472302311087, 174.3282250003049], [150.91045100317353, 197.97770820240999]],
    'pista-nurburgring': [[80, 300], [248.79178589749407, 175.05279169999466], [497.9354460655906, 146.1162626340107], [920, 299.9999999999998], [497.93544606559146, 453.8837373659888], [80.14117687899203, 302.2911955534309]],
    'pista-imola': [[150, 500], [366.8750096156514, 514.9989995319032], [583.7521441574031, 491.4519482139999], [658.8318929682183, 195.31388736731947], [250.83639068847972, 165.78618344987234], [148.47613037767857, 499.1402473473195]],
    'pista-red-bull-ring': [[200, 500], [398.5319203571519, 534.2978299565234], [558.4489068160971, 440.85567814531663], [747.2388461870061, 214.8386128096255], [380.06878168898436, 170.86227847507612], [198.80567700162933, 498.891976908923]],
    'pista-montreal': [[150, 540], [140.2503909918194, 285.23059068953484], [266.93170201030665, 104.44487157559456], [760.8289553032935, 163.30289960102377], [658.4234201014926, 534.2872853389914], [151.70493326103733, 541.1570996236121]],
  };

  for (const [pistaId, esperados] of Object.entries(GOLDEN_PONTO)) {
    it(`${pistaId}: pontos batem bit a bit com o golden pré-PR 7.5`, () => {
      const tracado = tracadoSuavizado(pistaId);
      // Trava de aridade: sem isto, REMOVER uma entrada de `FRACOES` deixaria o
      // teste passar cobrindo menos, silenciosamente.
      expect(esperados).toHaveLength(FRACOES.length);
      FRACOES.forEach((fracao, indice) => {
        const ponto = pontoNoTracado(tracado, fracao);
        const [x, y] = esperados[indice];
        expect(ponto.x).toBe(x);
        expect(ponto.y).toBe(y);
      });
    });
  }
});
