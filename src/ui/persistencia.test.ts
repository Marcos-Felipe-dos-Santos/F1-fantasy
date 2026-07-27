/**
 * Testes de `persistencia.ts` (PR 6.5) — baseline vermelho escrito antes da
 * implementação (`src/ui/persistencia.ts` ainda não existe quando este
 * arquivo foi criado).
 *
 * Usa o dataset VIVO (`src/data/`), mesmo padrão de `fluxo-campeonato.test.ts`
 * — nenhum teste aqui depende de id específico de piloto/chassi/equipe.
 *
 * `Storage` é sempre um fake em memória (`criarStorageFake`), nunca
 * `window.localStorage` — o projeto não tem jsdom, e persistência tem que ser
 * testável sem DOM (ver `StorageLike` em `persistencia.ts`).
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnos from '../data/equipe-anos.json';
import pecas from '../data/pecas.json';
import pistas from '../data/pistas.json';
import type { DraftState, Jogador, Loadout } from '../engine/types';
import { avancarEtapa, calendarioPadrao, iniciarCampeonato } from './fluxo-campeonato';
import {
  calcularImpressaoDigital,
  carregarCampeonato,
  CHAVE_SAVE,
  limparSave,
  retomarCampeonato,
  salvarCampeonato,
  VERSAO_FORMATO,
  type SaveCampeonato,
  type StorageLike,
} from './persistencia';

const dataset = criarDataset(equipeAnos, pecas, pistas);

/** Constrói `n` loadouts distintos a partir das primeiras `n` equipe/anos do dataset (mesmo helper de `fluxo-campeonato.test.ts`). */
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

/**
 * Constrói um `DraftState` sintético já concluído a partir de `loadouts` —
 * suficiente pra exercitar `persistencia.ts` sem rodar o draft de verdade.
 * `sorteios`/`progresso`/`ordemPeca`/`copiasRestantes` ficam vazios de
 * propósito: `persistencia.ts` nunca os lê, só precisa que o shape bata com
 * `DraftState`.
 */
function draftDeTeste(loadouts: Loadout[]): DraftState {
  const jogadores: Jogador[] = loadouts.map((loadout) => ({ id: loadout.jogadorId, tipo: 'humano' }));
  const loadoutsRecord: Record<string, Loadout> = {};
  for (const loadout of loadouts) loadoutsRecord[loadout.jogadorId] = loadout;
  return {
    seed: 1,
    fase: 'concluido',
    jogadores,
    sorteios: {},
    progresso: {},
    ordemPeca: jogadores.map((j) => j.id),
    indicePeca: jogadores.length,
    pecasReveladas: null,
    copiasRestantes: {},
    loadouts: loadoutsRecord,
  };
}

/** Fake de `StorageLike` em memória (sem DOM/jsdom), com `Map` por baixo. */
function criarStorageFake(): StorageLike {
  const dados = new Map<string, string>();
  return {
    getItem: (chave: string) => (dados.has(chave) ? dados.get(chave)! : null),
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor);
    },
    removeItem: (chave: string) => {
      dados.delete(chave);
    },
  };
}

describe('calcularImpressaoDigital', () => {
  it('é determinística: mesmos dados produzem o mesmo hash em construções independentes', () => {
    const loadouts = loadoutsDeTeste(3);
    const calendario = calendarioPadrao(dataset);
    const estadoA = iniciarCampeonato(dataset, loadouts, 123, calendario);
    const estadoB = iniciarCampeonato(dataset, loadouts, 123, calendario);

    expect(calcularImpressaoDigital(estadoA.etapas[0])).toBe(calcularImpressaoDigital(estadoB.etapas[0]));
  });

  it('etapas diferentes (seeds diferentes) produzem hashes diferentes', () => {
    const loadouts = loadoutsDeTeste(3);
    const calendario = calendarioPadrao(dataset);
    const estadoA = iniciarCampeonato(dataset, loadouts, 123, calendario);
    const estadoB = iniciarCampeonato(dataset, loadouts, 456, calendario);

    expect(calcularImpressaoDigital(estadoA.etapas[0])).not.toBe(calcularImpressaoDigital(estadoB.etapas[0]));
  });
});

describe('salvarCampeonato / carregarCampeonato / retomarCampeonato — round-trip', () => {
  it('salvar → carregar → retomar devolve um EstadoCampeonato igual ao original, incluindo etapaAtual', () => {
    const loadouts = loadoutsDeTeste(4);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const seed = 777;
    const estadoOriginal = avancarEtapa(avancarEtapa(iniciarCampeonato(dataset, loadouts, seed, calendario)));
    expect(estadoOriginal.etapaAtual).toBe(2);

    const storage = criarStorageFake();
    salvarCampeonato(storage, seed, draft, estadoOriginal);

    const carregado = carregarCampeonato(storage);
    expect(carregado.ok).toBe(true);
    if (!carregado.ok) throw new Error('esperado carregamento ok');

    const retomado = retomarCampeonato(dataset, carregado.save);
    expect(retomado).toEqual(estadoOriginal);
  });

  it('o save NÃO contém resultado de corrida (tempoTotal, historicoVoltas) — só entrada', () => {
    const loadouts = loadoutsDeTeste(3);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 5, calendario);

    const storage = criarStorageFake();
    salvarCampeonato(storage, 5, draft, estado);

    const raw = storage.getItem(CHAVE_SAVE);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('tempoTotal');
    expect(raw).not.toContain('historicoVoltas');
    expect(raw).not.toContain('voltasDePit');
  });

  it('impressão digital divergente faz retomarCampeonato lançar (nunca devolve estado errado em silêncio)', () => {
    const loadouts = loadoutsDeTeste(3);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 9, calendario);

    const storage = criarStorageFake();
    salvarCampeonato(storage, 9, draft, estado);
    const carregado = carregarCampeonato(storage);
    if (!carregado.ok) throw new Error('esperado carregamento ok');

    const adulterado: SaveCampeonato = { ...carregado.save, impressaoDigital: 'impressao-adulterada' };
    expect(() => retomarCampeonato(dataset, adulterado)).toThrow(/impress/i);
  });

  it('etapaAtual fora de faixa no save faz retomarCampeonato lançar', () => {
    const loadouts = loadoutsDeTeste(2);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 2, calendario);

    const storage = criarStorageFake();
    salvarCampeonato(storage, 2, draft, estado);
    const carregado = carregarCampeonato(storage);
    if (!carregado.ok) throw new Error('esperado carregamento ok');

    const adulterado: SaveCampeonato = { ...carregado.save, etapaAtual: 999 };
    expect(() => retomarCampeonato(dataset, adulterado)).toThrow(/etapaAtual/);

    const adulteradoNegativo: SaveCampeonato = { ...carregado.save, etapaAtual: -1 };
    expect(() => retomarCampeonato(dataset, adulteradoNegativo)).toThrow(/etapaAtual/);
  });

  it('setItem que lança (quota cheia / modo privado) não derruba salvarCampeonato', () => {
    const loadouts = loadoutsDeTeste(2);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 1, calendario);

    const storageQueLanca: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };

    expect(() => salvarCampeonato(storageQueLanca, 1, draft, estado)).not.toThrow();
  });
});

describe('carregarCampeonato — motivos de falha', () => {
  it('ausente: nenhuma chave salva', () => {
    const storage = criarStorageFake();
    expect(carregarCampeonato(storage)).toEqual({ ok: false, motivo: 'ausente' });
  });

  it('json-invalido: chave presente mas com JSON malformado', () => {
    const storage = criarStorageFake();
    storage.setItem(CHAVE_SAVE, '{ isso não é json');
    expect(carregarCampeonato(storage)).toEqual({ ok: false, motivo: 'json-invalido' });
  });

  it('shape-invalido: JSON válido mas faltando campo obrigatório', () => {
    const storage = criarStorageFake();
    storage.setItem(CHAVE_SAVE, JSON.stringify({ versaoFormato: VERSAO_FORMATO, seed: 1 }));
    expect(carregarCampeonato(storage)).toEqual({ ok: false, motivo: 'shape-invalido' });
  });

  it('shape-invalido: campo com tipo errado (seed como string)', () => {
    const loadouts = loadoutsDeTeste(2);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 1, calendario);
    const storage = criarStorageFake();
    salvarCampeonato(storage, 1, draft, estado);

    const bruto = JSON.parse(storage.getItem(CHAVE_SAVE)!);
    bruto.seed = 'um';
    storage.setItem(CHAVE_SAVE, JSON.stringify(bruto));

    expect(carregarCampeonato(storage)).toEqual({ ok: false, motivo: 'shape-invalido' });
  });

  it('shape-invalido: jogador do draft sem loadout correspondente', () => {
    const loadouts = loadoutsDeTeste(2);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 1, calendario);
    const storage = criarStorageFake();
    salvarCampeonato(storage, 1, draft, estado);

    const bruto = JSON.parse(storage.getItem(CHAVE_SAVE)!);
    delete bruto.draft.loadouts['jogador-1'];
    storage.setItem(CHAVE_SAVE, JSON.stringify(bruto));

    expect(carregarCampeonato(storage)).toEqual({ ok: false, motivo: 'shape-invalido' });
  });

  it('versao-incompativel: versaoFormato diferente da atual', () => {
    const loadouts = loadoutsDeTeste(2);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 1, calendario);
    const storage = criarStorageFake();
    salvarCampeonato(storage, 1, draft, estado);

    const bruto = JSON.parse(storage.getItem(CHAVE_SAVE)!);
    bruto.versaoFormato = VERSAO_FORMATO + 1;
    storage.setItem(CHAVE_SAVE, JSON.stringify(bruto));

    expect(carregarCampeonato(storage)).toEqual({ ok: false, motivo: 'versao-incompativel' });
  });

  it('versao-incompativel PREVALECE sobre shape-invalido: save de versão futura com shape diferente ainda é reportado como versao-incompativel', () => {
    // Cenário mais realista que o de cima: uma versão futura do formato
    // normalmente muda o shape junto com o número — aqui simulado com um
    // save que só tem `versaoFormato` e nenhum outro campo do shape atual.
    // Reportar isso como `shape-invalido` seria tecnicamente verdade, mas
    // esconderia a causa real (é uma versão diferente, não um save
    // corrompido) — ver decisão de ordem em `carregarCampeonato`.
    const storage = criarStorageFake();
    storage.setItem(CHAVE_SAVE, JSON.stringify({ versaoFormato: VERSAO_FORMATO + 1, formatoTotalmenteDiferente: true }));

    expect(carregarCampeonato(storage)).toEqual({ ok: false, motivo: 'versao-incompativel' });
  });
});

describe('limparSave', () => {
  it('remove a chave de save', () => {
    const storage = criarStorageFake();
    storage.setItem(CHAVE_SAVE, '{}');
    limparSave(storage);
    expect(storage.getItem(CHAVE_SAVE)).toBeNull();
  });
});
