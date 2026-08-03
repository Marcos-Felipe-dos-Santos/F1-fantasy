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
  type FormatoTemporada,
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
