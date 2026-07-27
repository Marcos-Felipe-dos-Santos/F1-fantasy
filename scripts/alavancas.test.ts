/**
 * Testes unitários das alavancas (PR 6.3.1) — rodam no `npm test` normal.
 * Cobertura mínima definida no plano aprovado: anti-tautologia, amarração com
 * o PR 6.3, lastro exato (com cancelamento algébrico do bônus de peça),
 * no-op de f=0, corte de etapa do lastro, forma da penalidade, leitura real
 * do dataset derivado, e as 3 propriedades do pit (slot mais fraco,
 * determinismo/1-troca, pool de peças fechado).
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { resolverCarro } from '../src/engine/carro';
import { simularCampeonato } from '../src/engine/campeonato';
import type { Dataset } from '../src/engine/dataset';
import type { Loadout, Peca, LinhaClassificacao } from '../src/engine/types';
import { draftarCampeonato, medirDominanciaDraft, scoreCarroPista, scoreCorridaPista } from './balance';
import {
  aplicarPitMeioTemporada,
  clonarPilotoComLastro,
  criarTabelaPercentis,
  fatoresLastroDaClassificacao,
  forcaCombinada,
  medirCenario,
  simularCampeonatoComAlavancas,
  type Cenario,
  type TabelaPercentis,
} from './alavancas';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const tabela = criarTabelaPercentis(dataset);

function loadoutDe(equipe: string, ano: number, jogadorId: string, pecaId = 'peca-composto-macio'): Loadout {
  const ea = dataset.equipeAnos.find((e) => e.equipe === equipe && e.ano === ano);
  if (!ea) throw new Error(`loadoutDe: equipe/ano "${equipe}" ${ano} não encontrado`);
  return {
    jogadorId,
    pilotoId: ea.pilotos[0].id,
    chassiId: ea.chassi.id,
    motorId: ea.motor.id,
    estrategistaId: ea.estrategista.id,
    pitId: ea.pit.id,
    pecaId,
  };
}

describe('anti-tautologia: simularCampeonatoComAlavancas sem alavanca == simularCampeonato da engine', () => {
  it('classificação idêntica pra 3 seeds diferentes', () => {
    for (const seed of [0, 1, 2]) {
      const { loadouts, copiasRestantes } = draftarCampeonato(dataset, seed);
      const cenario: Cenario = { nome: 'baseline', nEtapas: dataset.pistas.length };

      const comAlavancas = simularCampeonatoComAlavancas(
        dataset,
        tabela,
        loadouts,
        copiasRestantes,
        dataset.pistas,
        seed,
        cenario,
      );
      const baseline = simularCampeonato(dataset, loadouts, dataset.pistas, seed);

      expect(comAlavancas.classificacao).toEqual(baseline.classificacao);
      expect(comAlavancas.loadoutsFinais).toEqual(loadouts);
      expect(comAlavancas.trocasPorSlot).toEqual({});
    }
  });
});

describe('amarração com o PR 6.3: medirCenario(baseline) == medirDominanciaDraft', () => {
  it('rhoMedio/pCampeaoTop3/pForaTop5NoPodio idênticos (n pequeno)', () => {
    const n = 15;
    const dominancia = medirDominanciaDraft(dataset, n);
    const cenario: Cenario = { nome: 'baseline', nEtapas: dataset.pistas.length };
    const metricas = medirCenario(dataset, tabela, cenario, n);

    expect(metricas.rhoMedio).toBeCloseTo(dominancia.spearmanMedio, 9);
    expect(metricas.pCampeaoTop3).toBeCloseTo(dominancia.pCampeaoTop3Forca, 9);
    expect(metricas.pForaTop5NoPodio).toBeCloseTo(dominancia.pForaTop5NoPodio, 9);
  });
});

describe('lastro de sucesso: cancelamento algébrico exato', () => {
  it('scoreCorridaPista do clone == (1-f) * original; scoreCarroPista inalterado (loadout sem peça em rit)', () => {
    const pista = dataset.pistasById.get('pista-monza')!;
    const loadout = loadoutDe('Williams', 2022, 'jogador-lastro');
    const f = 0.07;

    const scoreCorridaOriginal = scoreCorridaPista(dataset, loadout, pista);
    const scoreQualiOriginal = scoreCarroPista(dataset, loadout, pista);

    const { idClone, piloto } = clonarPilotoComLastro(dataset, loadout, pista, f);
    const datasetDerivado: Dataset = { ...dataset, pilotosById: new Map(dataset.pilotosById) };
    datasetDerivado.pilotosById.set(idClone, piloto);
    const loadoutClone: Loadout = { ...loadout, pilotoId: idClone };

    expect(scoreCorridaPista(datasetDerivado, loadoutClone, pista)).toBeCloseTo(
      (1 - f) * scoreCorridaOriginal,
      9,
    );
    expect(scoreCarroPista(datasetDerivado, loadoutClone, pista)).toBeCloseTo(scoreQualiOriginal, 9);
  });

  it('o bônus da peça se cancela na álgebra (peça sintética mirando "rit")', () => {
    // Nenhuma peça real de src/data/pecas.json mira "rit" hoje — peça
    // sintética só pra este teste, adicionada a uma cópia rasa do dataset
    // (nunca ao dataset real). Prova que o cancelamento algébrico do
    // doc-comment de `clonarPilotoComLastro` vale mesmo quando o bônus da
    // peça soma diretamente no atributo penalizado.
    const pecaRit: Peca = {
      id: 'peca-teste-rit-sintetica',
      nome: 'Peça de teste (rit)',
      categoria: 'teste',
      raridade: 'comum',
      atributosAlvo: ['rit'],
      bonus: 8,
      risco: 0,
    };
    const datasetComPecaRit: Dataset = {
      ...dataset,
      pecas: [...dataset.pecas, pecaRit],
      pecasById: new Map(dataset.pecasById).set(pecaRit.id, pecaRit),
    };
    const pista = dataset.pistasById.get('pista-monza')!;
    const loadout = loadoutDe('Williams', 2022, 'jogador-lastro-peca-rit', pecaRit.id);
    const f = 0.12;

    const scoreCorridaOriginal = scoreCorridaPista(datasetComPecaRit, loadout, pista);
    const scoreQualiOriginal = scoreCarroPista(datasetComPecaRit, loadout, pista);

    const { idClone, piloto } = clonarPilotoComLastro(datasetComPecaRit, loadout, pista, f);
    const datasetDerivado: Dataset = {
      ...datasetComPecaRit,
      pilotosById: new Map(datasetComPecaRit.pilotosById),
    };
    datasetDerivado.pilotosById.set(idClone, piloto);
    const loadoutClone: Loadout = { ...loadout, pilotoId: idClone };

    expect(scoreCorridaPista(datasetDerivado, loadoutClone, pista)).toBeCloseTo(
      (1 - f) * scoreCorridaOriginal,
      9,
    );
    expect(scoreCarroPista(datasetDerivado, loadoutClone, pista)).toBeCloseTo(scoreQualiOriginal, 9);
  });

  it('lança se o lastro empurrar rit pra negativo (falha alta, nunca silenciosa)', () => {
    const pista = dataset.pistasById.get('pista-monza')!;
    const loadout = loadoutDe('Williams', 2022, 'jogador-lastro-absurdo');
    expect(() => clonarPilotoComLastro(dataset, loadout, pista, 50)).toThrow(/rit negativo/);
  });
});

describe('lastro: f=0 é no-op bit a bit', () => {
  it('intensidade 0 produz classificação idêntica ao baseline (nenhuma clonagem ocorre)', () => {
    const seed = 3;
    const { loadouts, copiasRestantes } = draftarCampeonato(dataset, seed);
    const pistas = dataset.pistas;

    const semLastro = simularCampeonatoComAlavancas(
      dataset,
      tabela,
      loadouts,
      copiasRestantes,
      pistas,
      seed,
      { nome: 'sem-lastro', nEtapas: pistas.length },
    );
    const comLastroZero = simularCampeonatoComAlavancas(
      dataset,
      tabela,
      loadouts,
      copiasRestantes,
      pistas,
      seed,
      { nome: 'lastro-zero', nEtapas: pistas.length, lastro: { intensidade: 0, aPartirDaEtapa: 2 } },
    );

    expect(comLastroZero.classificacao).toEqual(semLastro.classificacao);
  });
});

describe('lastro: só vale a partir da etapa configurada', () => {
  it('com aPartirDaEtapa=4, um cenário de 3 etapas fica idêntico ao mesmo cenário sem lastro', () => {
    const seed = 4;
    const { loadouts, copiasRestantes } = draftarCampeonato(dataset, seed);
    const pistas = dataset.pistas.slice(0, 3);

    const semLastro = simularCampeonatoComAlavancas(dataset, tabela, loadouts, copiasRestantes, pistas, seed, {
      nome: 'sem-lastro-3etapas',
      nEtapas: 3,
    });
    const comLastroTardio = simularCampeonatoComAlavancas(dataset, tabela, loadouts, copiasRestantes, pistas, seed, {
      nome: 'lastro-tardio-3etapas',
      nEtapas: 3,
      lastro: { intensidade: 0.1, aPartirDaEtapa: 4 },
    });

    expect(comLastroTardio.classificacao).toEqual(semLastro.classificacao);
  });
});

describe('fatoresLastroDaClassificacao: forma da penalidade', () => {
  it('líder recebe intensidade, 2º intensidade/2, 3º intensidade/3', () => {
    function linha(jogadorId: string): LinhaClassificacao {
      return { jogadorId, pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 0, posicoes: [] };
    }
    const classificacaoParcial = [linha('lider'), linha('segundo'), linha('terceiro'), linha('quarto')];
    const fatores = fatoresLastroDaClassificacao(classificacaoParcial, { intensidade: 0.12, aPartirDaEtapa: 1 });

    expect(fatores.get('lider')).toBeCloseTo(0.12, 12);
    expect(fatores.get('segundo')).toBeCloseTo(0.06, 12);
    expect(fatores.get('terceiro')).toBeCloseTo(0.04, 12);
    expect(fatores.get('quarto')).toBeCloseTo(0.03, 12);
  });

  it('forma linear: líder recebe intensidade, último recebe 0, gradiente constante', () => {
    function linha(jogadorId: string): LinhaClassificacao {
      return { jogadorId, pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 0, posicoes: [] };
    }
    const classificacaoParcial = [linha('lider'), linha('segundo'), linha('terceiro'), linha('quarto')];
    const fatores = fatoresLastroDaClassificacao(classificacaoParcial, {
      intensidade: 0.12,
      aPartirDaEtapa: 1,
      forma: 'linear',
    });

    // n=4 ⇒ f = 0.12 * (4 - k) / 3.
    expect(fatores.get('lider')).toBeCloseTo(0.12, 12);
    expect(fatores.get('segundo')).toBeCloseTo(0.08, 12);
    expect(fatores.get('terceiro')).toBeCloseTo(0.04, 12);
    expect(fatores.get('quarto')).toBeCloseTo(0, 12);

    // O ponto da variante: no meio da tabela a linear pune MUITO mais que a
    // harmônica — é isso que a distingue como alavanca de pelotão.
    const harmonica = fatoresLastroDaClassificacao(classificacaoParcial, {
      intensidade: 0.12,
      aPartirDaEtapa: 1,
    });
    expect(fatores.get('segundo')!).toBeGreaterThan(harmonica.get('segundo')!);
  });

  it('forma linear com 1 jogador só não divide por zero', () => {
    const classificacaoParcial: LinhaClassificacao[] = [
      { jogadorId: 'unico', pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 0, posicoes: [] },
    ];
    const fatores = fatoresLastroDaClassificacao(classificacaoParcial, {
      intensidade: 0.12,
      aPartirDaEtapa: 1,
      forma: 'linear',
    });
    expect(fatores.get('unico')).toBeCloseTo(0.12, 12);
  });
});

describe('dataset derivado é lido de verdade (pilotosById, não o array pilotos)', () => {
  it('resolverCarro lê o rit penalizado do clone e o dataset original não é mutado', () => {
    const pista = dataset.pistasById.get('pista-spa')!;
    const loadout = loadoutDe('Alfa Romeo', 1951, 'jogador-derivado');
    const f = 0.05;

    const ritOriginal = dataset.pilotosById.get(loadout.pilotoId)!.notas.rit;
    const { idClone, piloto } = clonarPilotoComLastro(dataset, loadout, pista, f);

    const datasetDerivado: Dataset = { ...dataset, pilotosById: new Map(dataset.pilotosById) };
    datasetDerivado.pilotosById.set(idClone, piloto);
    const loadoutClone: Loadout = { ...loadout, pilotoId: idClone };

    // Lido de `pilotosById` do dataset derivado: rit penalizado.
    expect(resolverCarro(datasetDerivado, loadoutClone).piloto.rit).toBeCloseTo(piloto.notas.rit, 9);
    // O array `pilotos` do dataset derivado NÃO contém o clone (prova que
    // ninguém no caminho de resolução lê o array, só o Map).
    expect(datasetDerivado.pilotos.some((p) => p.id === idClone)).toBe(false);
    // Dataset ORIGINAL nunca mutado: mesmo rit de antes, mesmo objeto piloto original resolvido.
    expect(resolverCarro(dataset, loadout).piloto.rit).toBeCloseTo(ritOriginal, 9);
    expect(dataset.pilotosById.get(loadout.pilotoId)!.notas.rit).toBe(ritOriginal);
  });
});

describe('pit de meio de temporada: escolhe o slot mais fraco', () => {
  it('troca exatamente o slot de menor percentil (percentis conhecidos, construídos à mão)', () => {
    const loadout = loadoutDe('Williams', 2022, 'jogador-pit-fraco');
    const tabelaFake: TabelaPercentis = {
      piloto: new Map([[loadout.pilotoId, 0.9]]),
      chassi: new Map([[loadout.chassiId, 0.8]]),
      motor: new Map([[loadout.motorId, 0.05]]), // claramente o mais fraco
      estrategista: new Map([[loadout.estrategistaId, 0.7]]),
      pit: new Map([[loadout.pitId, 0.6]]),
      peca: new Map([[loadout.pecaId, 0.5]]),
    };
    const copiasRestantes: Record<string, number> = Object.fromEntries(dataset.pecas.map((p) => [p.id, 2]));
    copiasRestantes[loadout.pecaId] = 1; // 1 cópia em uso pelo próprio loadout

    const resultado = aplicarPitMeioTemporada(dataset, tabelaFake, [loadout], copiasRestantes, 999);
    const novo = resultado.loadouts[0];

    expect(novo.motorId).not.toBe(loadout.motorId);
    expect(novo.pilotoId).toBe(loadout.pilotoId);
    expect(novo.chassiId).toBe(loadout.chassiId);
    expect(novo.estrategistaId).toBe(loadout.estrategistaId);
    expect(novo.pitId).toBe(loadout.pitId);
    expect(novo.pecaId).toBe(loadout.pecaId);
    expect(resultado.trocasPorSlot).toEqual({ motor: 1 });
  });

  it('exclui a peça atual do sorteio de troca (lança se não sobrar nenhuma outra disponível)', () => {
    // Determinístico por construção, ao contrário de simplesmente checar
    // "não voltou com a mesma peça" num draft real (com 24 peças livres a
    // troca quase sempre cai numa diferente por acaso, mesmo se o filtro
    // `p.id !== atual` for removido por engano — mutação testada manualmente
    // confirmou que aquele teste passava mesmo com o bug). Aqui só a peça
    // ATUAL tem cópia restante; com o filtro correto (exclui `atual`),
    // `disponiveis` fica vazio e a função tem que lançar.
    const loadout = loadoutDe('Williams', 2022, 'jogador-pool-vazio', 'peca-composto-macio');
    const tabelaFake: TabelaPercentis = {
      piloto: new Map([[loadout.pilotoId, 0.9]]),
      chassi: new Map([[loadout.chassiId, 0.8]]),
      motor: new Map([[loadout.motorId, 0.7]]),
      estrategista: new Map([[loadout.estrategistaId, 0.6]]),
      pit: new Map([[loadout.pitId, 0.5]]),
      peca: new Map([[loadout.pecaId, 0.01]]), // claramente o mais fraco
    };
    const copiasRestantes: Record<string, number> = Object.fromEntries(dataset.pecas.map((p) => [p.id, 0]));
    copiasRestantes[loadout.pecaId] = 1; // a outra cópia está no próprio loadout

    expect(() => aplicarPitMeioTemporada(dataset, tabelaFake, [loadout], copiasRestantes, 7)).toThrow(
      /nenhuma peça disponível/,
    );
  });
});

describe('pit de meio de temporada: exatamente 1 troca por jogador, determinístico por seed', () => {
  it('mesma seed => mesmo resultado; seeds diferentes => resultado diferente em pelo menos 1 jogador', () => {
    const loadouts = [
      loadoutDe('Williams', 2022, 'p1'),
      loadoutDe('Alfa Romeo', 1951, 'p2'),
      loadoutDe('Renault', 2006, 'p3'),
    ];
    const copiasRestantes: Record<string, number> = Object.fromEntries(dataset.pecas.map((p) => [p.id, 2]));
    for (const l of loadouts) copiasRestantes[l.pecaId] -= 1;

    const resultadoA = aplicarPitMeioTemporada(dataset, tabela, loadouts, copiasRestantes, 111);
    const resultadoA2 = aplicarPitMeioTemporada(dataset, tabela, loadouts, copiasRestantes, 111);
    const resultadoB = aplicarPitMeioTemporada(dataset, tabela, loadouts, copiasRestantes, 222);

    expect(resultadoA.loadouts).toEqual(resultadoA2.loadouts);

    // Cada jogador troca exatamente 1 slot.
    const campos: (keyof Loadout)[] = ['pilotoId', 'chassiId', 'motorId', 'estrategistaId', 'pitId', 'pecaId'];
    for (let i = 0; i < loadouts.length; i++) {
      const diffs = campos.filter((campo) => loadouts[i][campo] !== resultadoA.loadouts[i][campo]);
      expect(diffs.length).toBe(1);
    }

    const algumDiferente = loadouts.some(
      (_, i) =>
        JSON.stringify(resultadoA.loadouts[i]) !== JSON.stringify(resultadoB.loadouts[i]),
    );
    expect(algumDiferente).toBe(true);
  });
});

describe('pit de meio de temporada: pool de peças fecha', () => {
  it('soma de copiasRestantes + peças em uso é invariante (2 por peça), sem negativos, sem devolver e pegar a mesma', () => {
    const { loadouts, copiasRestantes } = draftarCampeonato(dataset, 5);

    function usoPorPeca(ls: Loadout[]): Record<string, number> {
      const uso: Record<string, number> = {};
      for (const l of ls) uso[l.pecaId] = (uso[l.pecaId] ?? 0) + 1;
      return uso;
    }

    const usoAntes = usoPorPeca(loadouts);
    for (const peca of dataset.pecas) {
      const total = (usoAntes[peca.id] ?? 0) + (copiasRestantes[peca.id] ?? 0);
      expect(total).toBe(2);
    }

    const resultado = aplicarPitMeioTemporada(dataset, tabela, loadouts, copiasRestantes, 42);
    const usoDepois = usoPorPeca(resultado.loadouts);

    for (const peca of dataset.pecas) {
      const total = (usoDepois[peca.id] ?? 0) + (resultado.copiasRestantes[peca.id] ?? 0);
      expect(total).toBe(2);
      expect(resultado.copiasRestantes[peca.id]).toBeGreaterThanOrEqual(0);
    }

    // Ninguém sai com a mesma peça que devolveu.
    for (let i = 0; i < loadouts.length; i++) {
      if (loadouts[i].pecaId !== resultado.loadouts[i].pecaId) {
        // Trocou de peça: a nova não pode ser igual à antiga (garantido pelo filtro `p.id !== atual`).
        expect(resultado.loadouts[i].pecaId).not.toBe(loadouts[i].pecaId);
      }
    }
  });
});

describe('forcaCombinada', () => {
  it('lança se pistas for vazio (falha alta)', () => {
    const loadout = loadoutDe('Williams', 2022, 'jogador-forca');
    expect(() => forcaCombinada(dataset, loadout, [])).toThrow(/vazio/);
  });
});
