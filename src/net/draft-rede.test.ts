/**
 * PR 3.1b — unidade do redutor de turnos: log append-only, abandono,
 * cronômetro, idempotência e recusas. A conformidade com a engine está em
 * `conformidade-draft.test.ts` (o portão); aqui é o comportamento do redutor
 * isolado, incluindo o que a engine não tem — ausência, prazo e duplicata.
 */

import { describe, expect, it } from 'vitest';
import type { Jogador } from '../engine/types';
import { calcularOrdemPeca, RODADAS_SORTEIO } from '../engine/draft-utils';
import {
  criarDraftRede,
  deQuemEhAVez,
  expirados,
  expirarJogador,
  reduzirDraft,
  turnoCorrente,
} from './draft-rede';
import {
  MAX_BYTES_ESCOLHA,
  PRAZO_TURNO_MS,
  QTD_JOGADORES,
  RODADA_COMPLETA,
  VERSAO_ESTADO_DRAFT,
  type EstadoDraftRede,
} from './tipos';
import type { ComandoDraft } from './protocolo';

const SEED = 20260809;
const T0 = 1_000_000;
const ESCOLHA_PADRAO = { tipo: 'componente', slot: 'chassi' };

function roster(qtdHumanos: number): Jogador[] {
  return [
    ...Array.from(
      { length: qtdHumanos },
      (_, i): Jogador => ({
        id: `humano-${String(i + 1).padStart(2, '0')}`,
        tipo: 'humano',
        nome: `J${i + 1}`,
      }),
    ),
    ...Array.from(
      { length: QTD_JOGADORES - qtdHumanos },
      (_, i): Jogador => ({
        id: `bot-${String(i + 1).padStart(2, '0')}`,
        tipo: 'bot',
        perfilBot: 'passeio',
      }),
    ),
  ];
}

const novo = (qtdHumanos = 3): EstadoDraftRede => criarDraftRede(roster(qtdHumanos), SEED, T0);

/** Comando de escolha com a coordenada de turno CORRETA pro jogador informado. */
const cmd = (
  estado: EstadoDraftRede,
  jogadorId: string,
  escolha: unknown = ESCOLHA_PADRAO,
): ComandoDraft => ({
  tipo: 'escolher',
  escolha,
  turnoEsperado: turnoCorrente(estado, jogadorId),
});

function ok(
  estado: EstadoDraftRede,
  comando: ComandoDraft,
  remetenteId: string,
  agora = T0,
): EstadoDraftRede {
  const r = reduzirDraft(estado, comando, remetenteId, agora);
  expect(r.erro, `recusado: ${r.erro}`).toBeNull();
  return r.estado;
}

/** Monta o comando e aplica — o caminho feliz, que é a maioria dos casos. */
const jogar = (
  estado: EstadoDraftRede,
  jogadorId: string,
  escolha: unknown = ESCOLHA_PADRAO,
  agora = T0,
): EstadoDraftRede => ok(estado, cmd(estado, jogadorId, escolha), jogadorId, agora);

/** Leva a fase sorteios até o fim. */
function ateAFasePeca(estado: EstadoDraftRede): EstadoDraftRede {
  let atual = estado;
  let guarda = 0;
  while (atual.fase === 'sorteios') {
    if ((guarda += 1) > 500) throw new Error('laço travado');
    atual = jogar(atual, deQuemEhAVez(atual)[0]);
  }
  return atual;
}

describe('criação', () => {
  it('bots nascem completos e não aparecem entre os aptos', () => {
    const estado = novo(3);
    expect(estado.versao).toBe(VERSAO_ESTADO_DRAFT);
    expect(estado.fase).toBe('sorteios');
    expect(estado.humanos).toEqual(['humano-01', 'humano-02', 'humano-03']);
    for (const id of estado.jogadorIds) {
      expect(estado.rodada[id]).toBe(id.startsWith('bot-') ? RODADA_COMPLETA : 1);
    }
    expect(deQuemEhAVez(estado)).toEqual(['humano-01', 'humano-02', 'humano-03']);
  });

  it('RODADA_COMPLETA é DERIVADA do limiar da engine, não escrita solta', () => {
    expect(RODADA_COMPLETA).toBe(RODADAS_SORTEIO + 1);
  });

  it('a ordemPeca vem da MESMA função da engine, não de uma cópia da fórmula', () => {
    const r = roster(3);
    expect(novo(3).ordemPeca).toEqual(
      calcularOrdemPeca(
        r.map((j) => j.id),
        SEED,
      ),
    );
  });

  it('uma partida só de bots já nasce concluída', () => {
    expect(criarDraftRede(roster(0), SEED, T0).fase).toBe('concluido');
    expect(deQuemEhAVez(criarDraftRede(roster(0), SEED, T0))).toEqual([]);
  });
});

describe('fase sorteios (concorrente)', () => {
  it('qualquer humano pendente pode jogar, em qualquer ordem', () => {
    let estado = novo(3);
    estado = jogar(estado, 'humano-03');
    estado = jogar(estado, 'humano-01');
    expect(estado.rodada['humano-03']).toBe(2);
    expect(estado.rodada['humano-01']).toBe(2);
    expect(estado.rodada['humano-02']).toBe(1);
    expect(deQuemEhAVez(estado)).toEqual(['humano-01', 'humano-02', 'humano-03']);
  });

  it('quem completa as rodadas sai do conjunto de aptos', () => {
    let estado = novo(3);
    for (let i = 0; i < RODADAS_SORTEIO; i += 1) estado = jogar(estado, 'humano-02');
    expect(estado.rodada['humano-02']).toBe(RODADA_COMPLETA);
    expect(deQuemEhAVez(estado)).toEqual(['humano-01', 'humano-03']);
    expect(reduzirDraft(estado, cmd(estado, 'humano-02'), 'humano-02', T0).erro).toBe(
      'nao-e-sua-vez',
    );
  });

  it('a fase só vira quando o ÚLTIMO humano termina', () => {
    let estado = novo(2);
    for (let i = 0; i < RODADAS_SORTEIO; i += 1) estado = jogar(estado, 'humano-01');
    expect(estado.fase).toBe('sorteios');
    for (let i = 0; i < RODADAS_SORTEIO - 1; i += 1) estado = jogar(estado, 'humano-02');
    expect(estado.fase).toBe('sorteios');
    estado = jogar(estado, 'humano-02');
    expect(estado.fase).toBe('peca');
  });
});

describe('fase peça (estrita)', () => {
  it('só o jogador de ordemPeca[indicePeca] joga, e o ponteiro pula os bots', () => {
    const estado = ateAFasePeca(novo(3));
    expect(estado.fase).toBe('peca');
    const daVez = deQuemEhAVez(estado);
    expect(daVez).toHaveLength(1);
    expect(daVez[0]).toBe(estado.ordemPeca[estado.indicePeca]);
    expect(estado.humanos).toContain(daVez[0]);

    // TODO humano fora da vez é recusado — não só um.
    for (const outro of estado.humanos.filter((id) => id !== daVez[0])) {
      expect(reduzirDraft(estado, cmd(estado, outro), outro, T0).erro).toBe('nao-e-sua-vez');
    }
  });

  it('o draft conclui depois da última peça humana', () => {
    let estado = ateAFasePeca(novo(3));
    let guarda = 0;
    while (estado.fase === 'peca') {
      if ((guarda += 1) > 50) throw new Error('laço travado');
      estado = jogar(estado, deQuemEhAVez(estado)[0], { tipo: 'peca', pecaId: 'x' });
    }
    expect(estado.fase).toBe('concluido');
    expect(estado.indicePeca).toBe(estado.ordemPeca.length);
    expect(deQuemEhAVez(estado)).toEqual([]);
    expect(reduzirDraft(estado, cmd(estado, 'humano-01'), 'humano-01', T0).erro).toBe(
      'draft-concluido',
    );
  });
});

describe('idempotência (duplicata e reordenação da rede)', () => {
  it('o MESMO comando entregue duas vezes é aceito UMA vez', () => {
    const estado = novo(3);
    const comando = cmd(estado, 'humano-01');
    const depois = ok(estado, comando, 'humano-01');
    expect(depois.rodada['humano-01']).toBe(2);

    const repetido = reduzirDraft(depois, comando, 'humano-01', T0);
    expect(repetido.erro).toBe('turno-divergente');
    expect(repetido.estado).toBe(depois);
    expect(depois.rodada['humano-01']).toBe(2);
    expect(depois.log).toHaveLength(1);
  });

  it('duplicata na fase peça não faz o ponteiro andar duas casas', () => {
    const estado = ateAFasePeca(novo(3));
    const daVez = deQuemEhAVez(estado)[0];
    const comando = cmd(estado, daVez, { tipo: 'peca', pecaId: 'x' });
    const depois = ok(estado, comando, daVez);
    const indiceApos = depois.indicePeca;

    const repetido = reduzirDraft(depois, comando, daVez, T0);
    expect(repetido.erro).not.toBeNull();
    expect(repetido.estado.indicePeca).toBe(indiceApos);
  });

  it('coordenada de turno adiantada ou atrasada é recusada', () => {
    const estado = novo(3);
    for (const turnoEsperado of [0, 2, 99, -1]) {
      const r = reduzirDraft(
        estado,
        { tipo: 'escolher', escolha: ESCOLHA_PADRAO, turnoEsperado },
        'humano-01',
        T0,
      );
      expect(r.erro, `turnoEsperado=${turnoEsperado}`).toBe('turno-divergente');
      expect(r.estado).toBe(estado);
    }
  });

  it('turnoCorrente é a rodada na fase sorteios e o indicePeca na fase peça', () => {
    const estado = jogar(novo(3), 'humano-01');
    expect(turnoCorrente(estado, 'humano-01')).toBe(2);
    expect(turnoCorrente(estado, 'humano-02')).toBe(1);
    const naPeca = ateAFasePeca(estado);
    expect(turnoCorrente(naPeca, deQuemEhAVez(naPeca)[0])).toBe(naPeca.indicePeca);
  });
});

describe('tamanho do payload', () => {
  it('recusa escolha acima do teto de bytes', () => {
    const estado = novo(3);
    const gigante = { lixo: 'x'.repeat(MAX_BYTES_ESCOLHA) };
    const r = reduzirDraft(
      estado,
      { tipo: 'escolher', escolha: gigante, turnoEsperado: 1 },
      'humano-01',
      T0,
    );
    expect(r.erro).toBe('escolha-grande-demais');
    expect(r.estado).toBe(estado);
  });

  it('aceita escolha dentro do teto', () => {
    const estado = novo(3);
    const cabe = { lixo: 'x'.repeat(MAX_BYTES_ESCOLHA - 50) };
    expect(reduzirDraft(estado, cmd(estado, 'humano-01', cabe), 'humano-01', T0).erro).toBeNull();
  });

  it('recusa payload que nem serializa (ciclo)', () => {
    const estado = novo(3);
    const ciclico: Record<string, unknown> = {};
    ciclico.eu = ciclico;
    const r = reduzirDraft(
      estado,
      { tipo: 'escolher', escolha: ciclico, turnoEsperado: 1 },
      'humano-01',
      T0,
    );
    expect(r.erro).toBe('comando-invalido');
  });
});

describe('log append-only', () => {
  it('só cresce, com seq 1-based contíguo, e guarda a escolha opaca', () => {
    let estado = novo(3);
    const escolhas = [{ a: 1 }, { b: 2 }, { c: 3 }];
    estado = jogar(estado, 'humano-01', escolhas[0]);
    estado = jogar(estado, 'humano-03', escolhas[1]);
    estado = jogar(estado, 'humano-02', escolhas[2]);

    expect(estado.log.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(estado.log.map((e) => e.jogadorId)).toEqual(['humano-01', 'humano-03', 'humano-02']);
    expect(estado.log.map((e) => e.escolha)).toEqual(escolhas);
    expect(estado.log.every((e) => e.tipo === 'escolha')).toBe(true);
  });

  it('recusa não escreve no log', () => {
    const estado = jogar(novo(3), 'humano-01');
    const r = reduzirDraft(estado, cmd(estado, 'humano-01'), 'ninguem', T0);
    expect(r.erro).toBe('jogador-desconhecido');
    expect(r.estado.log).toHaveLength(1);
    expect(r.estado).toBe(estado);
  });

  it('o redutor nunca muta o estado recebido', () => {
    const estado = novo(3);
    const copia = structuredClone(estado);
    reduzirDraft(estado, cmd(estado, 'humano-01'), 'humano-01', T0);
    reduzirDraft(estado, { tipo: 'abandonar' }, 'humano-02', T0);
    expirarJogador(estado, 'humano-01', T0 + PRAZO_TURNO_MS);
    expect(estado).toEqual(copia);
  });
});

describe('recusas', () => {
  it.each([
    ['bot manda comando', 'bot-01'],
    ['id que não existe', 'ninguem'],
  ])('%s ⇒ jogador-desconhecido', (_caso, remetente) => {
    const estado = novo(3);
    expect(reduzirDraft(estado, cmd(estado, 'humano-01'), remetente, T0).erro).toBe(
      'jogador-desconhecido',
    );
  });

  it('remetente nulo é recusado', () => {
    const estado = novo(3);
    expect(reduzirDraft(estado, cmd(estado, 'humano-01'), null, T0).erro).toBe(
      'jogador-desconhecido',
    );
  });

  it('comando de tipo desconhecido ou coordenada não numérica é recusado sem lançar', () => {
    const estado = novo(3);
    const lixo = [
      { tipo: 'expirar' },
      {},
      { tipo: 'xpto' },
      { tipo: 'escolher', escolha: ESCOLHA_PADRAO },
      { tipo: 'escolher', escolha: ESCOLHA_PADRAO, turnoEsperado: '1' },
    ] as unknown as ComandoDraft[];
    for (const comando of lixo) {
      const r = reduzirDraft(estado, comando, 'humano-01', T0);
      expect(r.erro, `esperado recusar ${JSON.stringify(comando)}`).toBe('comando-invalido');
      expect(r.estado).toBe(estado);
    }
  });
});

describe('abandono', () => {
  it('quem abandona sai dos aptos e não bloqueia mais a fase sorteios', () => {
    let estado = novo(2);
    for (let i = 0; i < RODADAS_SORTEIO; i += 1) estado = jogar(estado, 'humano-01');
    expect(estado.fase).toBe('sorteios');
    estado = ok(estado, { tipo: 'abandonar' }, 'humano-02');
    expect(estado.ausentes).toEqual(['humano-02']);
    expect(estado.rodada['humano-02']).toBe(RODADA_COMPLETA);
    expect(estado.fase).not.toBe('sorteios');
  });

  it('quem abandona na vez dele da fase peça passa a vez adiante', () => {
    const antes = ateAFasePeca(novo(3));
    const daVez = deQuemEhAVez(antes)[0];
    const depois = ok(antes, { tipo: 'abandonar' }, daVez);
    expect(depois.ausentes).toEqual([daVez]);
    expect(deQuemEhAVez(depois)).not.toContain(daVez);
    expect(depois.indicePeca).toBeGreaterThan(antes.indicePeca);
  });

  it('a lista de ausentes é canônica, não a ordem de chegada dos abandonos', () => {
    const base = novo(3);
    const a = ok(ok(base, { tipo: 'abandonar' }, 'humano-03'), { tipo: 'abandonar' }, 'humano-01');
    const b = ok(ok(base, { tipo: 'abandonar' }, 'humano-01'), { tipo: 'abandonar' }, 'humano-03');
    expect(a.ausentes).toEqual(['humano-01', 'humano-03']);
    expect(b.ausentes).toEqual(a.ausentes);
  });

  it('abandonar duas vezes é recusado', () => {
    const estado = ok(novo(3), { tipo: 'abandonar' }, 'humano-01');
    expect(reduzirDraft(estado, { tipo: 'abandonar' }, 'humano-01', T0).erro).toBe(
      'jogador-ausente',
    );
    expect(reduzirDraft(estado, cmd(estado, 'humano-01'), 'humano-01', T0).erro).toBe(
      'jogador-ausente',
    );
  });

  it('se TODOS abandonam, o draft conclui em vez de travar', () => {
    let estado = novo(3);
    for (const id of ['humano-01', 'humano-02', 'humano-03']) {
      estado = ok(estado, { tipo: 'abandonar' }, id);
    }
    expect(estado.fase).toBe('concluido');
    expect(deQuemEhAVez(estado)).toEqual([]);
  });
});

describe('cronômetro (relógio injetado, nunca lido)', () => {
  it('ninguém expira antes do prazo, e expira exatamente nele', () => {
    const estado = novo(3);
    expect(expirados(estado, T0 + PRAZO_TURNO_MS - 1)).toEqual([]);
    expect(expirados(estado, T0 + PRAZO_TURNO_MS)).toEqual([
      'humano-01',
      'humano-02',
      'humano-03',
    ]);
  });

  it('escolher reinicia o relógio de quem escolheu (fase sorteios)', () => {
    const t1 = T0 + 50_000;
    const estado = jogar(novo(3), 'humano-02', ESCOLHA_PADRAO, t1);
    expect(estado.iniciadoEm['humano-02']).toBe(t1);
    expect(expirados(estado, T0 + PRAZO_TURNO_MS)).toEqual(['humano-01', 'humano-03']);
  });

  it('na fase peça o relógio começa quando a vez chega, não antes', () => {
    const tVirada = T0 + 500_000;
    let estado = novo(2);
    for (let i = 0; i < RODADAS_SORTEIO; i += 1) estado = jogar(estado, 'humano-01', ESCOLHA_PADRAO, T0);
    for (let i = 0; i < RODADAS_SORTEIO; i += 1) {
      estado = jogar(estado, 'humano-02', ESCOLHA_PADRAO, i === RODADAS_SORTEIO - 1 ? tVirada : T0);
    }
    expect(estado.fase).toBe('peca');
    const daVez = deQuemEhAVez(estado)[0];
    expect(estado.iniciadoEm[daVez]).toBe(tVirada);
    expect(expirados(estado, tVirada + PRAZO_TURNO_MS - 1)).toEqual([]);
  });

  it('o abandono de OUTRO jogador não devolve tempo a quem está com a vez', () => {
    // Regressão: `normalizar` reescrevia `iniciadoEm[daVez]` em toda passagem
    // pela fase peça. Quem travava a partida ganhava 90 s novos toda vez que
    // um terceiro abandonasse — e o cronômetro nunca disparava contra ele.
    const naPeca = ateAFasePeca(novo(3));
    const daVez = deQuemEhAVez(naPeca)[0];
    const relogioAntes = naPeca.iniciadoEm[daVez];
    const outro = naPeca.humanos.find((id) => id !== daVez)!;

    const depois = ok(naPeca, { tipo: 'abandonar' }, outro, T0 + 80_000);
    expect(deQuemEhAVez(depois)).toEqual([daVez]);
    expect(depois.iniciadoEm[daVez]).toBe(relogioAntes);
    expect(expirados(depois, T0 + PRAZO_TURNO_MS)).toEqual([daVez]);
  });

  it('expirarJogador marca ausente e passa a vez; o prazo é parametrizável', () => {
    const estado = novo(3);
    expect(expirados(estado, T0 + 10, 5)).toEqual(['humano-01', 'humano-02', 'humano-03']);
    const depois = expirarJogador(estado, 'humano-02', T0 + 10);
    expect(depois.erro).toBeNull();
    expect(depois.estado.ausentes).toEqual(['humano-02']);
    expect(depois.estado.log.at(-1)).toMatchObject({ jogadorId: 'humano-02', tipo: 'ausencia' });
  });

  it('expirar não é comando de cliente — nem sob o nome de um comando válido', () => {
    const estado = novo(3);
    const r = reduzirDraft(
      estado,
      { tipo: 'expirar', jogadorId: 'humano-02' } as unknown as ComandoDraft,
      'humano-01',
      T0 + PRAZO_TURNO_MS,
    );
    expect(r.erro).toBe('comando-invalido');
    expect(r.estado.ausentes).toEqual([]);
  });

  it('expirar quem não está na sala, ou já ausente, é recusado', () => {
    const estado = ok(novo(3), { tipo: 'abandonar' }, 'humano-01');
    expect(expirarJogador(estado, 'bot-01', T0).erro).toBe('jogador-desconhecido');
    expect(expirarJogador(estado, 'humano-01', T0).erro).toBe('jogador-ausente');
  });
});
