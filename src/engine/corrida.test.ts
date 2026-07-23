import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import type { Loadout } from './types';
import { simularQuali } from './quali';
import { CORRIDA_CONFIG, simularCorrida } from './corrida';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const pistaMonaco = dataset.pistasById.get('pista-monaco')!;
const pistaMonza = dataset.pistasById.get('pista-monza')!;
const pistaSuzuka = dataset.pistasById.get('pista-suzuka')!;
const pistaInterlagos = dataset.pistasById.get('pista-interlagos')!;

function loadoutRedBull(overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId: 'j1',
    pilotoId: 'redbull-2023-piloto-verstappen',
    chassiId: 'redbull-2023-chassi',
    motorId: 'redbull-2023-motor',
    estrategistaId: 'redbull-2023-estrategista',
    pitId: 'redbull-2023-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

function loadoutFerrari(overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId: 'j2',
    pilotoId: 'ferrari-2023-piloto-leclerc',
    chassiId: 'ferrari-2023-chassi',
    motorId: 'ferrari-2023-motor',
    estrategistaId: 'ferrari-2023-estrategista',
    pitId: 'ferrari-2023-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

function loadoutMinardi(jogadorId: string, overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId,
    pilotoId: 'minardi-2004-piloto-baumgartner',
    chassiId: 'minardi-2004-chassi',
    motorId: 'minardi-2004-motor',
    estrategistaId: 'minardi-2004-estrategista',
    pitId: 'minardi-2004-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

/** Pior CONS (44) e CONF_MOTOR (54) do dataset; CONF 52 é quase o piso (o pior é Minardi 1998, 50) — Minardi 1993, Barbazza (§8, incidentes). */
function loadoutMinardi1993Barbazza(jogadorId: string, overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId,
    pilotoId: 'minardi-1993-piloto-barbazza',
    chassiId: 'minardi-1993-chassi',
    motorId: 'minardi-1993-motor',
    estrategistaId: 'minardi-1993-estrategista',
    pitId: 'minardi-1993-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

function loadoutMercedes(overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId: 'j4',
    pilotoId: 'mercedes-2023-piloto-hamilton',
    chassiId: 'mercedes-2023-chassi',
    motorId: 'mercedes-2023-motor',
    estrategistaId: 'mercedes-2023-estrategista',
    pitId: 'mercedes-2023-pit',
    pecaId: 'peca-das-mercedes',
    ...overrides,
  };
}

/** 12 loadouts de equipes distintas (dataset tem 22 equipe/anos), pra teste de pontuação FIA com >10 carros. */
const equipesDistintas: [string, number][] = [
  ['Red Bull', 2023],
  ['Ferrari', 2023],
  ['Mercedes', 2023],
  ['McLaren', 2023],
  ['Aston Martin', 2023],
  ['Williams', 2023],
  ['Ferrari', 2004],
  ['Williams', 2004],
  ['McLaren', 2004],
  ['Renault', 2004],
  ['Sauber', 2004],
  ['Minardi', 2004],
];

function loadoutsGrande(): Loadout[] {
  return equipesDistintas.map(([equipe, ano], idx) => {
    const ea = dataset.equipeAnos.find((e) => e.equipe === equipe && e.ano === ano)!;
    return {
      jogadorId: `p${idx + 1}`,
      pilotoId: ea.pilotos[0].id,
      chassiId: ea.chassi.id,
      motorId: ea.motor.id,
      estrategistaId: ea.estrategista.id,
      pitId: ea.pit.id,
      pecaId: 'peca-composto-macio',
    };
  });
}

describe('simularCorrida', () => {
  it('é determinístico: mesma seed + mesmos loadouts ⇒ mesmo resultado', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari()];
    const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
    const resultado1 = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);
    const resultado2 = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);
    expect(resultado2).toEqual(resultado1);
  });

  it('estrutura: classificacao tem 1 item por jogador, posicoes 1..N, jogadorIds únicos, tempoTotal crescente', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
    const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
    const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);

    expect(resultado.classificacao).toHaveLength(4);
    const posicoes = resultado.classificacao.map((c) => c.posicao).sort((a, b) => a - b);
    expect(posicoes).toEqual([1, 2, 3, 4]);
    const ids = resultado.classificacao.map((c) => c.jogadorId);
    expect(new Set(ids).size).toBe(4);
    for (let i = 1; i < resultado.classificacao.length; i++) {
      expect(resultado.classificacao[i].tempoTotal).toBeGreaterThanOrEqual(
        resultado.classificacao[i - 1].tempoTotal,
      );
    }
  });

  it('pontuação FIA: 1o=25, 2o=18 ... 10o=1, 11o+ =0 (fora o bônus de volta mais rápida)', () => {
    const loadouts = loadoutsGrande();
    const grid = simularQuali(dataset, loadouts, pistaMonza, 7);
    const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 7);

    expect(resultado.classificacao).toHaveLength(12);
    for (const item of resultado.classificacao) {
      const base = CORRIDA_CONFIG.pontosFia[item.posicao - 1] ?? 0;
      const ehAutorVoltaRapida = item.jogadorId === resultado.voltaMaisRapida.jogadorId;
      const esperado = base + (ehAutorVoltaRapida ? CORRIDA_CONFIG.pontoVoltaMaisRapida : 0);
      expect(item.pontos).toBe(esperado);
    }
    const ultimos = resultado.classificacao.filter((c) => c.posicao >= 11);
    expect(ultimos.length).toBeGreaterThan(0);
    for (const item of ultimos) {
      if (item.jogadorId !== resultado.voltaMaisRapida.jogadorId) {
        expect(item.pontos).toBe(0);
      }
    }
  });

  it('volta mais rápida: aponta pro dono do menor tempo de volta e ele recebe +1 sobre os pontos da posição', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
    const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
    const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);

    const autor = resultado.classificacao.find(
      (c) => c.jogadorId === resultado.voltaMaisRapida.jogadorId,
    )!;
    const basePontos = CORRIDA_CONFIG.pontosFia[autor.posicao - 1] ?? 0;
    expect(autor.pontos).toBe(basePontos + CORRIDA_CONFIG.pontoVoltaMaisRapida);
  });

  it('todo carro faz pelo menos 1 parada', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
    const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
    const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);
    for (const item of resultado.classificacao) {
      expect(item.paradas).toBeGreaterThanOrEqual(1);
    }
  });

  // Recalibrado no PR 1.6 (balance-harness, 2026-07-18): antes desta calibração,
  // "pista de desgaste alto + PNEU baixo ⇒ paradas >= 2" era só POSSÍVEL, não
  // típico (~10-20% das seeds). Com `limiarPneuGasto` recalibrado pra 3.5 (meta
  // do dev: ~40-60% dos carros com 2+ paradas em desgaste Alto, variando pelo
  // PNEU), o cenário virou TÍPICO pro pior extremo de PNEU: em 40 seeds, 39
  // batem 2+ paradas — por isso a asserção virou um limiar alto (com margem de
  // segurança), não só "aconteceu ao menos uma vez".
  it('pista de desgaste alto + piloto de PNEU baixo faz 2+ paradas na maioria das seeds', () => {
    const loadouts = [loadoutMinardi('j1'), loadoutRedBull({ jogadorId: 'j2' })];
    let comDuasOuMais = 0;
    const totalSeeds = 40;
    for (let seed = 0; seed < totalSeeds; seed++) {
      const grid = simularQuali(dataset, loadouts, pistaSuzuka, seed);
      const resultado = simularCorrida(dataset, loadouts, pistaSuzuka, grid, seed);
      const item = resultado.classificacao.find((c) => c.jogadorId === 'j1')!;
      if (item.paradas >= 2) comDuasOuMais++;
    }
    // Observado: 39/40. Margem de segurança generosa abaixo do observado.
    expect(comDuasOuMais).toBeGreaterThanOrEqual(30);
  });

  it('pista de desgaste baixo + piloto de PNEU alto faz exatamente 1 parada', () => {
    const loadouts = [loadoutRedBull({ jogadorId: 'j1' })];
    const grid = simularQuali(dataset, loadouts, pistaMonza, 1);
    const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 1);
    expect(resultado.classificacao[0].paradas).toBe(1);
  });

  it('independe da ordem dos loadouts no array de entrada', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3')];
    const invertido = [...loadouts].reverse();
    const gridNormal = simularQuali(dataset, loadouts, pistaMonza, 99);
    const gridInvertido = simularQuali(dataset, invertido, pistaMonza, 99);
    const resultadoNormal = simularCorrida(dataset, loadouts, pistaMonza, gridNormal, 99);
    const resultadoInvertido = simularCorrida(dataset, invertido, pistaMonza, gridInvertido, 99);

    const tempoPorId = (c: typeof resultadoNormal.classificacao) =>
      Object.fromEntries(c.map((item) => [item.jogadorId, item.tempoTotal]));

    expect(tempoPorId(resultadoInvertido.classificacao)).toEqual(
      tempoPorId(resultadoNormal.classificacao),
    );
  });

  // Recalibrado no PR 1.6 (balance-harness, 2026-07-18): antes, o sinal de
  // grid era fraco por design (61/100 vitórias de quem larga na frente), daí a
  // asserção ser só DIRECIONAL. Com `gridOffsetMs`/`variancia` recalibrados
  // pra meta do dev (pole vence ~70-80% em pista de ultrapassagem média, com
  // carros idênticos), Mônaco (dificil) sobe pra ~90/100 — a asserção virou um
  // limiar real, com margem de segurança abaixo do observado.
  it('quem larga na frente com carros idênticos vence claramente mais do que quem larga atrás', () => {
    let vitoriasFrente = 0;
    const totalSeeds = 100;
    for (let seed = 0; seed < totalSeeds; seed++) {
      const loadouts = [
        loadoutRedBull({ jogadorId: 'frente' }),
        loadoutRedBull({ jogadorId: 'atras' }),
      ];
      // Força "frente" a largar na pole, "atras" em 2o.
      const gridForcado = {
        grid: [
          { jogadorId: 'frente', tempo: 0 },
          { jogadorId: 'atras', tempo: 1 },
        ],
      };
      const resultado = simularCorrida(dataset, loadouts, pistaMonaco, gridForcado, seed);
      const posFrente = resultado.classificacao.find((c) => c.jogadorId === 'frente')!.posicao;
      const posAtras = resultado.classificacao.find((c) => c.jogadorId === 'atras')!.posicao;
      if (posFrente < posAtras) vitoriasFrente++;
    }
    // Observado: 90/100. Margem de segurança generosa abaixo do observado.
    expect(vitoriasFrente).toBeGreaterThanOrEqual(75);
  });

  // Já passava antes (>= 80/100) com variância maior; recalibração (PR 1.6)
  // deixou o sinal mais forte ainda — observado: 100/100. Mantém o limiar
  // conservador (não aperta pra 100 fixo, pra não ficar frágil a seeds novas).
  it('carro forte vence o fraco na maioria das seeds', () => {
    let vitoriasForte = 0;
    const totalSeeds = 100;
    for (let seed = 0; seed < totalSeeds; seed++) {
      const forte = loadoutRedBull({ jogadorId: 'forte' });
      const fraco = loadoutMinardi('fraco');
      const loadouts = [forte, fraco];
      const grid = simularQuali(dataset, loadouts, pistaMonza, seed);
      const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, seed);
      const posForte = resultado.classificacao.find((c) => c.jogadorId === 'forte')!.posicao;
      const posFraco = resultado.classificacao.find((c) => c.jogadorId === 'fraco')!.posicao;
      if (posForte < posFraco) vitoriasForte++;
    }
    expect(vitoriasForte).toBeGreaterThanOrEqual(80);
  });

  it('jogadorId duplicado lança erro', () => {
    const loadouts = [
      loadoutRedBull({ jogadorId: 'dup' }),
      loadoutFerrari({ jogadorId: 'dup' }),
    ];
    // grid com ids únicos só pra passar da checagem de duplicidade do loadouts primeiro.
    const gridFake = { grid: [{ jogadorId: 'dup', tempo: 0 }] };
    expect(() => simularCorrida(dataset, loadouts, pistaMonza, gridFake, 1)).toThrow(/dup/);
  });

  it('grid inconsistente com loadouts lança erro', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari()];
    const gridInconsistente = { grid: [{ jogadorId: 'j1', tempo: 0 }] };
    expect(() => simularCorrida(dataset, loadouts, pistaMonza, gridInconsistente, 1)).toThrow();
  });

  describe('incidentes (PR 1.5a)', () => {
    it('é determinístico com incidentes: mesma seed ⇒ deep-equal (incluindo eventos)', () => {
      const loadouts = [loadoutMinardi1993Barbazza('j1'), loadoutRedBull({ jogadorId: 'j2' })];
      const grid = simularQuali(dataset, loadouts, pistaSuzuka, 123);
      const resultado1 = simularCorrida(dataset, loadouts, pistaSuzuka, grid, 123);
      const resultado2 = simularCorrida(dataset, loadouts, pistaSuzuka, grid, 123);
      expect(resultado2).toEqual(resultado1);
    });

    it('piloto com CONS baixíssimo comete mais erros do que piloto de CONS alto', () => {
      const totalSeeds = 50;
      let errosFraco = 0;
      let errosForte = 0;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [loadoutMinardi1993Barbazza('fraco'), loadoutRedBull({ jogadorId: 'forte' })];
        const grid = simularQuali(dataset, loadouts, pistaMonza, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, seed);
        errosFraco += resultado.eventos.filter(
          (e) => e.jogadorId === 'fraco' && e.tipo === 'erro-piloto',
        ).length;
        errosForte += resultado.eventos.filter(
          (e) => e.jogadorId === 'forte' && e.tipo === 'erro-piloto',
        ).length;
      }
      expect(errosFraco).toBeGreaterThan(0);
      expect(errosFraco).toBeGreaterThan(errosForte);
    });

    it('DNF por quebra: carro fraco (CONF/CONF_MOTOR baixos) pode abandonar', () => {
      const totalSeeds = 200;
      let achado: ReturnType<typeof simularCorrida> | null = null;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [loadoutMinardi1993Barbazza('fraco'), loadoutRedBull({ jogadorId: 'forte' })];
        const grid = simularQuali(dataset, loadouts, pistaSuzuka, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaSuzuka, grid, seed);
        const item = resultado.classificacao.find((c) => c.jogadorId === 'fraco')!;
        if (item.status === 'dnf') {
          achado = resultado;
          break;
        }
      }
      expect(achado).not.toBeNull();
      const resultado = achado!;
      const item = resultado.classificacao.find((c) => c.jogadorId === 'fraco')!;
      expect(item.status).toBe('dnf');
      expect(item.voltasCompletadas).toBeLessThan(pistaSuzuka.voltas);
      expect(item.pontos).toBe(0);

      // DNF aparece depois de todos que terminaram na classificação.
      const posTerminaram = resultado.classificacao
        .filter((c) => c.status === 'terminou')
        .map((c) => c.posicao);
      expect(Math.max(...posTerminaram)).toBeLessThan(item.posicao);

      const eventoQuebra = resultado.eventos.find(
        (e) => e.jogadorId === 'fraco' && (e.tipo === 'quebra-chassi' || e.tipo === 'quebra-motor'),
      );
      expect(eventoQuebra).toBeDefined();
      expect(eventoQuebra!.volta).toBe(item.voltasCompletadas);
    });

    it('risco da peça: peça proibida gera problema-tecnico/investigacao; peça comum (risco 0) nunca', () => {
      const totalSeeds = 300;
      let eventosProibida = 0;
      let eventosComum = 0;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [
          loadoutRedBull({ jogadorId: 'proibida', pecaId: 'peca-suspensao-ativa-fw15' }),
          loadoutRedBull({ jogadorId: 'comum', pecaId: 'peca-composto-macio' }),
        ];
        const grid = simularQuali(dataset, loadouts, pistaMonza, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, seed);
        eventosProibida += resultado.eventos.filter(
          (e) =>
            e.jogadorId === 'proibida' &&
            (e.tipo === 'problema-tecnico' || e.tipo === 'investigacao'),
        ).length;
        eventosComum += resultado.eventos.filter(
          (e) =>
            e.jogadorId === 'comum' && (e.tipo === 'problema-tecnico' || e.tipo === 'investigacao'),
        ).length;
      }
      expect(eventosProibida).toBeGreaterThan(0);
      expect(eventosComum).toBe(0);
    });

    it('investigação soma penalidade em ms na última volta', () => {
      const totalSeeds = 300;
      let achado: { evento: import('./types').EventoCorrida } | null = null;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [
          loadoutRedBull({ jogadorId: 'proibida', pecaId: 'peca-suspensao-ativa-fw15' }),
        ];
        const grid = simularQuali(dataset, loadouts, pistaMonza, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, seed);
        const evento = resultado.eventos.find(
          (e) => e.jogadorId === 'proibida' && e.tipo === 'investigacao',
        );
        if (evento) {
          achado = { evento };
          break;
        }
      }
      expect(achado).not.toBeNull();
      const { evento } = achado!;
      expect(evento.custoMs).toBeGreaterThanOrEqual(CORRIDA_CONFIG.investigacaoPenalidadeMinMs);
      expect(evento.custoMs).toBeLessThanOrEqual(CORRIDA_CONFIG.investigacaoPenalidadeMaxMs);
      expect(evento.volta).toBe(pistaMonza.voltas);
    });

    it('eventos ficam ordenados por volta crescente (empate ⇒ jogadorId crescente)', () => {
      const loadouts = [
        loadoutMinardi1993Barbazza('a'),
        loadoutMinardi1993Barbazza('b'),
        loadoutMinardi1993Barbazza('c'),
      ];
      const grid = simularQuali(dataset, loadouts, pistaMonza, 55);
      const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 55);
      for (let i = 1; i < resultado.eventos.length; i++) {
        const anterior = resultado.eventos[i - 1];
        const atual = resultado.eventos[i];
        const emOrdem =
          atual.volta > anterior.volta ||
          (atual.volta === anterior.volta && atual.jogadorId >= anterior.jogadorId);
        expect(emOrdem).toBe(true);
      }
    });

    it('DNF não recebe ponto de volta mais rápida: autor da volta mais rápida sempre terminou', () => {
      const totalSeeds = 200;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [
          loadoutMinardi1993Barbazza('fraco1'),
          loadoutMinardi1993Barbazza('fraco2'),
          loadoutRedBull({ jogadorId: 'forte' }),
        ];
        const grid = simularQuali(dataset, loadouts, pistaSuzuka, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaSuzuka, grid, seed);
        const autor = resultado.classificacao.find(
          (c) => c.jogadorId === resultado.voltaMaisRapida.jogadorId,
        )!;
        expect(autor.status).toBe('terminou');
      }
    });

    it('sem incidente continua ok: carro top com peça risco 0 raramente gera eventos', () => {
      const totalSeeds = 20;
      let seedsSemEvento = 0;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [loadoutRedBull({ jogadorId: 'top', pecaId: 'peca-composto-macio' })];
        const grid = simularQuali(dataset, loadouts, pistaMonza, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, seed);
        if (resultado.eventos.length === 0) seedsSemEvento++;
      }
      expect(seedsSemEvento).toBeGreaterThan(totalSeeds / 2);
    });
  });

  describe('seed de ouro (regressão)', () => {
    it('congela classificação e volta mais rápida para seed 42, Monza, 4 loadouts fixos', () => {
      const loadouts: Loadout[] = [
        loadoutRedBull(),
        loadoutFerrari(),
        loadoutMinardi('j3'),
        loadoutMercedes(),
      ];
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
      const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);
      // Valores congelados a partir da 1a execução da implementação (PR 1.4);
      // recongelados após a calibração do balance-harness (PR 1.6, 2026-07-18 —
      // variancia/gridOffsetMs/limiarPneuGasto mudaram, ordem/pontos idênticos)
      // e novamente após a recalibração do PR 4.5 (2026-07-22 — swap do
      // dataset derivado deslocou o sinal de grid; só `gridOffsetMs` mudou,
      // ordem/pontos/paradas idênticos, só `tempoTotal` desloca).
      // `historicoVoltas` (PR 1.7b) e `voltasDePit` (PR 2.7) são derivados, não
      // hardcoded aqui — os números congelados dos demais campos não mudam (ver
      // asserções de soma/consistência abaixo).
      const { historicoVoltas, voltasDePit, ...resto } = resultado;
      expect(resto).toEqual({
        seed: 42,
        classificacao: [
          {
            jogadorId: 'j1',
            posicao: 1,
            pontos: 26,
            tempoTotal: 1172989.7117451343,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 14,
          },
          {
            jogadorId: 'j4',
            posicao: 2,
            pontos: 18,
            tempoTotal: 1176271.1234702512,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 14,
          },
          {
            jogadorId: 'j2',
            posicao: 3,
            pontos: 15,
            tempoTotal: 1181275.8751857206,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 14,
          },
          {
            jogadorId: 'j3',
            posicao: 4,
            pontos: 12,
            tempoTotal: 1202862.903723684,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 14,
          },
        ],
        voltaMaisRapida: { jogadorId: 'j1', tempo: 81987.43890587863 },
        eventos: [],
        chuva: false,
      });
      for (const item of resultado.classificacao) {
        expect(historicoVoltas[item.jogadorId]).toHaveLength(item.voltasCompletadas);
        const soma = historicoVoltas[item.jogadorId].reduce((a, b) => a + b, 0);
        expect(soma).toBeCloseTo(item.tempoTotal, 6);

        // voltasDePit (PR 2.7): 1 entrada por paradas, voltas 1-based dentro
        // do range da pista, estritamente crescentes.
        const voltas = voltasDePit[item.jogadorId];
        expect(voltas).toHaveLength(item.paradas);
        for (const v of voltas) {
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(pistaMonza.voltas);
        }
        for (let i = 1; i < voltas.length; i++) {
          expect(voltas[i]).toBeGreaterThan(voltas[i - 1]);
        }
      }
    });

    it('congela classificação, volta mais rápida e chuva=true para seed 42, Interlagos (chanceChuva=1), 4 loadouts fixos', () => {
      const loadouts: Loadout[] = [
        loadoutRedBull(),
        loadoutFerrari(),
        loadoutMinardi('j3'),
        loadoutMercedes(),
      ];
      const pistaMolhada = { ...pistaInterlagos, chanceChuva: 1 };
      const grid = simularQuali(dataset, loadouts, pistaInterlagos, 42);
      const resultado = simularCorrida(dataset, loadouts, pistaMolhada, grid, 42);
      // Valores congelados a partir da 1a execução da implementação (PR 1.5b);
      // recongelados após a calibração do balance-harness (PR 1.6, 2026-07-18 —
      // o novo gridOffsetMs/variancia inverteu a ordem j1/j4 no topo) e
      // novamente após a recalibração do PR 4.5 (2026-07-22 — swap do dataset
      // derivado deslocou o sinal de grid; só `gridOffsetMs` mudou, ordem
      // permanece j1/j4/j2/j3, só `tempoTotal` desloca).
      // `historicoVoltas` (PR 1.7b) e `voltasDePit` (PR 2.7) são derivados, não
      // hardcoded aqui — os números congelados dos demais campos não mudam (ver
      // asserções de soma/consistência abaixo).
      const { historicoVoltas, voltasDePit, ...resto } = resultado;
      expect(resto).toEqual({
        seed: 42,
        classificacao: [
          {
            jogadorId: 'j1',
            posicao: 1,
            pontos: 26,
            tempoTotal: 918358.1741811826,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 12,
          },
          {
            jogadorId: 'j4',
            posicao: 2,
            pontos: 18,
            tempoTotal: 918778.9709473404,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 12,
          },
          {
            jogadorId: 'j2',
            posicao: 3,
            pontos: 15,
            tempoTotal: 922225.0617813128,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 12,
          },
          {
            jogadorId: 'j3',
            posicao: 4,
            pontos: 12,
            tempoTotal: 941851.3261634379,
            paradas: 1,
            status: 'terminou',
            voltasCompletadas: 12,
          },
        ],
        voltaMaisRapida: { jogadorId: 'j1', tempo: 74270.0609837211 },
        eventos: [],
        chuva: true,
      });
      for (const item of resultado.classificacao) {
        expect(historicoVoltas[item.jogadorId]).toHaveLength(item.voltasCompletadas);
        const soma = historicoVoltas[item.jogadorId].reduce((a, b) => a + b, 0);
        expect(soma).toBeCloseTo(item.tempoTotal, 6);

        // voltasDePit (PR 2.7): 1 entrada por paradas, voltas 1-based dentro
        // do range da pista, estritamente crescentes.
        const voltas = voltasDePit[item.jogadorId];
        expect(voltas).toHaveLength(item.paradas);
        for (const v of voltas) {
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(pistaInterlagos.voltas);
        }
        for (let i = 1; i < voltas.length; i++) {
          expect(voltas[i]).toBeGreaterThan(voltas[i - 1]);
        }
      }
    });
  });

  describe('historicoVoltas (PR 1.7b)', () => {
    it('tem 1 entrada por jogadorId, com tamanho igual a voltasCompletadas', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
      const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);

      expect(Object.keys(resultado.historicoVoltas).sort()).toEqual(
        loadouts.map((l) => l.jogadorId).sort(),
      );
      for (const item of resultado.classificacao) {
        expect(resultado.historicoVoltas[item.jogadorId]).toHaveLength(item.voltasCompletadas);
      }
    });

    it('sem investigação: soma das voltas do histórico ≈ tempoTotal', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
      const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);

      for (const item of resultado.classificacao) {
        const temInvestigacao = resultado.eventos.some(
          (e) => e.jogadorId === item.jogadorId && e.tipo === 'investigacao',
        );
        expect(temInvestigacao).toBe(false); // seed/loadouts conhecidos sem incidentes (ver seed de ouro)
        const soma = resultado.historicoVoltas[item.jogadorId].reduce((a, b) => a + b, 0);
        expect(soma).toBeCloseTo(item.tempoTotal, 6);
      }
    });

    it('DNF por quebra: soma das voltas do histórico ≈ tempoTotal (a volta do DNF entra)', () => {
      const totalSeeds = 200;
      let achado: ReturnType<typeof simularCorrida> | null = null;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [loadoutMinardi1993Barbazza('fraco'), loadoutRedBull({ jogadorId: 'forte' })];
        const grid = simularQuali(dataset, loadouts, pistaSuzuka, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaSuzuka, grid, seed);
        const item = resultado.classificacao.find((c) => c.jogadorId === 'fraco')!;
        if (item.status === 'dnf') {
          achado = resultado;
          break;
        }
      }
      expect(achado).not.toBeNull();
      const resultado = achado!;
      const item = resultado.classificacao.find((c) => c.jogadorId === 'fraco')!;
      const soma = resultado.historicoVoltas['fraco'].reduce((a, b) => a + b, 0);
      expect(soma).toBeCloseTo(item.tempoTotal, 6);
    });

    it('com investigação: soma das voltas + custoMs da investigação ≈ tempoTotal', () => {
      const totalSeeds = 300;
      let achado: ReturnType<typeof simularCorrida> | null = null;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [
          loadoutRedBull({ jogadorId: 'proibida', pecaId: 'peca-suspensao-ativa-fw15' }),
        ];
        const grid = simularQuali(dataset, loadouts, pistaMonza, seed);
        const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, seed);
        const evento = resultado.eventos.find(
          (e) => e.jogadorId === 'proibida' && e.tipo === 'investigacao',
        );
        if (evento) {
          achado = resultado;
          break;
        }
      }
      expect(achado).not.toBeNull();
      const resultado = achado!;
      const item = resultado.classificacao.find((c) => c.jogadorId === 'proibida')!;
      const evento = resultado.eventos.find(
        (e) => e.jogadorId === 'proibida' && e.tipo === 'investigacao',
      )!;
      const soma = resultado.historicoVoltas['proibida'].reduce((a, b) => a + b, 0);
      expect(soma + evento.custoMs).toBeCloseTo(item.tempoTotal, 6);
    });
  });

  describe('voltasDePit (PR 2.7)', () => {
    /** 1 loadout por equipe/ano do dataset inteiro (22 carros) — cobertura ampla das invariantes. */
    function loadoutsTodos(): Loadout[] {
      return dataset.equipeAnos.map((ea, idx) => ({
        jogadorId: `carro${idx + 1}`,
        pilotoId: ea.pilotos[0].id,
        chassiId: ea.chassi.id,
        motorId: ea.motor.id,
        estrategistaId: ea.estrategista.id,
        pitId: ea.pit.id,
        pecaId: 'peca-composto-macio',
      }));
    }

    it('length de voltasDePit[id] === paradas, voltas 1-based em [1, voltas] e estritamente crescentes, pros 22 carros do dataset', () => {
      const loadouts = loadoutsTodos();
      expect(loadouts).toHaveLength(22);
      const grid = simularQuali(dataset, loadouts, pistaMonza, 1);
      const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 1);

      expect(Object.keys(resultado.voltasDePit).sort()).toEqual(loadouts.map((l) => l.jogadorId).sort());
      for (const item of resultado.classificacao) {
        const voltas = resultado.voltasDePit[item.jogadorId];
        expect(voltas).toHaveLength(item.paradas);
        for (const v of voltas) {
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(pistaMonza.voltas);
        }
        for (let i = 1; i < voltas.length; i++) {
          expect(voltas[i]).toBeGreaterThan(voltas[i - 1]);
        }
      }
    });

    it('carro que terminou tem ao menos 1 parada registrada em voltasDePit (pit obrigatório)', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
      const resultado = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);
      for (const item of resultado.classificacao) {
        expect(item.status).toBe('terminou'); // seed de ouro conhecida — sem DNF
        expect(resultado.voltasDePit[item.jogadorId].length).toBeGreaterThanOrEqual(1);
      }
    });

    it('é determinístico: mesma seed + loadouts ⇒ mesmo voltasDePit', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari()];
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);
      const resultado1 = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);
      const resultado2 = simularCorrida(dataset, loadouts, pistaMonza, grid, 42);
      expect(resultado2.voltasDePit).toEqual(resultado1.voltasDePit);
    });
  });

  describe('clima (PR 1.5b)', () => {
    it('rolagem global de clima: chanceChuva=1 sempre chove; chanceChuva=0 nunca chove; determinístico por seed', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari()];
      const pistaMolhada = { ...pistaMonza, chanceChuva: 1 };
      const pistaSeca = { ...pistaMonza, chanceChuva: 0 };
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);

      const molhada1 = simularCorrida(dataset, loadouts, pistaMolhada, grid, 42);
      const molhada2 = simularCorrida(dataset, loadouts, pistaMolhada, grid, 42);
      expect(molhada1.chuva).toBe(true);
      expect(molhada2.chuva).toBe(true);
      expect(molhada2).toEqual(molhada1);

      const seca = simularCorrida(dataset, loadouts, pistaSeca, grid, 42);
      expect(seca.chuva).toBe(false);
    });

    it('corrida molhada é mais lenta: mesma seed e loadouts, só chanceChuva muda ⇒ tempoTotal maior pra todo jogador', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
      const pistaMolhada = { ...pistaMonza, chanceChuva: 1 };
      const pistaSeca = { ...pistaMonza, chanceChuva: 0 };
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);

      const molhada = simularCorrida(dataset, loadouts, pistaMolhada, grid, 42);
      const seca = simularCorrida(dataset, loadouts, pistaSeca, grid, 42);

      for (const item of seca.classificacao) {
        const itemMolhado = molhada.classificacao.find((c) => c.jogadorId === item.jogadorId)!;
        expect(itemMolhado.tempoTotal).toBeGreaterThan(item.tempoTotal);
      }
    });

    it('CHU importa: delta chuva−seco de tempoTotal é menor pro piloto de CHU alto do que pro de CHU baixo (mesmo carro)', () => {
      // Mesma equipe/ano (Red Bull 2023) pros dois — só o piloto muda, então
      // chassi/motor/estrategista/pit ficam idênticos e isolam o efeito de CHU.
      // Nota: o isolamento também depende de a seed 42 não gerar erro-só-na-chuva
      // (Verstappen e Pérez diferem em CONS, que a chuva multiplica; nesta seed
      // os erros seco==molhado, então o delta mede só a penalidade de CHU).
      const loadoutAlto = loadoutRedBull({
        jogadorId: 'alto',
        pilotoId: 'redbull-2023-piloto-verstappen', // CHU 90
      });
      const loadoutBaixo = loadoutRedBull({
        jogadorId: 'baixo',
        pilotoId: 'redbull-2023-piloto-perez', // CHU 72
      });
      const loadouts = [loadoutAlto, loadoutBaixo];
      const pistaMolhada = { ...pistaMonza, chanceChuva: 1 };
      const pistaSeca = { ...pistaMonza, chanceChuva: 0 };
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);

      const molhada = simularCorrida(dataset, loadouts, pistaMolhada, grid, 42);
      const seca = simularCorrida(dataset, loadouts, pistaSeca, grid, 42);

      const tempo = (r: typeof molhada, id: string) =>
        r.classificacao.find((c) => c.jogadorId === id)!.tempoTotal;

      const deltaAlto = tempo(molhada, 'alto') - tempo(seca, 'alto');
      const deltaBaixo = tempo(molhada, 'baixo') - tempo(seca, 'baixo');

      expect(deltaAlto).toBeGreaterThan(0);
      expect(deltaBaixo).toBeGreaterThan(0);
      expect(deltaAlto).toBeLessThan(deltaBaixo);
    });

    it('chuva gera mais erros: piloto de CONS baixo comete >= erros com chuva do que sem, em ~100 seeds (e estritamente mais)', () => {
      const totalSeeds = 100;
      let errosSeco = 0;
      let errosMolhado = 0;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [loadoutMinardi1993Barbazza('fraco')];
        const pistaSeca = { ...pistaMonza, chanceChuva: 0 };
        const pistaMolhada = { ...pistaMonza, chanceChuva: 1 };
        const grid = simularQuali(dataset, loadouts, pistaMonza, seed);

        const seca = simularCorrida(dataset, loadouts, pistaSeca, grid, seed);
        const molhada = simularCorrida(dataset, loadouts, pistaMolhada, grid, seed);

        errosSeco += seca.eventos.filter(
          (e) => e.jogadorId === 'fraco' && e.tipo === 'erro-piloto',
        ).length;
        errosMolhado += molhada.eventos.filter(
          (e) => e.jogadorId === 'fraco' && e.tipo === 'erro-piloto',
        ).length;
      }
      expect(errosMolhado).toBeGreaterThanOrEqual(errosSeco);
      expect(errosMolhado).toBeGreaterThan(errosSeco);
    });

    // Caveat (mesmo do teste "streams estáveis"): a igualdade de paradas vale
    // enquanto nenhum erro-só-na-chuva deslocar uma quebra/DNF nessas seeds —
    // se recalibração (PR 1.6) quebrar, troque a seed, não a lógica.
    it('pit/pneu sob chuva: paradas idênticas por jogador (chuva não altera desgaste nem janela) e todo carro faz >= 1 parada', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3'), loadoutMercedes()];
      const pistaSeca = { ...pistaMonza, chanceChuva: 0 };
      const pistaMolhada = { ...pistaMonza, chanceChuva: 1 };
      const grid = simularQuali(dataset, loadouts, pistaMonza, 42);

      const seca = simularCorrida(dataset, loadouts, pistaSeca, grid, 42);
      const molhada = simularCorrida(dataset, loadouts, pistaMolhada, grid, 42);

      for (const item of seca.classificacao) {
        const itemMolhado = molhada.classificacao.find((c) => c.jogadorId === item.jogadorId)!;
        expect(itemMolhado.paradas).toBe(item.paradas);
        expect(itemMolhado.paradas).toBeGreaterThanOrEqual(1);
        expect(item.paradas).toBeGreaterThanOrEqual(1);
      }
    });

    // Mesmo caveat de deslocamento de stream do teste acima.
    it('pit/pneu sob chuva em pista de desgaste alto: paradas idênticas seco vs molhado', () => {
      const loadouts = [loadoutMinardi('j1'), loadoutRedBull({ jogadorId: 'j2' })];
      const pistaSeca = { ...pistaSuzuka, chanceChuva: 0 };
      const pistaMolhada = { ...pistaSuzuka, chanceChuva: 1 };
      for (let seed = 0; seed < 20; seed++) {
        const grid = simularQuali(dataset, loadouts, pistaSuzuka, seed);
        const seca = simularCorrida(dataset, loadouts, pistaSeca, grid, seed);
        const molhada = simularCorrida(dataset, loadouts, pistaMolhada, grid, seed);
        for (const item of seca.classificacao) {
          const itemMolhado = molhada.classificacao.find((c) => c.jogadorId === item.jogadorId)!;
          expect(itemMolhado.paradas).toBe(item.paradas);
        }
      }
    });

    // Caveat (ver contrato de RNG em corrida.ts): a igualdade seco/molhado só
    // vale enquanto nenhum erro de piloto disparar SÓ na chuva antes da quebra
    // (o custo do erro consome 1 next() extra e desloca o stream). A seed
    // encontrada pela varredura satisfaz isso hoje; se uma recalibração
    // (PR 1.6) quebrar este teste, a causa provável é esse deslocamento
    // esperado — troque a seed, não a lógica.
    it('streams estáveis: quebra ocorre na mesma volta com ou sem chuva (mesmos rolls até o 1º erro-só-na-chuva)', () => {
      const totalSeeds = 200;
      let achado = false;
      for (let seed = 0; seed < totalSeeds; seed++) {
        const loadouts = [loadoutMinardi1993Barbazza('fraco'), loadoutRedBull({ jogadorId: 'forte' })];
        const pistaSeca = { ...pistaSuzuka, chanceChuva: 0 };
        const pistaMolhada = { ...pistaSuzuka, chanceChuva: 1 };
        const grid = simularQuali(dataset, loadouts, pistaSuzuka, seed);
        const seca = simularCorrida(dataset, loadouts, pistaSeca, grid, seed);
        const eventoSeco = seca.eventos.find(
          (e) => e.jogadorId === 'fraco' && (e.tipo === 'quebra-chassi' || e.tipo === 'quebra-motor'),
        );
        if (eventoSeco) {
          const molhada = simularCorrida(dataset, loadouts, pistaMolhada, grid, seed);
          const eventoMolhado = molhada.eventos.find(
            (e) => e.jogadorId === 'fraco' && e.tipo === eventoSeco.tipo,
          );
          expect(eventoMolhado).toBeDefined();
          expect(eventoMolhado!.volta).toBe(eventoSeco.volta);
          achado = true;
          break;
        }
      }
      expect(achado).toBe(true);
    });

    it('independe da ordem dos loadouts no array de entrada, mesmo com chuva', () => {
      const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3')];
      const invertido = [...loadouts].reverse();
      const pistaMolhada = { ...pistaMonza, chanceChuva: 1 };
      const gridNormal = simularQuali(dataset, loadouts, pistaMonza, 99);
      const gridInvertido = simularQuali(dataset, invertido, pistaMonza, 99);
      const resultadoNormal = simularCorrida(dataset, loadouts, pistaMolhada, gridNormal, 99);
      const resultadoInvertido = simularCorrida(dataset, invertido, pistaMolhada, gridInvertido, 99);

      const tempoPorId = (c: typeof resultadoNormal.classificacao) =>
        Object.fromEntries(c.map((item) => [item.jogadorId, item.tempoTotal]));

      expect(resultadoInvertido.chuva).toBe(resultadoNormal.chuva);
      expect(tempoPorId(resultadoInvertido.classificacao)).toEqual(
        tempoPorId(resultadoNormal.classificacao),
      );
    });
  });
});
