/**
 * PR 3.2 / 3.2.1 — o servidor sem I/O: identidade de conexão, recuperação e
 * RECONEXÃO por token.
 *
 * O que este arquivo protege, acima de tudo, é a resposta para **"quem mandou
 * isto?"**. Ela não vem do fio (o 3.1a tirou `jogadorId` de todos os comandos);
 * vem do mapa conexão→jogador, que vive aqui. Cada furo nesse mapa é uma
 * personificação.
 */

import { describe, expect, it } from 'vitest';
import {
  aoConectar,
  aoDesconectar,
  aoReceber,
  criarServidor,
  type EstadoServidor,
} from './servidor-sala';
import type { MensagemServidor } from './protocolo';
import { RODADAS_SORTEIO } from '../engine/draft-utils';
import { deriveSeed } from '../engine/rng';
import { ROTULO_SEED_CORRIDA } from './tipos';

const T0 = 1_000_000;

const criar = () => criarServidor('sala-teste', 2026, 'dificil', T0);

/** Manda um comando cru, como o transporte faria. */
function mandar(
  estado: EstadoServidor,
  conexaoId: string,
  comando: unknown,
  token = 'token-novo',
): { estado: EstadoServidor; envios: { para: string | null; mensagem: MensagemServidor }[] } {
  return aoReceber(estado, conexaoId, JSON.stringify(comando), T0, token);
}

/** Faz uma conexão entrar e devolve o estado + o token que ela recebeu. */
function entrar(
  estado: EstadoServidor,
  conexaoId: string,
  nome: string,
  token: string,
): { estado: EstadoServidor; token: string } {
  const r = mandar(estado, conexaoId, { tipo: 'entrar', nome }, token);
  const voceE = r.envios.find((e) => e.mensagem.tipo === 'voce-e');
  expect(voceE, `entrar de ${nome} não devolveu voce-e`).toBeDefined();
  const msg = voceE!.mensagem as { tipo: 'voce-e'; jogadorId: string; token?: string };
  expect(msg.token, 'o token não veio no voce-e do entrar').toBe(token);
  return { estado: r.estado, token: msg.token! };
}

const conexoesDe = (estado: EstadoServidor, jogadorId: string): string[] =>
  Object.entries(estado.jogadorPorConexao)
    .filter(([, j]) => j === jogadorId)
    .map(([c]) => c);

describe('identidade da conexão', () => {
  it('só o `entrar` transforma uma conexão em jogador', () => {
    let estado = criar();
    estado = aoConectar(estado, 'c1').estado;
    expect(estado.jogadorPorConexao).toEqual({});
    estado = entrar(estado, 'c1', 'Ana', 'tk-1').estado;
    expect(estado.jogadorPorConexao).toEqual({ c1: 'humano-01' });
  });

  it('o token vai SÓ para quem entrou, nunca em broadcast', () => {
    const r = mandar(criar(), 'c1', { tipo: 'entrar', nome: 'Ana' }, 'tk-secreto');
    for (const envio of r.envios) {
      if (envio.para === null) {
        expect(JSON.stringify(envio.mensagem), 'o token vazou num broadcast').not.toContain(
          'tk-secreto',
        );
      }
    }
  });

  it('JSON inválido e comando sem tipo viram erro, não exceção', () => {
    const estado = criar();
    for (const bruto of ['{', 'nao é json', '[]', 'null', '{"semTipo":1}']) {
      const r = aoReceber(estado, 'c1', bruto, T0, 'tk');
      expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'comando-invalido' });
      expect(r.estado).toBe(estado);
    }
  });

  it('quem-sou e sincronizar não mudam o estado nem avançam o seq', () => {
    const { estado } = entrar(criar(), 'c1', 'Ana', 'tk-1');
    const seq = estado.sala.seq;
    for (const comando of [{ tipo: 'quem-sou' }, { tipo: 'sincronizar' }]) {
      const r = mandar(estado, 'c1', comando);
      expect(r.estado.sala.seq, `${comando.tipo} avançou o seq`).toBe(seq);
      expect(r.envios.every((e) => e.para === 'c1'), 'respondeu em broadcast').toBe(true);
    }
  });
});

describe('reconexão por token (PR 3.2.1)', () => {
  it('quem cai COM A SALA INICIADA volta com o token e recupera a identidade', () => {
    let estado = criar();
    const e1 = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = e1.estado;
    estado = entrar(estado, 'c2', 'Beto', 'tk-beto').estado;
    estado = mandar(estado, 'c1', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c2', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c1', { tipo: 'iniciar' }).estado;

    // Ana cai: a conexão some do mapa, mas ela continua na partida.
    estado = aoDesconectar(estado, 'c1', T0).estado;
    expect(estado.jogadorPorConexao.c1).toBeUndefined();
    expect(estado.sala.jogadores.map((j) => j.id)).toContain('humano-01');

    // E volta, por outra conexão, apresentando o token.
    const r = mandar(estado, 'c9', { tipo: 'reentrar', token: e1.token });
    expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
    expect(r.estado.jogadorPorConexao.c9).toBe('humano-01');
    // E recebe de volta identidade e estado, só para ela.
    expect(r.envios.map((e) => e.mensagem.tipo).sort()).toEqual(['estado', 'voce-e']);
    expect(r.envios.every((e) => e.para === 'c9')).toBe(true);
  });

  it('no LOBBY, cair é sair — e o token morre junto (não vira fantasma)', () => {
    // Consequência direta da correção do fantasma, e é o comportamento certo:
    // com a sala aberta o roster ainda é móvel, então `aoDesconectar` remove o
    // jogador de verdade. Um F5 no lobby, portanto, exige `entrar` de novo —
    // não `reentrar`. É o que a UI do 3.3 precisa saber.
    let estado = criar();
    const ana = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = aoDesconectar(ana.estado, 'c1', T0).estado;
    expect(estado.sala.jogadores).toEqual([]);
    expect(mandar(estado, 'c9', { tipo: 'reentrar', token: ana.token }).envios[0].mensagem).toEqual({
      tipo: 'erro',
      erro: 'token-invalido',
    });
  });

  it('EVICÇÃO: reconectar não deixa duas conexões mandando pelo mesmo jogador', () => {
    // Um cliente instável que reconecta três vezes deixaria três chaves vivas
    // apontando pro mesmo jogador — e TODAS poderiam jogar por ele. É a mesma
    // superfície de personificação que o 3.1a fechou, reaberta por outro lado.
    let estado = criar();
    const e = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = e.estado;

    for (const conexao of ['c2', 'c3', 'c4']) {
      estado = mandar(estado, conexao, { tipo: 'reentrar', token: e.token }).estado;
    }
    expect(conexoesDe(estado, 'humano-01')).toEqual(['c4']);
  });

  it('reentrar FUNCIONA com a sala já iniciada — é o ponto do comando', () => {
    let estado = criar();
    const ana = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = ana.estado;
    estado = entrar(estado, 'c2', 'Beto', 'tk-beto').estado;
    estado = mandar(estado, 'c1', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c2', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c1', { tipo: 'iniciar' }).estado;
    expect(estado.sala.fase).toBe('iniciada');

    // `entrar` é recusado (roster congelado)…
    expect(mandar(estado, 'c7', { tipo: 'entrar', nome: 'Atrasado' }).envios[0].mensagem).toEqual({
      tipo: 'erro',
      erro: 'sala-iniciada',
    });
    // …mas `reentrar` passa: quem já era da partida pode voltar.
    const r = mandar(estado, 'c7', { tipo: 'reentrar', token: ana.token });
    expect(r.estado.jogadorPorConexao.c7).toBe('humano-01');
  });

  it('token inválido, ausente ou de tipo errado é recusado', () => {
    const { estado } = entrar(criar(), 'c1', 'Ana', 'tk-ana');
    for (const token of ['', 'inventado', undefined, null, 42, {}]) {
      const r = mandar(estado, 'c9', { tipo: 'reentrar', token });
      expect(r.envios[0].mensagem, `aceitou ${JSON.stringify(token)}`).toEqual({
        tipo: 'erro',
        erro: 'token-invalido',
      });
      expect(r.estado).toBe(estado);
    }
  });

  it('🔴 token de quem SAIU não vale mais — senão vira jogador FANTASMA', () => {
    // Cadeia medida pela revisão: B sai (o roster perde `humano-02`, mas o
    // token continuava vivo) → B reentra e é mapeado para `humano-02`, que não
    // existe mais → C entra e RECEBE `humano-02` (menor id livre) → agora B
    // manda comando como C, sem nunca ter tido o token de C.
    let estado = criar();
    estado = entrar(estado, 'c1', 'Ana', 'tk-ana').estado;
    const beto = entrar(estado, 'c2', 'Beto', 'tk-beto');
    estado = beto.estado;

    estado = mandar(estado, 'c2', { tipo: 'sair' }).estado;
    expect(estado.sala.jogadores.map((j) => j.id)).toEqual(['humano-01']);

    const fantasma = mandar(estado, 'c9', { tipo: 'reentrar', token: beto.token });
    expect(fantasma.envios[0].mensagem, 'reentrou como jogador que saiu').toEqual({
      tipo: 'erro',
      erro: 'token-invalido',
    });
    expect(fantasma.estado.jogadorPorConexao.c9).toBeUndefined();
  });

  it('🔴 sair por COMANDO limpa o mapa — senão duas conexões viram o mesmo jogador', () => {
    // `aoDesconectar` apagava a chave, mas o comando `sair` com o socket aberto
    // não: a conexão continuava mapeada para um id que voltou pro bolo, e o
    // próximo a entrar recebia esse id com DOIS donos.
    let estado = criar();
    estado = entrar(estado, 'c1', 'Ana', 'tk-ana').estado;
    estado = mandar(estado, 'c1', { tipo: 'sair' }).estado;
    expect(estado.jogadorPorConexao.c1, 'c1 continuou mapeada depois de sair').toBeUndefined();

    estado = entrar(estado, 'c2', 'Caio', 'tk-caio').estado;
    expect(conexoesDe(estado, 'humano-01')).toEqual(['c2']);
    // E a conexão velha não consegue mais mexer no jogador que herdou o id.
    const r = mandar(estado, 'c1', { tipo: 'pronto', pronto: true });
    expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'jogador-desconhecido' });
  });

  it('🔴 entrar DUAS vezes pela mesma conexão não deixa dois mapeamentos', () => {
    // A evicção do 3.2.1 cobria só o `reentrar`; o `entrar` apenas ADICIONAVA.
    let estado = criar();
    estado = entrar(estado, 'c1', 'Ana', 'tk-ana').estado;
    estado = mandar(estado, 'c1', { tipo: 'sair' }).estado;
    estado = entrar(estado, 'c1', 'Ana de novo', 'tk-ana-2').estado;
    expect(Object.entries(estado.jogadorPorConexao)).toHaveLength(1);
  });

  it('🔴 estado persistido ANTES do 3.2.1 (sem `tokens`) não faz o servidor lançar', () => {
    // O Durable Object devolve o objeto gravado cru, sem migração de schema.
    // Uma sala criada antes deste PR não tem `tokens`, e o docblock de
    // `aoReceber` promete que ele NUNCA lança.
    const { estado } = entrar(criar(), 'c1', 'Ana', 'tk-ana');
    const antigo = structuredClone(estado) as unknown as {
      sala: { tokens?: Record<string, string> };
    } & EstadoServidor;
    delete (antigo.sala as { tokens?: Record<string, string> }).tokens;
    expect(() => mandar(antigo, 'c9', { tipo: 'reentrar', token: 'qualquer' })).not.toThrow();
    expect(mandar(antigo, 'c9', { tipo: 'reentrar', token: 'qualquer' }).envios[0].mensagem).toEqual(
      { tipo: 'erro', erro: 'token-invalido' },
    );
  });

  it('reentrar de uma conexão que JÁ É outro jogador é recusado', () => {
    let estado = criar();
    const ana = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = ana.estado;
    estado = entrar(estado, 'c2', 'Beto', 'tk-beto').estado;
    // c2 é o Beto e tenta virar a Ana. Só conseguiria com o token dela, mas
    // ainda assim: uma conexão que já tem identidade não troca de identidade.
    const r = mandar(estado, 'c2', { tipo: 'reentrar', token: ana.token });
    expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'token-invalido' });
    expect(r.estado.jogadorPorConexao.c2).toBe('humano-02');
  });

  it('entrar sem token gerado é recusado alto, em vez de gravar token vazio', () => {
    const r = aoReceber(criar(), 'c1', JSON.stringify({ tipo: 'entrar', nome: 'Ana' }), T0, '');
    expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'comando-invalido' });
  });

  it('reentrar repetido da MESMA conexão não muda o estado (nem faz o DO gravar)', () => {
    const { estado, token } = entrar(criar(), 'c1', 'Ana', 'tk-ana');
    const r = mandar(estado, 'c1', { tipo: 'reentrar', token });
    expect(r.estado, 'mapa idêntico deveria devolver o MESMO objeto').toBe(estado);
  });

  it('reentrar não avança o seq (não muda o estado da SALA)', () => {
    const { estado, token } = entrar(criar(), 'c1', 'Ana', 'tk-ana');
    const r = mandar(estado, 'c2', { tipo: 'reentrar', token });
    expect(r.estado.sala.seq).toBe(estado.sala.seq);
    expect(r.estado.sala).toBe(estado.sala);
  });

  it('cair com a sala ABERTA remove da sala; com a sala INICIADA, não', () => {
    // Depois do congelamento o roster é imutável: cair não pode tirar ninguém
    // da partida. Quem decide que o jogador não volta é o cronômetro.
    let aberta = criar();
    aberta = entrar(aberta, 'c1', 'Ana', 'tk-1').estado;
    aberta = entrar(aberta, 'c2', 'Beto', 'tk-2').estado;
    expect(aoDesconectar(aberta, 'c1', T0).estado.sala.jogadores).toHaveLength(1);

    let iniciada = aberta;
    iniciada = mandar(iniciada, 'c1', { tipo: 'pronto', pronto: true }).estado;
    iniciada = mandar(iniciada, 'c2', { tipo: 'pronto', pronto: true }).estado;
    iniciada = mandar(iniciada, 'c1', { tipo: 'iniciar' }).estado;
    const apos = aoDesconectar(iniciada, 'c1', T0).estado;
    expect(apos.sala.jogadores).toHaveLength(2);
    expect(apos.sala.draft?.ausentes, 'cair não é abandonar').toEqual([]);
  });
});

/**
 * PR 1/4 da corrida online, item 2 da revisão do `senior-reviewer`: os 9
 * testes de `sala.test.ts` chamam `publicarSala` direto e FORJAM `fase`
 * (`comFaseDraft`). Isso não passa pelo funil de verdade — uma mutação que
 * reescrevesse `estadoPara` (`servidor-sala.ts`) pra montar o payload à mão em
 * vez de delegar a `publicarSala` vazaria a `seedMestre` no fio e os 9 testes
 * continuariam verdes.
 *
 * Este bloco atravessa o funil real: `entrar` → `pronto` → `iniciar` →
 * `escolher` (sorteios e peça) via `aoReceber`, com o draft levado a
 * 'concluido' DE VERDADE — nenhuma `fase` forjada — e inspeciona a MENSAGEM
 * que `aoReceber`/`aoConectar` efetivamente devolveriam pro transporte
 * mandar no fio.
 */
describe('seedCorrida no fio, através do funil real (PR 1/4, item 2 da revisão)', () => {
  const SEED_MESTRE = 555111;
  const CONEXAO_DO_HUMANO: Record<string, string> = { 'humano-01': 'c1', 'humano-02': 'c2' };

  /** Sala com 2 humanos prontos e o draft REALMENTE iniciado (via aoReceber). */
  function salaComDraftIniciado(): EstadoServidor {
    let estado = criarServidor('sala-integ-seedcorrida', SEED_MESTRE, 'dificil', T0);
    estado = entrar(estado, 'c1', 'Ana', 'tk-ana').estado;
    estado = entrar(estado, 'c2', 'Beto', 'tk-beto').estado;
    estado = mandar(estado, 'c1', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c2', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c1', { tipo: 'iniciar' }).estado;
    return estado;
  }

  /**
   * Avança UM passo real do draft: descobre de quem é a vez (o servidor já
   * pulou os bots — `normalizar` garante que `vez` é sempre humano) e manda,
   * em nome dela, a escolha mínima com FORMA válida — o conteúdo não importa
   * pro servidor, que não tem dataset (`temFormaDeEscolha`).
   */
  function passoDoDraft(estado: EstadoServidor) {
    const draft = estado.sala.draft!;
    if (draft.fase === 'sorteios') {
      const vez = draft.humanos.find((id) => draft.rodada[id] <= RODADAS_SORTEIO)!;
      return mandar(estado, CONEXAO_DO_HUMANO[vez], {
        tipo: 'escolher',
        escolha: { tipo: 'componente', slot: 'chassi' },
        turnoEsperado: draft.rodada[vez],
      });
    }
    const vez = draft.ordemPeca[draft.indicePeca];
    return mandar(estado, CONEXAO_DO_HUMANO[vez], {
      tipo: 'escolher',
      escolha: { tipo: 'peca', pecaId: 'peca-qualquer' },
      turnoEsperado: draft.indicePeca,
    });
  }

  /** `seedCorrida` de todo envio do tipo `estado` num lote de envios. */
  function seedsCorridaDosEnvios(
    envios: { para: string | null; mensagem: MensagemServidor }[],
  ): (number | null)[] {
    return envios
      .filter((e) => e.mensagem.tipo === 'estado')
      .map((e) => (e.mensagem as { estado: { seedCorrida: number | null } }).estado.seedCorrida);
  }

  /**
   * A `seedMestre` NÃO pode aparecer na mensagem de verdade, em texto nenhum
   * dela. Sem esta checagem, um `estadoPara` reescrito pra montar o payload à
   * mão (`{ ...estado.sala, seedDraft: ..., seedCorrida: <portão mantido> }`
   * em vez de delegar a `publicarSala`) vazaria a `seedMestre` E os `tokens`
   * no fio — e passaria pelas duas asserções de `seedCorrida` acima sem ser
   * pego, porque o portão da `seedCorrida` continuaria intacto. É exatamente
   * a classe de defeito nomeada pelo `senior-reviewer` no item 2 da revisão.
   */
  function assertSeedMestreNaoVaza(envios: { mensagem: MensagemServidor }[]): void {
    for (const envio of envios) {
      expect(JSON.stringify(envio.mensagem), 'a seedMestre vazou na mensagem').not.toContain(
        String(SEED_MESTRE),
      );
    }
  }

  it('no MEIO do draft (fase sorteios), a mensagem enviada tem seedCorrida null — broadcast e snapshot direcionado', () => {
    const estado = salaComDraftIniciado();
    expect(estado.sala.draft?.fase).toBe('sorteios');

    const r = passoDoDraft(estado);
    const broadcast = r.envios.filter((e) => e.para === null);
    expect(broadcast.length, 'o passo do draft deveria difundir um snapshot').toBeGreaterThan(0);
    for (const seedCorrida of seedsCorridaDosEnvios(broadcast)) {
      expect(seedCorrida).toBeNull();
    }
    assertSeedMestreNaoVaza(broadcast);

    // Um observador que conecta NO MEIO do draft recebe o mesmo: null.
    const conectar = aoConectar(r.estado, 'c-observador');
    expect(seedsCorridaDosEnvios(conectar.envios)).toEqual([null]);
    assertSeedMestreNaoVaza(conectar.envios);
  });

  it('depois da ÚLTIMA peça — draft REALMENTE concluído, sem fase forjada — a mensagem enviada tem a seedCorrida certa', () => {
    let estado = salaComDraftIniciado();
    let ultimo = passoDoDraft(estado);
    estado = ultimo.estado;
    let passos = 1;
    while (estado.sala.draft?.fase !== 'concluido') {
      ultimo = passoDoDraft(estado);
      estado = ultimo.estado;
      passos += 1;
      // Guarda contra loop infinito se o driver do teste tiver um bug: o
      // draft real termina bem antes disso (poucas dezenas de passos).
      if (passos > 500) {
        throw new Error('draft não concluiu em 500 passos — bug no driver do teste, não no PR');
      }
    }
    expect(estado.sala.draft?.fase).toBe('concluido');

    const seedEsperada = deriveSeed(SEED_MESTRE, ROTULO_SEED_CORRIDA);
    const broadcast = ultimo.envios.filter((e) => e.para === null);
    expect(broadcast.length, 'a conclusão deveria difundir um snapshot').toBeGreaterThan(0);
    for (const seedCorrida of seedsCorridaDosEnvios(broadcast)) {
      expect(seedCorrida).toBe(seedEsperada);
    }
    assertSeedMestreNaoVaza(broadcast);

    // E quem conecta DEPOIS da conclusão recebe a mesma seed, não null.
    const conectar = aoConectar(estado, 'c-tarde');
    expect(seedsCorridaDosEnvios(conectar.envios)).toEqual([seedEsperada]);
    assertSeedMestreNaoVaza(conectar.envios);
  });
});
