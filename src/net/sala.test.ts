/**
 * PR 3.1a — sala + roster congelado.
 *
 * O teste que dá sentido ao PR é o de CONFORMIDADE DO ROSTER: o array de 22
 * `Jogador` que a sala congela tem que ser IDÊNTICO ao que o caminho offline
 * já produz (`iniciarDraft(...).jogadores`), elemento a elemento e na mesma
 * ORDEM. A ordem não é cosmética — `criarDraft` embaralha `ordemPeca` a partir
 * de `jogadores.map(j => j.id)` (`draft.ts:73`), então dois clientes com o
 * mesmo conjunto de jogadores em ordens diferentes jogariam a rodada 6 em
 * ordens diferentes, em silêncio. A canária inversa ("a ordem REALMENTE
 * importa") está em `dependência de ordem na engine` — sem ela, uma mudança
 * futura na engine tornaria o `sort` peso morto sem ninguém notar.
 *
 * Este é o único arquivo de `src/net/` que pode importar de `src/ui/`: a
 * conformidade só existe se comparar com o caminho offline de verdade. O
 * eslint proíbe esse import no código de produção de `src/net/**`.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { criarDraft } from '../engine/draft';
import { deriveSeed } from '../engine/rng';
import {
  NAMESPACES_SEED,
  PREFIXO_ONLINE,
  namespaceDoRotulo,
} from '../engine/namespaces-seed';
import type { Dificuldade } from '../engine/types';
import { iniciarDraft, seedDeTexto } from '../ui/fluxo-draft';
import { congelarRoster, criarSala, publicarSala, reduzirSala, seedDoDraft } from './sala';
import { MIN_HUMANOS, QTD_JOGADORES, ROTULO_SEED_DRAFT, type EstadoSala } from './tipos';
import type { ComandoSala } from './protocolo';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

const SEED_MESTRE = seedDeTexto('sala-3.1a');

/** Instante fixo injetado no redutor — ele nunca lê relógio (regra de `src/net/`). */
const T0 = 1_000_000;

/** `reduzirSala` com o `agora` fixo deste arquivo, pra não repetir `T0` 24 vezes. */
const reduzir = (estado: EstadoSala, comando: ComandoSala, remetenteId: string | null) =>
  reduzirSala(estado, comando, remetenteId, T0);

function salaVazia(dificuldade: Dificuldade = 'dificil'): EstadoSala {
  return criarSala('sala-teste', SEED_MESTRE, dificuldade);
}

/** Aplica um comando, falhando o teste se for recusado. */
function ok(estado: EstadoSala, comando: ComandoSala, remetenteId: string | null): EstadoSala {
  const r = reduzir(estado, comando, remetenteId);
  expect(r.erro, `comando ${comando.tipo} recusado: ${r.erro}`).toBeNull();
  return r.estado;
}

/** Faz `n` humanos entrarem, na ordem, e devolve o estado. */
function comHumanos(estado: EstadoSala, nomes: string[]): EstadoSala {
  let atual = estado;
  for (const nome of nomes) atual = ok(atual, { tipo: 'entrar', nome }, null);
  return atual;
}

function todosProntos(estado: EstadoSala): EstadoSala {
  let atual = estado;
  for (const j of estado.jogadores) {
    atual = ok(atual, { tipo: 'pronto', pronto: true }, j.id);
  }
  return atual;
}

const nomesDe = (n: number): string[] => Array.from({ length: n }, (_, i) => `Jogador ${i + 1}`);

/** Sala com `n` humanos, todos prontos, ainda aberta. */
function salaPronta(n: number, dificuldade: Dificuldade = 'dificil'): EstadoSala {
  return todosProntos(comHumanos(salaVazia(dificuldade), nomesDe(n)));
}

/** Sala já iniciada (roster congelado) com `n` humanos. */
function salaIniciada(n: number, dificuldade: Dificuldade = 'dificil'): EstadoSala {
  const pronta = salaPronta(n, dificuldade);
  return ok(pronta, { tipo: 'iniciar' }, pronta.anfitriaoId);
}

const idHumano = (i: number): string => `humano-${String(i).padStart(2, '0')}`;

describe('entrada e saída (sala aberta)', () => {
  it('aloca ids humano-01.. em sequência, com padding de 2 dígitos', () => {
    const sala = comHumanos(salaVazia(), ['Ana', 'Beto']);
    expect(sala.jogadores.map((j) => j.id)).toEqual(['humano-01', 'humano-02']);
    expect(sala.jogadores.map((j) => j.nome)).toEqual(['Ana', 'Beto']);
  });

  it('devolve o id alocado no resultado do comando entrar', () => {
    const r = reduzir(salaVazia(), { tipo: 'entrar', nome: 'Ana' }, null);
    expect(r.erro).toBeNull();
    expect(r.jogadorId).toBe('humano-01');
  });

  it('o primeiro a entrar vira anfitrião; se ele sai, o menor id restante assume', () => {
    const sala = comHumanos(salaVazia(), ['Ana', 'Beto', 'Caio']);
    expect(sala.anfitriaoId).toBe('humano-01');
    expect(ok(sala, { tipo: 'sair' }, 'humano-01').anfitriaoId).toBe('humano-02');
  });

  it('quem sai sem ser anfitrião não muda o anfitrião', () => {
    const sala = comHumanos(salaVazia(), ['Ana', 'Beto', 'Caio']);
    expect(ok(sala, { tipo: 'sair' }, 'humano-02').anfitriaoId).toBe('humano-01');
  });

  it('sala vazia não tem anfitrião', () => {
    const sala = ok(comHumanos(salaVazia(), ['Ana']), { tipo: 'sair' }, 'humano-01');
    expect(sala.jogadores).toEqual([]);
    expect(sala.anfitriaoId).toBeNull();
  });

  it('sair libera o id, e o próximo a entrar reusa o MENOR id livre', () => {
    const sala = ok(comHumanos(salaVazia(), ['Ana', 'Beto', 'Caio']), { tipo: 'sair' }, 'humano-02');
    const r = reduzir(sala, { tipo: 'entrar', nome: 'Dani' }, null);
    expect(r.jogadorId).toBe('humano-02');
    // E a lista continua em ordem canônica crescente de id.
    expect(r.estado.jogadores.map((j) => j.id)).toEqual(['humano-01', 'humano-02', 'humano-03']);
    expect(r.estado.jogadores.map((j) => j.nome)).toEqual(['Ana', 'Dani', 'Caio']);
  });

  it('ANFITRIÃO É PEGAJOSO: quem reusa o id do anfitrião que saiu NÃO vira anfitrião', () => {
    // Ana(01) anfitriã, Beto(02), Caio(03). Ana sai ⇒ Beto assume. Dani entra
    // e recebe o `humano-01` vago — mas o posto continua sendo do Beto.
    const semAna = ok(comHumanos(salaVazia(), ['Ana', 'Beto', 'Caio']), { tipo: 'sair' }, 'humano-01');
    expect(semAna.anfitriaoId).toBe('humano-02');
    const r = reduzir(semAna, { tipo: 'entrar', nome: 'Dani' }, null);
    expect(r.jogadorId).toBe('humano-01');
    expect(r.estado.anfitriaoId).toBe('humano-02');
    // E a Dani não consegue iniciar a partida pelos outros.
    const prontos = todosProntos(r.estado);
    expect(reduzir(prontos, { tipo: 'iniciar' }, 'humano-01').erro).toBe('nao-e-anfitriao');
  });

  it('recusa a 23ª entrada (sala cheia)', () => {
    const cheia = comHumanos(salaVazia(), nomesDe(QTD_JOGADORES));
    expect(cheia.jogadores).toHaveLength(QTD_JOGADORES);
    expect(cheia.jogadores[QTD_JOGADORES - 1].id).toBe('humano-22');
    const r = reduzir(cheia, { tipo: 'entrar', nome: 'Tarde demais' }, null);
    expect(r.erro).toBe('sala-cheia');
    expect(r.estado).toBe(cheia);
  });

  it('recusa nome vazio ou só de espaços, e apara o nome aceito', () => {
    expect(reduzir(salaVazia(), { tipo: 'entrar', nome: '   ' }, null).erro).toBe(
      'nome-invalido',
    );
    const r = reduzir(salaVazia(), { tipo: 'entrar', nome: '  Ana  ' }, null);
    expect(r.erro).toBeNull();
    expect(r.estado.jogadores[0].nome).toBe('Ana');
  });

  it('recusa quem já está na sala tentando entrar de novo', () => {
    const sala = comHumanos(salaVazia(), ['Ana']);
    expect(reduzir(sala, { tipo: 'entrar', nome: 'Ana de novo' }, 'humano-01').erro).toBe(
      'ja-na-sala',
    );
  });

  it('recusa sair/pronto de quem não está na sala — inclusive de remetente nulo', () => {
    const sala = salaPronta(2);
    expect(reduzir(sala, { tipo: 'sair' }, 'humano-09').erro).toBe('jogador-desconhecido');
    expect(reduzir(sala, { tipo: 'pronto', pronto: true }, 'humano-09').erro).toBe(
      'jogador-desconhecido',
    );
    expect(reduzir(sala, { tipo: 'sair' }, null).erro).toBe('jogador-desconhecido');
    expect(reduzir(sala, { tipo: 'iniciar' }, null).erro).toBe('nao-e-anfitriao');
  });

  it('pronto liga e desliga, e só mexe em quem mandou o comando', () => {
    let sala = comHumanos(salaVazia(), ['Ana', 'Beto']);
    sala = ok(sala, { tipo: 'pronto', pronto: true }, 'humano-01');
    expect(sala.jogadores.map((j) => j.pronto)).toEqual([true, false]);
    sala = ok(sala, { tipo: 'pronto', pronto: false }, 'humano-01');
    expect(sala.jogadores.map((j) => j.pronto)).toEqual([false, false]);
  });

  it('recusa comando de tipo desconhecido e payload de tipo errado, sem lançar', () => {
    const sala = salaPronta(2);
    const lixo = [
      { tipo: 'xpto' },
      {},
      { tipo: 'entrar', nome: null },
      { tipo: 'entrar', nome: 42 },
      { tipo: 'pronto', pronto: 'sim' },
    ] as unknown as ComandoSala[];
    for (const comando of lixo) {
      const r = reduzir(sala, comando, 'humano-01');
      expect(r.erro, `esperado recusar ${JSON.stringify(comando)}`).not.toBeNull();
      expect(r.estado).toBe(sala);
    }
  });

  it('o redutor nunca muta o estado recebido', () => {
    const sala = salaPronta(2);
    const copia = structuredClone(sala);
    reduzir(sala, { tipo: 'entrar', nome: 'Caio' }, null);
    reduzir(sala, { tipo: 'sair' }, 'humano-01');
    reduzir(sala, { tipo: 'pronto', pronto: false }, 'humano-02');
    reduzir(sala, { tipo: 'iniciar' }, 'humano-01');
    expect(sala).toEqual(copia);
  });
});

describe('seq (sequência monotônica)', () => {
  it('avança em comando aceito e NÃO avança em recusa', () => {
    const sala = comHumanos(salaVazia(), ['Ana', 'Beto']);
    expect(sala.seq).toBe(2);
    const aceito = ok(sala, { tipo: 'pronto', pronto: true }, 'humano-01');
    expect(aceito.seq).toBe(3);
    const recusado = reduzir(aceito, { tipo: 'iniciar' }, 'humano-02');
    expect(recusado.erro).toBe('nao-e-anfitriao');
    expect(recusado.estado.seq).toBe(3);
  });
});

describe('início da partida (congelamento)', () => {
  it('só o anfitrião inicia', () => {
    const sala = salaPronta(3);
    expect(reduzir(sala, { tipo: 'iniciar' }, 'humano-02').erro).toBe('nao-e-anfitriao');
    expect(reduzir(sala, { tipo: 'iniciar' }, 'humano-01').erro).toBeNull();
  });

  it(`exige ao menos ${MIN_HUMANOS} humanos`, () => {
    const sala = salaPronta(MIN_HUMANOS - 1);
    expect(reduzir(sala, { tipo: 'iniciar' }, 'humano-01').erro).toBe(
      'jogadores-insuficientes',
    );
  });

  it('exige todos prontos', () => {
    const sala = ok(salaPronta(3), { tipo: 'pronto', pronto: false }, 'humano-03');
    expect(reduzir(sala, { tipo: 'iniciar' }, 'humano-01').erro).toBe('nem-todos-prontos');
  });

  it('iniciar congela o roster e muda a fase', () => {
    const sala = salaIniciada(3);
    expect(sala.fase).toBe('iniciada');
    expect(sala.roster).toHaveLength(QTD_JOGADORES);
  });

  it('depois de iniciada, o roster está CONGELADO: entrar/sair/pronto/iniciar são recusados', () => {
    const sala = salaIniciada(3);
    const comandos: ComandoSala[] = [
      { tipo: 'entrar', nome: 'Atrasado' },
      { tipo: 'sair' },
      { tipo: 'pronto', pronto: false },
      { tipo: 'iniciar' },
    ];
    for (const comando of comandos) {
      const r = reduzir(sala, comando, 'humano-01');
      expect(r.erro, `esperado recusar ${comando.tipo} com a sala iniciada`).toBe('sala-iniciada');
      expect(r.estado).toBe(sala);
    }
  });
});

describe('seed: a mestra fica no servidor', () => {
  it('criarSala normaliza a seed pra uint32', () => {
    expect(criarSala('s', -1, 'dificil').seedMestre).toBe(4294967295);
    expect(criarSala('s', 2 ** 32 + 7, 'dificil').seedMestre).toBe(7);
  });

  it('o rótulo de seed do online usa o prefixo reservado `online:`', () => {
    // A guarda contra colisão de namespace do `deriveSeed` (risco aprovado da
    // Fase 3). O registro central mora em `src/engine/namespaces-seed.ts`; a
    // varredura de lá não enxerga este rótulo porque ele vem de constante, e é
    // por isso que a asserção sobre o VALOR está aqui.
    expect(namespaceDoRotulo(ROTULO_SEED_DRAFT)).toBe(PREFIXO_ONLINE);
    expect(NAMESPACES_SEED.map((n) => n.prefixo)).toContain(PREFIXO_ONLINE);
  });

  it('publicarSala NÃO expõe a seedMestre e publica a seed derivada do draft', () => {
    const sala = salaIniciada(2);
    const publico = publicarSala(sala);
    expect(Object.keys(publico)).not.toContain('seedMestre');
    expect(JSON.stringify(publico)).not.toContain(String(sala.seedMestre));
    expect(publico.seedDraft).toBe(deriveSeed(sala.seedMestre, ROTULO_SEED_DRAFT));
    expect(publico.seedDraft).not.toBe(sala.seedMestre);
  });

  it('publicarSala preserva todo o resto do estado', () => {
    const sala = salaIniciada(3);
    const semSeed: Partial<EstadoSala> = structuredClone(sala);
    delete semSeed.seedMestre;
    expect(publicarSala(sala)).toEqual({ ...semSeed, seedDraft: seedDoDraft(sala) });
  });

  it('o roster é congelado com a seed DERIVADA, não com a mestra', () => {
    const sala = salaIniciada(3);
    expect(sala.roster).toEqual(
      congelarRoster(sala.jogadores, seedDoDraft(sala), sala.dificuldade),
    );
    expect(sala.roster).not.toEqual(
      congelarRoster(sala.jogadores, sala.seedMestre, sala.dificuldade),
    );
  });
});

describe('conformidade do roster com a engine', () => {
  const TEXTO_SEED = 'conformidade-3.1a';
  const SEED_OFFLINE = seedDeTexto(TEXTO_SEED);

  const humanosOffline = (n: number): { id: string; nome: string }[] =>
    nomesDe(n).map((nome, i) => ({ id: idHumano(i + 1), nome }));

  it.each([
    ['dificil' as const, 2],
    ['dificil' as const, 5],
    ['facil' as const, 3],
    ['facil' as const, 2],
    ['dificil' as const, QTD_JOGADORES],
    ['facil' as const, QTD_JOGADORES],
  ])(
    'dificuldade %s com %i humanos: o roster congelado é IDÊNTICO ao de iniciarDraft (ordem inclusive)',
    (dificuldade, qtd) => {
      const sala = salaPronta(qtd, dificuldade);
      const online = congelarRoster(sala.jogadores, SEED_OFFLINE, dificuldade);
      const offline = iniciarDraft(dataset, TEXTO_SEED, dificuldade, humanosOffline(qtd)).jogadores;
      expect(online).toEqual(offline);
    },
  );

  it('o roster congelado é aceito por criarDraft e produz o mesmo draft do caminho offline', () => {
    const sala = salaPronta(3);
    const online = congelarRoster(sala.jogadores, SEED_OFFLINE, 'dificil');
    const offline = iniciarDraft(dataset, TEXTO_SEED, 'dificil', humanosOffline(3)).jogadores;
    const draftOnline = criarDraft(dataset, online, SEED_OFFLINE);
    const draftOffline = criarDraft(dataset, offline, SEED_OFFLINE);
    expect(draftOnline.ordemPeca).toEqual(draftOffline.ordemPeca);
    expect(draftOnline.sorteios).toEqual(draftOffline.sorteios);
  });

  it('CANÁRIA INVERSA: a ordem do array REALMENTE muda o draft na engine', () => {
    // Se esta asserção passar a falhar, `criarDraft` deixou de depender da
    // ordem — e aí o `sort(porId)` de `congelarRoster` virou peso morto e os
    // comentários que o justificam viraram mentira. É pra isso que ela existe.
    const roster = salaIniciada(4).roster!;
    const invertido = [...roster].reverse();
    expect(criarDraft(dataset, invertido, SEED_OFFLINE).ordemPeca).not.toEqual(
      criarDraft(dataset, roster, SEED_OFFLINE).ordemPeca,
    );
  });

  it('a ORDEM interna da sala não pode influenciar o roster (ordem canônica por id)', () => {
    // Exercita `congelarRoster` direto: mesmos jogadores, array embaralhado.
    const sala = salaIniciada(4);
    const embaralhados = [...sala.jogadores].reverse();
    expect(congelarRoster(embaralhados, seedDoDraft(sala), sala.dificuldade)).toEqual(sala.roster);
  });

  it('todo bot do roster tem perfilBot definido (pré-condição dura de criarDraft)', () => {
    const sala = salaIniciada(2);
    const bots = sala.roster!.filter((j) => j.tipo === 'bot');
    expect(bots).toHaveLength(QTD_JOGADORES - 2);
    expect(bots.every((b) => b.perfilBot !== undefined)).toBe(true);
    expect(new Set(sala.roster!.map((j) => j.id)).size).toBe(QTD_JOGADORES);
  });

  it('com a sala cheia de humanos o roster não tem bot nenhum', () => {
    const sala = salaIniciada(QTD_JOGADORES);
    expect(sala.roster!.every((j) => j.tipo === 'humano')).toBe(true);
  });

  it('o roster sobrevive a um round-trip de JSON sem mudar o draft (o DO serializa)', () => {
    const sala = salaIniciada(3);
    const viaJson = JSON.parse(JSON.stringify(sala.roster)) as typeof sala.roster;
    expect(criarDraft(dataset, viaJson!, SEED_OFFLINE).ordemPeca).toEqual(
      criarDraft(dataset, sala.roster!, SEED_OFFLINE).ordemPeca,
    );
  });
});
