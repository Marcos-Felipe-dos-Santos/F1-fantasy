import { expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipes from '../fixtures/dataset-semente/equipe-anos.json';
import pecas from '../fixtures/dataset-semente/pecas.json';
import pistas from '../fixtures/dataset-semente/pistas.json';
import { revelarRodada } from '../engine/draft';
import { encontrarEquipeAno } from '../engine/draft-utils';
import { controleRerolls } from '../engine/rerolls';
import { criarCliente, aplicarMensagem, sincronizarDraft } from './cliente';
import { aoReceber, criarServidor, type EstadoServidor } from './servidor-sala';
import { publicarSala } from './sala';
import { VERSAO_PROTOCOLO } from './protocolo';
import { hashDoDraft } from './hash-draft';

const dataset = criarDataset(
  equipes.map((e, i) => ({ ...e, equipe: 'Unica', ano: 2000 + i })),
  pecas,
  pistas,
);
function mandar(s: EstadoServidor, id: string, cmd: unknown) {
  return aoReceber(s, id, JSON.stringify(cmd), 100, `token-${id}`);
}
function iniciar() {
  let s = criarServidor(
    'teste',
    42,
    'dificil',
    100,
    { etapas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], calendario: 11 },
    5,
  );
  for (const id of ['a', 'b']) s = mandar(s, id, { tipo: 'entrar', nome: id }).estado;
  for (const id of ['a', 'b']) s = mandar(s, id, { tipo: 'pronto', pronto: true }).estado;
  return mandar(s, 'a', { tipo: 'iniciar' }).estado;
}
const mensagem = (s: EstadoServidor) => ({
  tipo: 'estado' as const,
  versaoProtocolo: VERSAO_PROTOCOLO,
  estado: publicarSala(s.sala),
});

it('pool vazio fica no log, replicas concordam e F5 não escolhe automaticamente', () => {
  let s = iniciar();
  let c = sincronizarDraft(aplicarMensagem(criarCliente(), mensagem(s)), dataset);
  const sorteios = structuredClone(c.draft!.sorteios);
  const prazo = structuredClone(s.sala.draft!.iniciadoEm);
  for (let i = 0; i < 6; i++) {
    for (const id of ['a', 'b']) {
      const r = mandar(s, id, {
        tipo: 'reroll',
        alvo: 'marca',
        turnoEsperado: 1,
        revisaoEsperada: i,
      });
      expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
      s = r.estado;
      c = sincronizarDraft(aplicarMensagem(c, mensagem(s)), dataset);
    }
  }
  expect(s.sala.draft!.iniciadoEm).toEqual(prazo);
  expect(c.draft!.sorteios).toEqual(sorteios);
  for (const id of ['humano-01', 'humano-02']) {
    expect(controleRerolls(c.draft!, id)).toMatchObject({
      revisao: 6,
      comunsUsados: 0,
      especialUsado: false,
    });
    expect(s.sala.draft!.revisoes[id]).toBe(6);
    expect(c.draft!.progresso[id].rodada).toBe(1);
    expect(c.resultadosReroll[id].resultado).toBe('pool-vazio');
  }
  const f5 = sincronizarDraft(
    aplicarMensagem(criarCliente(), mensagem(JSON.parse(JSON.stringify(s)))),
    dataset,
  );
  expect(f5.draft).toEqual(c.draft);
  expect(f5.resultadosReroll).toEqual(c.resultadosReroll);
  expect(hashDoDraft(f5.draft!)).toBe(hashDoDraft(c.draft!));
  expect(sincronizarDraft(c, dataset).draft).toBe(c.draft);
  expect(
    mandar(s, 'a', {
      tipo: 'escolher',
      escolha: { tipo: 'componente', slot: 'chassi' },
      turnoEsperado: 1,
      revisaoEsperada: 0,
    }).envios[0].mensagem,
  ).toEqual({ tipo: 'erro', erro: 'revisao-divergente' });
  expect(
    mandar(s, 'estranho', { tipo: 'reroll', alvo: 'ano', turnoEsperado: 1, revisaoEsperada: 0 })
      .estado,
  ).toBe(s);
});

it('interleaving entre humanos preserva hash e revisões individuais', () => {
  const jogar = (ordem: string[]) => {
    let s = iniciar();
    for (const id of ordem) {
      const jogador = s.jogadorPorConexao[id];
      s = mandar(s, id, {
        tipo: 'reroll',
        alvo: 'ano',
        turnoEsperado: 1,
        revisaoEsperada: s.sala.draft!.revisoes[jogador],
      }).estado;
    }
    return sincronizarDraft(aplicarMensagem(criarCliente(), mensagem(s)), dataset);
  };
  const a = jogar(['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b']);
  const b = jogar(['b', 'b', 'b', 'b', 'a', 'a', 'a', 'a']);
  expect(a.draft).toEqual(b.draft);
  expect(hashDoDraft(a.draft!)).toBe(hashDoDraft(b.draft!));
});

it('dois clientes + F5: cota e pool vazio revisam igualmente; escolhas posteriores convergem ate o fim', () => {
  let s = iniciar();
  let a = sincronizarDraft(aplicarMensagem(criarCliente(), mensagem(s)), dataset);
  let b = sincronizarDraft(aplicarMensagem(criarCliente(), mensagem(s)), dataset);
  const conferir = () => {
    a = sincronizarDraft(aplicarMensagem(a, mensagem(s)), dataset);
    b = sincronizarDraft(aplicarMensagem(b, mensagem(s)), dataset);
    expect(a.draft).toEqual(b.draft);
    expect(hashDoDraft(a.draft!)).toBe(hashDoDraft(b.draft!));
    for (const id of s.sala.draft!.humanos)
      expect(controleRerolls(a.draft!, id).revisao).toBe(s.sala.draft!.revisoes[id]);
  };
  const reroll = (id: string, alvo: 'marca' | 'ano') => {
    const jogador = s.jogadorPorConexao[id];
    const r = mandar(s, id, {
      tipo: 'reroll',
      alvo,
      turnoEsperado: s.sala.draft!.rodada[jogador],
      revisaoEsperada: s.sala.draft!.revisoes[jogador],
    });
    expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
    s = r.estado;
    conferir();
  };
  reroll('a', 'marca');
  expect(a.resultadosReroll['humano-01'].resultado).toBe('pool-vazio');
  for (let i = 0; i < 3; i++) {
    reroll('a', 'ano');
    expect(a.resultadosReroll['humano-01'].resultado).toBe('aplicado');
    reroll('b', 'ano');
    expect(b.resultadosReroll['humano-02'].resultado).toBe('aplicado');
  }
  reroll('a', 'ano');
  reroll('b', 'ano');
  expect(a.resultadosReroll['humano-01'].resultado).toBe('cota-esgotada');
  expect(b.resultadosReroll['humano-02'].resultado).toBe('cota-esgotada');
  b = sincronizarDraft(
    aplicarMensagem(criarCliente(), mensagem(JSON.parse(JSON.stringify(s)))),
    dataset,
  );
  expect(b.draft).toEqual(a.draft);
  while (s.sala.draft!.fase !== 'concluido') {
    const rede = s.sala.draft!;
    const jogador =
      rede.fase === 'sorteios'
        ? rede.humanos.find((id) => rede.rodada[id] <= 5)!
        : rede.ordemPeca[rede.indicePeca];
    const con = Object.keys(s.jogadorPorConexao).find((id) => s.jogadorPorConexao[id] === jogador)!;
    if (rede.fase === 'peca') {
      const stale = mandar(s, con, {
        tipo: 'escolher',
        escolha: { tipo: 'peca', pecaId: 'qualquer' },
        turnoEsperado: rede.indicePeca,
        revisaoEsperada: 0,
      });
      expect(stale.estado).toBe(s);
      expect(stale.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'revisao-divergente' });
    }
    const r = revelarRodada(a.draft!, jogador);
    const escolha =
      r.fase === 'peca'
        ? { tipo: 'peca', pecaId: r.pecasReveladas![0] }
        : r.fase === 'sorteios'
          ? r.slotsDisponiveis.includes('piloto')
            ? { tipo: 'piloto', pilotoId: encontrarEquipeAno(dataset, r.equipeAno).pilotos[0].id }
            : { tipo: 'componente', slot: r.slotsDisponiveis[0] }
          : null;
    const resposta = mandar(s, con, {
      tipo: 'escolher',
      escolha,
      turnoEsperado: rede.fase === 'sorteios' ? rede.rodada[jogador] : rede.indicePeca,
      revisaoEsperada: rede.revisoes[jogador],
    });
    expect(resposta.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
    s = resposta.estado;
    conferir();
  }
  expect(a.draft!.fase).toBe('concluido');
  expect(b.draft!.loadouts).toEqual(a.draft!.loadouts);
});
