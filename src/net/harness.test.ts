/**
 * PR 3.2 — O TESTE QUE O DEV PEDIU: 22 clientes headless, com rede ruim,
 * produzindo o MESMO `DraftState`.
 *
 * Duas coisas fazem este arquivo valer alguma coisa, e nenhuma é o "verde":
 *
 * 1. **Os contadores.** "Configurei duplicação" não é "houve duplicação". Cada
 *    patologia é asserida como > 0 — senão uma execução em que o sorteio não
 *    injetou nada passaria alegremente sem testar nada. Este projeto já foi
 *    mordido por asserção vazia três vezes (a varredura flaky, o filtro de
 *    ausentes morto, o `if (alvo !== null)`).
 * 2. **O controle negativo.** Um harness que só sabe dizer "iguais" não
 *    distingue "convergiu" de "não sabe olhar". A sabotagem faz UM cliente
 *    escolher diferente, e o teste exige que a comparação FALHE ali.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { rodarHarness, SEM_PATOLOGIA, type Contadores, type ResultadoHarness } from './harness';
import { criarCliente, sincronizarDraft } from './cliente';
import { QTD_JOGADORES } from './tipos';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Rede feia de propósito: taxas altas pra que as patologias ocorram sempre. */
const REDE_RUIM = { atraso: 0.35, duplicacao: 0.2, perda: 0.15, desconexao: 0.0005 };

/** Os loadouts finais são o que decide a corrida — é a igualdade que importa. */
const loadoutsDe = (r: ResultadoHarness, jogadorId: string) =>
  r.draftsPorJogador.get(jogadorId)?.loadouts;

/** Todos os clientes que chegaram ao fim concordam entre si? */
function todosIguais(r: ResultadoHarness): { iguais: boolean; quantos: number; diferentes: string[] } {
  const ids = [...r.draftsPorJogador.keys()];
  if (ids.length === 0) return { iguais: false, quantos: 0, diferentes: [] };
  const referencia = JSON.stringify(loadoutsDe(r, ids[0]));
  const diferentes = ids.filter((id) => JSON.stringify(loadoutsDe(r, id)) !== referencia);
  return { iguais: diferentes.length === 0, quantos: ids.length, diferentes };
}

function relatorio(c: Contadores): string {
  return [
    `entregues=${c.entregues}`,
    `atrasadas=${c.atrasadas}`,
    `duplicadas=${c.duplicadas}`,
    `perdidas=${c.perdidas}`,
    `desconexoes=${c.desconexoes}`,
    `descartadosPorSeq=${c.descartadosPorSeq}`,
    `pecasPorHumano=${c.pecasPorHumano}`,
    `pecasPorAusencia=${c.pecasPorAusencia}`,
    `comandos=${c.comandosEnviados}`,
    `reconexoes=${c.reconexoes}`,
    `recusas=${JSON.stringify(c.recusas)}`,
  ].join(' ');
}

describe('harness headless — 22 clientes', () => {
  it('rede limpa: os 22 concluem o draft e concordam', () => {
    const r = rodarHarness({
      seed: 2026,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: SEM_PATOLOGIA,
    });
    expect(r.servidor.sala.draft?.fase).toBe('concluido');
    const { iguais, quantos, diferentes } = todosIguais(r);
    expect(quantos).toBe(QTD_JOGADORES);
    expect(diferentes, `clientes divergentes: ${diferentes.join(', ')}`).toEqual([]);
    expect(iguais).toBe(true);
  });

  it.each([2026, 7, 123456])(
    'seed %i — REDE RUIM (latência, reordenação, duplicação, perda): os 22 concordam',
    (seed) => {
      const r = rodarHarness({
        seed,
        qtdClientes: QTD_JOGADORES,
        dataset,
        patologias: REDE_RUIM,
      });

      // (1) As patologias TÊM que ter ocorrido — senão o verde não diz nada.
      const c = r.contadores;
      expect(c.atrasadas, `nenhum atraso injetado — ${relatorio(c)}`).toBeGreaterThan(0);
      expect(c.duplicadas, `nenhuma duplicata injetada — ${relatorio(c)}`).toBeGreaterThan(0);
      expect(c.perdidas, `nenhuma perda injetada — ${relatorio(c)}`).toBeGreaterThan(0);
      expect(c.descartadosPorSeq, `o filtro de seq nunca atuou — ${relatorio(c)}`).toBeGreaterThan(
        0,
      );

      // (2) O draft terminou e todos concordam.
      expect(r.servidor.sala.draft?.fase, relatorio(c)).toBe('concluido');
      const { quantos, diferentes } = todosIguais(r);
      expect(quantos, `só ${quantos} clientes chegaram ao fim — ${relatorio(c)}`).toBe(
        QTD_JOGADORES - r.desconectados.size,
      );
      expect(diferentes, `divergiram: ${diferentes.join(', ')} — ${relatorio(c)}`).toEqual([]);

      // (2b) 🔑 O CONTADOR QUE DÁ SENTIDO AO RESTO: os turnos de peça têm que ter
      // sido jogados por GENTE, não resolvidos por expiração. Antes do comando
      // `sincronizar`, 6 a 12 dos 22 eram cobertos por ausência — "os 22
      // concordam" era verdadeiro e praticamente oco, e uma regressão em que
      // TODOS expirassem passaria verde. Achado da revisão.
      expect(c.pecasPorHumano, `poucos turnos jogados por humano — ${relatorio(c)}`).toBeGreaterThan(
        QTD_JOGADORES * 0.7,
      );

      // (3) Todo mundo montou um loadout completo, e o draft de fato acabou
      // para eles — contar 22 chaves passaria com todos travados no mesmo lugar.
      for (const draft of r.draftsPorJogador.values()) {
        expect(draft.fase, `cliente não concluiu — ${relatorio(c)}`).toBe('concluido');
      }
      for (const [id, draft] of r.draftsPorJogador) {
        expect(Object.keys(draft.loadouts), `loadouts incompletos em ${id}`).toHaveLength(
          QTD_JOGADORES,
        );
      }
    },
  );

  it('a idempotência é exercitada: comandos sobre visão velha viram turno-divergente', () => {
    const r = rodarHarness({
      seed: 99,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: REDE_RUIM,
    });
    // Com atraso e perda, algum cliente inevitavelmente joga com visão velha.
    // Sem `turnoEsperado`, isso viraria jogada fantasma em vez de recusa.
    const recusas = r.contadores.recusas;
    const total = Object.values(recusas).reduce((a, b) => a + b, 0);
    expect(total, `nenhuma recusa — ${relatorio(r.contadores)}`).toBeGreaterThan(0);
    expect(
      recusas['turno-divergente'] ?? recusas['nao-e-sua-vez'] ?? 0,
      `nenhuma recusa de turno — ${relatorio(r.contadores)}`,
    ).toBeGreaterThan(0);
  });

  it('com DESCONEXÕES e um abandono, os que restam ainda concordam', () => {
    const r = rodarHarness({
      seed: 4242,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: { ...REDE_RUIM, desconexao: 0.0009 },
      abandonarNoPasso: 3,
    });
    expect(r.contadores.desconexoes, relatorio(r.contadores)).toBeGreaterThan(0);
    expect(r.servidor.sala.draft?.ausentes.length, relatorio(r.contadores)).toBeGreaterThan(0);
    expect(r.servidor.sala.draft?.fase, relatorio(r.contadores)).toBe('concluido');

    // Quem caiu para de receber snapshot e fica pra trás — só se comparam os
    // que continuaram na sala. O que importa é que ninguém CONVERGIU ERRADO.
    const { diferentes, quantos } = todosIguais(r);
    expect(quantos, `sobraram poucos conectados — ${relatorio(r.contadores)}`).toBe(
      QTD_JOGADORES - r.desconectados.size,
    );
    expect(quantos, relatorio(r.contadores)).toBeGreaterThan(QTD_JOGADORES / 2);
    expect(diferentes, `divergiram: ${diferentes.join(', ')}`).toEqual([]);
  });

  it('RECONEXÃO: quem cai volta com o token e converge com os demais (PR 3.2.1)', () => {
    // A razão de ser do 3.2.1. Sem o token, quem cai fica preso no roster
    // ocupando turno sem ter por onde jogar, até o cronômetro o expulsar — e a
    // sala inteira espera por ele.
    const r = rodarHarness({
      seed: 777,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: { ...REDE_RUIM, desconexao: 0.004, reconexao: 0.5 },
    });

    // A patologia TEM que ter ocorrido — a regra dos contadores vale aqui também.
    expect(r.contadores.desconexoes, relatorio(r.contadores)).toBeGreaterThan(0);
    expect(r.contadores.reconexoes, `ninguém reconectou — ${relatorio(r.contadores)}`).toBeGreaterThan(
      0,
    );
    expect(r.contadores.tokensRecusados, `token legítimo recusado — ${relatorio(r.contadores)}`).toBe(
      0,
    );

    expect(r.servidor.sala.draft?.fase, relatorio(r.contadores)).toBe('concluido');
    const { quantos, diferentes } = todosIguais(r);
    expect(diferentes, `divergiram: ${diferentes.join(', ')}`).toEqual([]);
    expect(quantos, relatorio(r.contadores)).toBeGreaterThan(QTD_JOGADORES / 2);
  });

  it('CONTROLE NEGATIVO: um cliente escolhendo diferente pelo AUSENTE é detectado', () => {
    // Sem isto, "os 22 iguais" não distingue convergência de cegueira.
    //
    // 🔴 E o alvo da sabotagem importa: a primeira versão sabotava a escolha
    // PRÓPRIA do cliente e NÃO divergia nada — medido — porque essa escolha vai
    // para o log e o log é a fonte da verdade dos 22. A única decisão que cada
    // cliente toma sozinho é a substituição do ausente. Por isso o teste
    // precisa de um abandono: sem ausente, não há o que sabotar.
    const r = rodarHarness({
      seed: 2026,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: SEM_PATOLOGIA,
      sabotagem: 'escolha-do-ausente-divergente',
      abandonarNoPasso: 2,
    });
    expect(r.servidor.sala.draft?.ausentes.length, 'sem ausente não há sabotagem').toBeGreaterThan(
      0,
    );
    const { iguais, diferentes } = todosIguais(r);
    expect(iguais, 'o harness NÃO detectou a divergência injetada').toBe(false);
    expect(diferentes.length).toBeGreaterThan(0);
  });

  it('é determinístico: mesma seed, mesmos contadores e mesmo resultado', () => {
    const opcoes = {
      seed: 31337,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: REDE_RUIM,
    };
    const a = rodarHarness(opcoes);
    const b = rodarHarness(opcoes);
    expect(b.contadores).toEqual(a.contadores);
    expect(b.passos).toBe(a.passos);
    const ids = [...a.draftsPorJogador.keys()];
    for (const id of ids) {
      expect(loadoutsDe(b, id)).toEqual(loadoutsDe(a, id));
    }
  });

  it('cliente × SERVIDOR: as coordenadas de turno batem (comparação não-tautológica)', () => {
    // Comparar os 22 entre si é fraco: todos replayam o mesmo log com a mesma
    // função. A comparação que vale é contra o SERVIDOR, que mantém o turno por
    // outro caminho (bookkeeping da rede, sem dataset) — duas implementações
    // independentes. Achado da revisão.
    const r = rodarHarness({
      seed: 606,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: REDE_RUIM,
      abandonarNoPasso: 5,
    });
    const noServidor = r.servidor.sala.draft!;
    expect(noServidor.fase).toBe('concluido');

    let comparados = 0;
    for (const [conexaoId, cliente] of r.clientes) {
      if (r.desconectados.has(conexaoId) || cliente.draft === null) continue;
      expect(cliente.draft.fase, `fase divergente em ${conexaoId}`).toBe('concluido');
      // Os ausentes que a REDE registrou e os que o CLIENTE deduziu do log.
      expect([...cliente.ausentes].sort(), `ausentes divergentes em ${conexaoId}`).toEqual(
        [...noServidor.ausentes].sort(),
      );
      comparados += 1;
    }
    expect(comparados, 'nenhum cliente comparado').toBeGreaterThan(10);
  });

  it('CLIENTE HOSTIL: escolha ilegal no log NÃO mata a sala', () => {
    // 🔴 O bloqueante C2 da revisão. O servidor não tem dataset e não pode
    // julgar o conteúdo da escolha; um cliente manda, na própria vez legítima,
    // um `pilotoId` inexistente. O evento entra no log append-only, que é
    // persistido e nunca encolhe. Antes da correção, TODOS os 22 passavam a
    // falhar ao reconstruir — sala morta para sempre, com uma mensagem.
    const r = rodarHarness({
      seed: 1234,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: SEM_PATOLOGIA,
      clienteHostil: 'conexao-05',
    });
    expect(r.servidor.sala.draft?.fase, 'a sala não concluiu com um cliente hostil').toBe(
      'concluido',
    );
    const { quantos, diferentes } = todosIguais(r);
    expect(quantos, 'clientes ficaram sem reconstruir a sala').toBe(QTD_JOGADORES);
    expect(diferentes, `divergiram: ${diferentes.join(', ')}`).toEqual([]);
  });

  it('a reconstrução INCREMENTAL é idêntica à reconstrução DO ZERO', () => {
    // O cliente avança o draft aplicando só o delta do log (o log é
    // append-only, então cada snapshot novo só acrescenta no fim). Se isso
    // divergisse de refazer tudo, um cliente que perdeu snapshots — e portanto
    // aplica um delta MAIOR de uma vez — acabaria num estado diferente de quem
    // acompanhou passo a passo. Com perda de 15%, isso acontece o tempo todo.
    const r = rodarHarness({
      seed: 8080,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: REDE_RUIM,
      abandonarNoPasso: 4,
    });
    expect(r.servidor.sala.draft?.ausentes.length, 'sem ausente o teste é fraco').toBeGreaterThan(
      0,
    );

    let comparados = 0;
    for (const [conexaoId, cliente] of r.clientes) {
      if (r.desconectados.has(conexaoId) || cliente.sala === null || cliente.draft === null) {
        continue;
      }
      // Reconstrução do zero: cliente virgem com o MESMO snapshot.
      const doZero = sincronizarDraft({ ...criarCliente(), sala: cliente.sala }, dataset);
      expect(doZero.draft, `incremental != do zero em ${conexaoId}`).toEqual(cliente.draft);
      comparados += 1;
    }
    expect(comparados, 'nenhum cliente comparado — o teste passou vazio').toBeGreaterThan(10);
  });

  it('o servidor e os clientes concordam sobre o log final', () => {
    const r = rodarHarness({
      seed: 555,
      qtdClientes: QTD_JOGADORES,
      dataset,
      patologias: REDE_RUIM,
    });
    const logServidor = r.servidor.sala.draft!.log;
    for (const [conexaoId, cliente] of r.clientes) {
      // Quem caiu parou de receber snapshot — comparar com ele mediria a
      // desconexão, não a convergência.
      if (r.desconectados.has(conexaoId)) continue;
      if (cliente.sala?.draft == null) continue;
      expect(cliente.sala.draft.log, `log divergente em ${conexaoId}`).toEqual(logServidor);
    }
  });
});
