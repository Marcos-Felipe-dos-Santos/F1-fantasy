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
import type { DraftState, EtapaCampeonato, Jogador, Loadout } from '../engine/types';
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

    expect(calcularImpressaoDigital(estadoA.etapas)).toBe(calcularImpressaoDigital(estadoB.etapas));
  });

  // Aviso A3 da revisão: comparar dois hashes no MESMO processo não prova
  // determinismo entre sessões — um `const SALT = Math.random()` no escopo do
  // módulo passava naquele teste e quebrava todo save em sessão nova. Este
  // golden de constante é a rede que falta: mata o salt, mata `localeCompare`
  // no lugar de `cmpString`, mata hash sem `posicao`/`status`/`pistaId` e mata
  // hash sem o `.sort()`.
  it('golden: hash de uma etapa sintética é uma constante congelada', () => {
    const etapa = {
      pistaId: 'pista-teste',
      grid: { grid: [] },
      resultado: {
        classificacao: [
          { jogadorId: 'b', posicao: 1, pontos: 25, status: 'terminou' },
          { jogadorId: 'a', posicao: 2, pontos: 18, status: 'terminou' },
          { jogadorId: 'c', posicao: 3, pontos: 0, status: 'dnf' },
        ],
      },
    } as unknown as EtapaCampeonato;

    expect(calcularImpressaoDigital([etapa])).toBe('10copny');
  });

  it('golden: a ordem de entrada da classificação não muda o hash (sort estável por jogadorId)', () => {
    const linha = (jogadorId: string, posicao: number, pontos: number) => ({
      jogadorId,
      posicao,
      pontos,
      status: 'terminou',
    });
    const monta = (ordem: ReturnType<typeof linha>[]) =>
      ({
        pistaId: 'pista-teste',
        grid: { grid: [] },
        resultado: { classificacao: ordem },
      }) as unknown as EtapaCampeonato;

    const a = linha('a', 2, 18);
    const b = linha('b', 1, 25);

    expect(calcularImpressaoDigital([monta([a, b])])).toBe(calcularImpressaoDigital([monta([b, a])]));
  });

  it('mesmos pontos em posições trocadas produzem hashes diferentes (countback do PR 6.2)', () => {
    const monta = (posA: number, posB: number) =>
      ({
        pistaId: 'pista-teste',
        grid: { grid: [] },
        resultado: {
          classificacao: [
            { jogadorId: 'a', posicao: posA, pontos: 10, status: 'terminou' },
            { jogadorId: 'b', posicao: posB, pontos: 10, status: 'terminou' },
          ],
        },
      }) as unknown as EtapaCampeonato;

    expect(calcularImpressaoDigital([monta(1, 2)])).not.toBe(calcularImpressaoDigital([monta(2, 1)]));
  });

  it('etapas diferentes (seeds diferentes) produzem hashes diferentes', () => {
    const loadouts = loadoutsDeTeste(3);
    const calendario = calendarioPadrao(dataset);
    const estadoA = iniciarCampeonato(dataset, loadouts, 123, calendario);
    const estadoB = iniciarCampeonato(dataset, loadouts, 456, calendario);

    expect(calcularImpressaoDigital(estadoA.etapas)).not.toBe(calcularImpressaoDigital(estadoB.etapas));
  });

  // BLOQUEANTE B1 da revisão, reproduzido: mudança que afeta SÓ uma etapa
  // tardia. Com a impressão digital cobrindo só a etapa 1, o hash batia, o
  // save era aceito, e a classificação final do campeonato mudava em silêncio.
  it('mudança que afeta só uma etapa TARDIA muda a impressão digital', () => {
    const loadouts = loadoutsDeTeste(6);
    const calendario = calendarioPadrao(dataset);
    const original = iniciarCampeonato(dataset, loadouts, 42, calendario);

    // Mexe só em Suzuka, a 5ª (última) etapa da temporada curta.
    const idSuzuka = calendario[4];
    const datasetMexido = {
      ...dataset,
      pistas: dataset.pistas.map((p) =>
        p.id === idSuzuka ? { ...p, desgaste: p.desgaste + 20, chanceChuva: 0.9 } : p,
      ),
    };
    datasetMexido.pistasById = new Map(datasetMexido.pistas.map((p) => [p.id, p]));
    const mexido = iniciarCampeonato(datasetMexido, loadouts, 42, calendario);

    // A etapa 1 continua idêntica — é isso que tornava o buraco invisível.
    expect(calcularImpressaoDigital([mexido.etapas[0]])).toBe(
      calcularImpressaoDigital([original.etapas[0]]),
    );
    // Mas o campeonato inteiro, não.
    expect(calcularImpressaoDigital(mexido.etapas)).not.toBe(
      calcularImpressaoDigital(original.etapas),
    );
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

    // LISTA BRANCA (aviso A2 da revisão): a lista negra de substrings acima
    // deixava passar 3 mutantes reais — gravar `grids`, gravar
    // `voltaMaisRapida` por etapa, ou cachear a classificação da etapa 1.
    // Nenhum contém as strings proibidas, e a invariante "só entrada" morria
    // sem ninguém notar. Este assert fecha a classe inteira: qualquer campo
    // novo no save quebra aqui e obriga uma decisão consciente.
    expect(Object.keys(JSON.parse(raw!)).sort()).toEqual([
      'calendario',
      'draft',
      'etapaAtual',
      'impressaoDigital',
      'seed',
      'versaoFormato',
    ]);
  });

  it('salvarCampeonato devolve false (sem lançar) quando o storage recusa a escrita', () => {
    const loadouts = loadoutsDeTeste(3);
    const draft = draftDeTeste(loadouts);
    const estado = iniciarCampeonato(dataset, loadouts, 5, calendarioPadrao(dataset));

    const storageHostil = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };

    // Aviso A4: não lança (a sessão em memória sobrevive), mas o chamador
    // PRECISA saber — senão o jogador fecha a aba confiando num save que não
    // aconteceu. O `false` é o que o 6.6 vai usar pra avisar na tela.
    expect(salvarCampeonato(storageHostil, 5, draft, estado)).toBe(false);
    expect(salvarCampeonato(criarStorageFake(), 5, draft, estado)).toBe(true);
  });

  it('carregarCampeonato não lança com storage hostil (getItem que lança vira "ausente")', () => {
    // O doc promete "NUNCA lança" — Safari com cookies bloqueados devolve
    // SecurityError em vez de null (aviso A5).
    const storageHostil = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    };

    expect(carregarCampeonato(storageHostil)).toEqual({ ok: false, motivo: 'ausente' });
  });

  it('limparSave não lança com storage hostil (removeItem que lança vira no-op)', () => {
    const storageHostil = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };

    expect(() => limparSave(storageHostil)).not.toThrow();
  });

  it('retomarCampeonato revalida o shape: save com jogador sem loadout lança claro, não estoura na engine', () => {
    const loadouts = loadoutsDeTeste(3);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioPadrao(dataset);
    const estado = iniciarCampeonato(dataset, loadouts, 7, calendario);

    const storage = criarStorageFake();
    salvarCampeonato(storage, 7, draft, estado);
    const carga = carregarCampeonato(storage);
    expect(carga.ok).toBe(true);
    if (!carga.ok) return;

    // Save construído à mão: o tipo é público, nada obriga a passar por
    // carregarCampeonato (aviso A1). Antes do guard isto virava
    // "Cannot read properties of undefined" lá dentro de campeonato.ts.
    const semLoadout = {
      ...carga.save,
      draft: {
        ...carga.save.draft,
        loadouts: Object.fromEntries(
          Object.entries(carga.save.draft.loadouts).filter(([id]) => id !== loadouts[1].jogadorId),
        ),
      },
    };

    expect(() => retomarCampeonato(dataset, semLoadout)).toThrow(/save inválido/);
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
