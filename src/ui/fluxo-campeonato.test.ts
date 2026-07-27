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
import type { Loadout } from '../engine/types';
import {
  avancarEtapa,
  calendarioPadrao,
  campeonatoConcluido,
  classificacaoApos,
  FORMATO_PADRAO,
  iniciarCampeonato,
  N_ETAPAS,
  simularOResto,
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

  it('soma de voltas: temporada curta = 68, completa = 132', () => {
    const somaVoltas = (ids: string[]) =>
      ids.reduce((soma, id) => soma + dataset.pistasById.get(id)!.voltas, 0);

    expect(somaVoltas(calendarioPadrao(dataset, 'curta'))).toBe(68);
    expect(somaVoltas(calendarioPadrao(dataset, 'completa'))).toBe(132);
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
});
