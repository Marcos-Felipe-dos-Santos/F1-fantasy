/**
 * Testes da engine de campeonato (PR 6.1) — baseline vermelho escrito antes
 * da implementação (`src/engine/campeonato.ts` ainda não existe quando este
 * arquivo foi criado).
 *
 * Usa a fixture congelada `src/fixtures/dataset-semente/` (padrão do PR 4.4),
 * não o dataset vivo — os valores golden deste arquivo dependem de dados que
 * NUNCA mudam sob regeneração do dataset.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import type { EtapaCampeonato, Loadout, Pista, ResultadoCorrida } from './types';
import { simularQuali } from './quali';
import { simularCorrida } from './corrida';
import { acumularClassificacao, seedDaEtapa, simularCampeonato, simularEtapa } from './campeonato';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const pistaMonaco = dataset.pistasById.get('pista-monaco')!;
const pistaMonza = dataset.pistasById.get('pista-monza')!;
const pistaSuzuka = dataset.pistasById.get('pista-suzuka')!;
const pistaSpa = dataset.pistasById.get('pista-spa')!;

function loadoutRedBull(jogadorId: string, overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId,
    pilotoId: 'redbull-2023-piloto-verstappen',
    chassiId: 'redbull-2023-chassi',
    motorId: 'redbull-2023-motor',
    estrategistaId: 'redbull-2023-estrategista',
    pitId: 'redbull-2023-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

function loadoutFerrari(jogadorId: string, overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId,
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

const loadoutsPadrao: Loadout[] = [
  loadoutRedBull('j1'),
  loadoutFerrari('j2'),
  loadoutMinardi('j3'),
];

const pistasPadrao: Pista[] = [pistaMonaco, pistaMonza, pistaSuzuka];

/**
 * Monta uma `EtapaCampeonato` SINTÉTICA (sem rodar a simulação) pra exercitar
 * `acumularClassificacao` em cenários que a corrida real quase nunca produz —
 * notadamente grid pequeno com maioria de DNF, onde um abandono cai no top 3
 * e o autor da volta mais rápida não terminou (`corrida.ts:449-469`).
 */
function etapaSintetica(
  pistaId: string,
  linhas: { jogadorId: string; status: 'terminou' | 'dnf'; pontos: number }[],
  voltaMaisRapidaJogadorId: string,
): EtapaCampeonato {
  const resultado: ResultadoCorrida = {
    seed: 0,
    classificacao: linhas.map((linha, idx) => ({
      jogadorId: linha.jogadorId,
      posicao: idx + 1,
      pontos: linha.pontos,
      tempoTotal: 1000 + idx,
      paradas: 1,
      status: linha.status,
      voltasCompletadas: linha.status === 'terminou' ? 10 : 3,
    })),
    voltaMaisRapida: { jogadorId: voltaMaisRapidaJogadorId, tempo: 900 },
    eventos: [],
    chuva: false,
    historicoVoltas: {},
    voltasDePit: {},
  };
  return { pistaId, grid: { grid: [] }, resultado };
}

describe('seedDaEtapa', () => {
  it('é pura e estável: mesma seed base + mesmo id de pista ⇒ mesma seed', () => {
    const s1 = seedDaEtapa(42, 'pista-monaco');
    const s2 = seedDaEtapa(42, 'pista-monaco');
    expect(s2).toBe(s1);
  });

  it('pistas diferentes produzem seeds diferentes', () => {
    const sMonaco = seedDaEtapa(42, 'pista-monaco');
    const sMonza = seedDaEtapa(42, 'pista-monza');
    expect(sMonaco).not.toBe(sMonza);
  });
});

describe('simularEtapa', () => {
  it('com seed crua reproduz exatamente simularQuali + simularCorrida chamados diretamente com a mesma seed', () => {
    const seed = 777;
    const etapa = simularEtapa(dataset, loadoutsPadrao, pistaMonaco, seed);

    const gridEsperado = simularQuali(dataset, loadoutsPadrao, pistaMonaco, seed);
    const resultadoEsperado = simularCorrida(dataset, loadoutsPadrao, pistaMonaco, gridEsperado, seed);

    expect(etapa.grid).toEqual(gridEsperado);
    expect(etapa.resultado).toEqual(resultadoEsperado);
    expect(etapa.pistaId).toBe('pista-monaco');
  });
});

describe('simularCampeonato', () => {
  it('é determinístico: mesma seed base + mesmos loadouts ⇒ mesmo ResultadoCampeonato', () => {
    const r1 = simularCampeonato(dataset, loadoutsPadrao, pistasPadrao, 99);
    const r2 = simularCampeonato(dataset, loadoutsPadrao, pistasPadrao, 99);
    expect(r2).toEqual(r1);
  });

  it('é invariante à ordem do calendário: permutar `pistas` só muda a ordem de `etapas`, não a classificação final', () => {
    const original = simularCampeonato(dataset, loadoutsPadrao, pistasPadrao, 99);
    const permutado = simularCampeonato(
      dataset,
      loadoutsPadrao,
      [pistaSuzuka, pistaMonaco, pistaMonza],
      99,
    );

    expect(permutado.classificacao).toEqual(original.classificacao);
    expect(permutado.etapas.map((e) => e.pistaId)).toEqual(['pista-suzuka', 'pista-monaco', 'pista-monza']);
    expect(original.etapas.map((e) => e.pistaId)).toEqual(['pista-monaco', 'pista-monza', 'pista-suzuka']);

    // Prova DIRETA de que a seed deriva do id da pista, não do índice: cada
    // etapa homônima é bit a bit igual nos dois calendários, apesar de ter
    // sido simulada em posições diferentes. Sem isto, a igualdade da
    // classificação acima seria só evidência agregada (poderia coincidir).
    for (const pistaId of ['pista-monaco', 'pista-monza', 'pista-suzuka']) {
      expect(permutado.etapas.find((e) => e.pistaId === pistaId)).toEqual(
        original.etapas.find((e) => e.pistaId === pistaId),
      );
    }
  });

  it('é invariante à ordem dos loadouts: permutar `loadouts` não muda a classificação final', () => {
    const original = simularCampeonato(dataset, loadoutsPadrao, pistasPadrao, 99);
    const permutado = simularCampeonato(
      dataset,
      [...loadoutsPadrao].reverse(),
      pistasPadrao,
      99,
    );

    expect(permutado.classificacao).toEqual(original.classificacao);
  });

  it('conserva pontos: soma da classificação final === soma dos pontos de todas as etapas', () => {
    const resultado = simularCampeonato(dataset, loadoutsPadrao, pistasPadrao, 99);
    const somaClassificacao = resultado.classificacao.reduce((acc, l) => acc + l.pontos, 0);
    const somaEtapas = resultado.etapas.reduce(
      (acc, etapa) => acc + etapa.resultado.classificacao.reduce((a, c) => a + c.pontos, 0),
      0,
    );
    expect(somaClassificacao).toBe(somaEtapas);
  });

  it('golden: seed fixa ⇒ campeão e pontos do top 3 congelados', () => {
    const resultado = simularCampeonato(
      dataset,
      loadoutsPadrao,
      [pistaMonaco, pistaMonza, pistaSuzuka, pistaSpa],
      12345,
    );
    const top3 = resultado.classificacao.slice(0, 3).map((l) => ({ jogadorId: l.jogadorId, pontos: l.pontos }));
    expect(top3).toEqual([
      { jogadorId: 'j1', pontos: 104 },
      { jogadorId: 'j2', pontos: 72 },
      { jogadorId: 'j3', pontos: 60 },
    ]);
  });
});

describe('acumularClassificacao', () => {
  it('ordena por pontos desc; empate por jogadorId ascendente (code unit)', () => {
    const etapas = [
      simularEtapa(dataset, loadoutsPadrao, pistaMonaco, seedDaEtapa(1, 'pista-monaco')),
    ];
    const classificacao = acumularClassificacao(etapas, ['j1', 'j2', 'j3']);
    for (let i = 1; i < classificacao.length; i++) {
      expect(classificacao[i].pontos).toBeLessThanOrEqual(classificacao[i - 1].pontos);
    }
  });

  it('mantém jogadores com 0 pontos quando não há etapas', () => {
    const classificacao = acumularClassificacao([], ['j1', 'j2']);
    expect(classificacao).toEqual([
      { jogadorId: 'j1', pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 0 },
      { jogadorId: 'j2', pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 0 },
    ]);
  });

  // Anti-tautologia: a ordem de ENTRADA é ['j2','j1'], oposta à esperada. Um
  // comparador que devolvesse 0 no empate preservaria a ordem de inserção e
  // passaria no teste anterior — aqui ele falha.
  it('desempata por jogadorId ascendente mesmo quando a ordem de entrada é a inversa', () => {
    const classificacao = acumularClassificacao([], ['j2', 'j1']);
    expect(classificacao.map((l) => l.jogadorId)).toEqual(['j1', 'j2']);
  });

  it('trava os contadores de vitórias, pódios, voltas rápidas e DNFs', () => {
    const etapas = [
      etapaSintetica(
        'pista-monza',
        [
          { jogadorId: 'j1', status: 'terminou', pontos: 26 },
          { jogadorId: 'j2', status: 'terminou', pontos: 18 },
          { jogadorId: 'j3', status: 'terminou', pontos: 15 },
          { jogadorId: 'j4', status: 'dnf', pontos: 0 },
        ],
        'j1',
      ),
      etapaSintetica(
        'pista-spa',
        [
          { jogadorId: 'j2', status: 'terminou', pontos: 25 },
          { jogadorId: 'j1', status: 'terminou', pontos: 18 },
          { jogadorId: 'j3', status: 'dnf', pontos: 0 },
          { jogadorId: 'j4', status: 'dnf', pontos: 0 },
        ],
        'j2',
      ),
    ];
    const classificacao = acumularClassificacao(etapas, ['j1', 'j2', 'j3', 'j4']);
    expect(classificacao).toEqual([
      { jogadorId: 'j1', pontos: 44, vitorias: 1, podios: 2, voltasRapidas: 1, dnfs: 0 },
      { jogadorId: 'j2', pontos: 43, vitorias: 1, podios: 2, voltasRapidas: 1, dnfs: 0 },
      { jogadorId: 'j3', pontos: 15, vitorias: 0, podios: 1, voltasRapidas: 0, dnfs: 1 },
      { jogadorId: 'j4', pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 2 },
    ]);
  });

  // A1 da revisão do PR 6.1: `simularCorrida` ordena finalizadores primeiro,
  // mas quando MENOS DE 3 CARROS TERMINAM um DNF cai em `posicao <= 3`. Pódio
  // é resultado esportivo — quem abandonou não sobe nele, do mesmo jeito que
  // não pontua (`corrida.ts:436`).
  it('não credita pódio a quem abandonou, mesmo caindo no top 3 por falta de finalizadores', () => {
    const etapas = [
      etapaSintetica(
        'pista-suzuka',
        [
          { jogadorId: 'j1', status: 'terminou', pontos: 26 },
          { jogadorId: 'j2', status: 'dnf', pontos: 0 },
          { jogadorId: 'j3', status: 'dnf', pontos: 0 },
          { jogadorId: 'j4', status: 'dnf', pontos: 0 },
        ],
        'j1',
      ),
    ];
    const porId = new Map(
      acumularClassificacao(etapas, ['j1', 'j2', 'j3', 'j4']).map((l) => [l.jogadorId, l]),
    );
    expect(porId.get('j1')!.podios).toBe(1);
    expect(porId.get('j2')!.podios).toBe(0);
    expect(porId.get('j3')!.podios).toBe(0);
  });

  // A1 da revisão: numa corrida 100% DNF a engine cai num fallback que aponta
  // `voltaMaisRapida` pra um abandonador e NÃO credita o ponto de bônus
  // (`corrida.ts:453-469`). O contador aqui tem que espelhar essa elegibilidade.
  it('não credita vitória, pódio nem volta mais rápida quando ninguém termina', () => {
    const etapas = [
      etapaSintetica(
        'pista-monaco',
        [
          { jogadorId: 'j1', status: 'dnf', pontos: 0 },
          { jogadorId: 'j2', status: 'dnf', pontos: 0 },
        ],
        'j1',
      ),
    ];
    const classificacao = acumularClassificacao(etapas, ['j1', 'j2']);
    expect(classificacao).toEqual([
      { jogadorId: 'j1', pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 1 },
      { jogadorId: 'j2', pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 1 },
    ]);
  });
});

describe('simularCampeonato — validação de entrada', () => {
  // A2 da revisão: a seed depende só de `pista.id`, então repetir a pista
  // produziria duas etapas bit a bit IDÊNTICAS (corrida clonada dobrando
  // pontos). Incluir o índice no rótulo resolveria o clone, mas destruiria o
  // baseline do balance-harness — por isso a repetição é rejeitada.
  it('rejeita pista repetida no calendário', () => {
    expect(() =>
      simularCampeonato(dataset, loadoutsPadrao, [pistaMonaco, pistaMonza, pistaMonaco], 1),
    ).toThrow(/pistaId duplicado/);
  });

  it('rejeita calendário sem nenhum loadout', () => {
    expect(() => simularCampeonato(dataset, [], pistasPadrao, 1)).toThrow(/ao menos 1 loadout/);
  });
});
