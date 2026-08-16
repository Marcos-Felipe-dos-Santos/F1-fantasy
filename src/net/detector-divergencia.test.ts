/**
 * PR 3.4 — o DETECTOR de divergência, ponta a ponta.
 *
 * 🔴 **O risco que fecha.** `escolhaDoAusente` é a única decisão que cada
 * cliente toma sozinho. Dois clientes escolhendo peças diferentes pelo mesmo
 * ausente debitam cópias diferentes do pool compartilhado: `copiasRestantes` e
 * `loadouts` divergem e **nada acusa**. É o RISCO ATIVO do `ESTADO.md`, e o
 * 3.4 existe para transformar "diverge em silêncio" em "diverge com alarme".
 *
 * 🔬 **A fonte de divergência aqui é REAL, não fabricada.** Os hashes saem de
 * `rodarHarness`, o mesmo instrumento cujo CONTROLE NEGATIVO do 3.2 já provava
 * que a sabotagem do ausente diverge de fato. Escrever estados divergentes à
 * mão testaria a minha imaginação; assim testa o defeito que existe.
 *
 * As duas metades são obrigatórias, e uma sem a outra é pior que nada:
 * - **alarma quando diverge** — senão é decoração;
 * - **cala quando não diverge**, inclusive com cliente ATRASADO — senão o dev
 *   desliga o alarme na primeira semana e a divergência volta a ser silenciosa.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { rodarHarness, SEM_PATOLOGIA, type ResultadoHarness } from './harness';
import { aoReceber, criarServidor, type EstadoServidor } from './servidor-sala';
import { hashDoDraft } from './hash-draft';
import { QTD_JOGADORES } from './tipos';
import type { MensagemServidor } from './protocolo';
import type { DraftState } from '../engine/types';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

const T0 = 1_000;

/**
 * Põe os drafts finais dos jogadores no servidor como atestados, na âncora
 * indicada, e devolve os alarmes que saíram.
 *
 * Cada jogador entra por uma conexão própria — o `remetenteId` vem do MAPA do
 * servidor, nunca do fio (regra do 3.1a), então atestar exige ser jogador de
 * verdade.
 */
function atestarTodos(
  resultado: ResultadoHarness,
  drafts: Map<string, DraftState>,
  ancora: number | ((jogadorId: string) => number) = 1,
): { alarmes: Extract<MensagemServidor, { tipo: 'divergencia' }>[]; servidor: EstadoServidor } {
  // 🔑 O servidor é o DO HARNESS, não um recém-criado: ele tem o LOG real da
  // partida, e a âncora é um índice desse log (o teto de `atestadoValido`
  // depende disso). Um servidor vazio teria log 0 e recusaria tudo — e o teste
  // passaria a medir a validação em vez do detector.
  let servidor = resultado.servidor;
  const alarmes: Extract<MensagemServidor, { tipo: 'divergencia' }>[] = [];

  // Mapa inverso jogador→conexão, do próprio servidor: o `remetenteId` vem
  // dali, nunca do fio (regra do 3.1a).
  const conexaoDe = new Map<string, string>();
  for (const [conexaoId, jogadorId] of Object.entries(servidor.jogadorPorConexao)) {
    conexaoDe.set(jogadorId, conexaoId);
  }

  for (const [jogadorId, draft] of [...drafts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const conexaoId = conexaoDe.get(jogadorId);
    if (conexaoId === undefined) continue; // caiu e não voltou: fora da comparação
    const a = typeof ancora === 'number' ? ancora : ancora(jogadorId);
    const r = aoReceber(
      servidor,
      conexaoId,
      JSON.stringify({ tipo: 'hash', escopo: 'draft', ancora: a, hash: hashDoDraft(draft) }),
      T0,
    );
    servidor = r.estado;
    for (const envio of r.envios) {
      if (envio.mensagem.tipo === 'divergencia') alarmes.push(envio.mensagem);
    }
  }

  return { alarmes, servidor };
}

/** Âncoras usadas nos testes têm que caber no log real da partida. */
function tetoDe(r: ResultadoHarness): number {
  return r.servidor.sala.draft?.log.length ?? 0;
}

function rodar(seed: number, sabotar: boolean): ResultadoHarness {
  return rodarHarness({
    seed,
    qtdClientes: QTD_JOGADORES,
    dataset,
    patologias: SEM_PATOLOGIA,
    ...(sabotar
      ? { sabotagem: 'escolha-do-ausente-divergente' as const, abandonarNoPasso: 2 }
      : {}),
  });
}

describe('ALARMA quando as máquinas deixam de jogar o mesmo jogo', () => {
  it('🔴 a divergência do ausente é DETECTADA', () => {
    const r = rodar(2026, true);
    expect(r.servidor.sala.draft?.ausentes.length, 'sem ausente não há sabotagem').toBeGreaterThan(
      0,
    );

    const { alarmes } = atestarTodos(r, r.draftsPorJogador, tetoDe(r));

    expect(alarmes.length, 'o detector NÃO acusou a divergência injetada').toBeGreaterThan(0);
    expect(alarmes[0].escopo).toBe('draft');
    expect(alarmes[0].jogadores.length).toBeGreaterThan(0);
  });

  it('o alarme sai UMA vez por âncora, não a cada atestado', () => {
    const r = rodar(2026, true);
    const { alarmes } = atestarTodos(r, r.draftsPorJogador, tetoDe(r));
    // Com 22 atestados e divergência, um alarme por atestado seria enxurrada.
    expect(alarmes.length).toBe(1);
  });
});

describe('CALA quando está tudo certo', () => {
  it('20 seeds sem sabotagem: nenhum alarme', () => {
    const seeds = Array.from({ length: 20 }, (_, i) => 1000 + i * 7);
    for (const seed of seeds) {
      const r = rodar(seed, false);
      const { alarmes } = atestarTodos(r, r.draftsPorJogador, tetoDe(r));
      expect(alarmes, `seed ${seed} deu alarme falso`).toEqual([]);
    }
  });

  /**
   * 🔒 O caso que decide se o detector é usável. Um cliente atrasado é NORMAL —
   * ele ainda não aplicou os últimos eventos do log. Se isso alarmar, o alarme
   * dispara com lag de rede, o dev desliga, e a divergência real volta a passar
   * despercebida. Aqui os drafts são os MESMOS (nada divergiu); só as âncoras
   * diferem.
   */
  it('🔒 cliente ATRASADO não alarma — e o estado dele É diferente', () => {
    const r = rodar(4242, false);
    const ids = [...r.draftsPorJogador.keys()].sort();
    const atrasado = ids[ids.length - 1];

    // ⚠️ O atraso tem que ser REAL, senão o teste não prova nada: um cliente
    // atrasado com estado IDÊNTICO produz o mesmo hash e ficaria silencioso
    // mesmo sem a regra de âncora. (Descoberto por mutação: a primeira versão
    // deste teste usava estados iguais e sobrevivia à remoção da regra.)
    // Aqui ele está um evento atrás — um loadout ainda não aplicado.
    const drafts = new Map(r.draftsPorJogador);
    const original = drafts.get(atrasado)!;
    const idsComLoadout = Object.keys(original.loadouts).sort();
    const loadouts = { ...original.loadouts };
    delete loadouts[idsComLoadout[idsComLoadout.length - 1]];
    drafts.set(atrasado, { ...original, loadouts });

    expect(
      hashDoDraft(drafts.get(atrasado)!),
      'o atraso precisa mudar o hash, senão o teste é vazio',
    ).not.toBe(hashDoDraft(original));

    // Ele atesta numa âncora MENOR — que é o que "atrasado" significa no fio.
    const teto = tetoDe(r);
    const { alarmes } = atestarTodos(r, drafts, (id) => (id === atrasado ? teto - 3 : teto));
    expect(alarmes, 'lag de rede não pode alarmar — o dev desligaria o alarme').toEqual([]);
  });

  it('🔒 atrasado NEM SEQUER sobrescreve o balde da âncora alta', () => {
    // Se um atestado velho rebaixasse a âncora corrente, o próximo atestado
    // legítimo compararia contra a coisa errada.
    const r = rodar(777, false);
    const ids = [...r.draftsPorJogador.keys()].sort();
    const teto = tetoDe(r);
    const { servidor } = atestarTodos(r, r.draftsPorJogador, (id) =>
      id === ids[ids.length - 1] ? 1 : teto,
    );
    expect(servidor.atestados?.draft?.ancora).toBe(teto);
  });
});

/**
 * O handshake é a metade PREVENTIVA do 3.4. O detector acusa depois; isto
 * impede antes. Dois builds diferentes produzem loadouts diferentes do mesmo
 * log — deixar entrar seria fabricar a divergência que o detector então
 * acusaria, e o jogador perderia a partida por algo barato de barrar na porta.
 */
describe('HANDSHAKE de versão: builds diferentes não entram na mesma sala', () => {
  function entrar(servidor: EstadoServidor, conexaoId: string, versaoApp?: string) {
    const comando: Record<string, unknown> = { tipo: 'entrar', nome: conexaoId };
    if (versaoApp !== undefined) comando.versaoApp = versaoApp;
    return aoReceber(servidor, conexaoId, JSON.stringify(comando), T0, `tok-${conexaoId}`);
  }

  it('mesma versão entra', () => {
    let s = criarServidor('s', 1, 'dificil', T0);
    s = entrar(s, 'c0', '3.4.0').estado;
    const r = entrar(s, 'c1', '3.4.0');
    expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
    expect(Object.keys(r.estado.jogadorPorConexao)).toHaveLength(2);
  });

  it('🔴 versão diferente é RECUSADA', () => {
    let s = criarServidor('s', 1, 'dificil', T0);
    s = entrar(s, 'c0', '3.4.0').estado;
    const r = entrar(s, 'c1', '3.5.0');
    expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'versao-divergente' });
    expect(r.estado.jogadorPorConexao.c1, 'o recusado não pode virar jogador').toBeUndefined();
  });

  it('cliente ANTIGO (sem `versaoApp`) também é recusado', () => {
    // "Não sei a sua versão" não é o mesmo que "a sua versão serve". Um cliente
    // velho é justamente o caso que o handshake existe pra pegar.
    let s = criarServidor('s', 1, 'dificil', T0);
    s = entrar(s, 'c0', '3.4.0').estado;
    const r = entrar(s, 'c1');
    expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'versao-divergente' });
  });

  it('🔴 `reentrar` TAMBÉM passa pelo handshake', () => {
    // Achado da revisão, e é o caminho que mais importa: entra-se uma vez, mas
    // reconecta-se a cada F5, e a UI dispara `reentrar` sozinha. Um deploy no
    // meio da partida traria o jogador de volta com engine nova numa sala de
    // engine velha — sem verificação nenhuma, na primeira versão deste PR.
    let s = criarServidor('s', 1, 'dificil', T0);
    s = entrar(s, 'c0', '3.4.0').estado;
    const token = 'tok-c0';

    const boa = aoReceber(
      s,
      'c9',
      JSON.stringify({ tipo: 'reentrar', token, versaoApp: '3.4.0' }),
      T0,
    );
    expect(boa.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);

    const ruim = aoReceber(
      s,
      'c9',
      JSON.stringify({ tipo: 'reentrar', token, versaoApp: '9.9.9' }),
      T0,
    );
    expect(ruim.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'versao-divergente' });
    expect(ruim.estado.jogadorPorConexao.c9, 'recusado não remapeia a conexão').toBeUndefined();
  });

  it('🔒 a versão é fixada pelo primeiro `entrar` ACEITO, não por um recusado', () => {
    // Se um `entrar` recusado fixasse a versão, um cliente hostil trancaria a
    // sala inteira do lado de fora sem nunca entrar nela.
    let s = criarServidor('s', 1, 'dificil', T0);
    // Recusado por falta de token gerado (não é `entrar` aceito).
    const semToken = aoReceber(
      s,
      'cx',
      JSON.stringify({ tipo: 'entrar', nome: 'X', versaoApp: 'HOSTIL' }),
      T0,
      '',
    );
    expect(semToken.estado.versaoApp, 'recusado não fixa versão').toBeUndefined();

    s = entrar(s, 'c0', '3.4.0').estado;
    expect(s.versaoApp).toBe('3.4.0');
  });
});

describe('o servidor continua SEM dataset — ele só compara strings', () => {
  it('recusa atestado de quem não é jogador da sala', () => {
    const servidor = criarServidor('sala-x', 1, 'dificil', T0);
    const r = aoReceber(
      servidor,
      'intruso',
      JSON.stringify({ tipo: 'hash', escopo: 'draft', ancora: 1, hash: 'a'.repeat(16) }),
      T0,
    );
    expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'jogador-desconhecido' });
  });

  it('🔴 âncora ACIMA do tamanho do log é recusada — senão o detector se desliga', () => {
    // Achado da revisão, e era o bloqueante mais sério: o balde guarda só a
    // âncora mais alta, e atestado com âncora menor é ignorado em silêncio.
    // Logo UMA mensagem com âncora absurda de qualquer jogador sentado fazia
    // todo atestado honesto seguinte cair no silêncio pelo RESTO da partida —
    // apagando exatamente a defesa que este PR existe pra criar.
    let s = criarServidor('s-teto', 1, 'dificil', T0);
    s = aoReceber(s, 'c0', JSON.stringify({ tipo: 'entrar', nome: 'A', versaoApp: 'v' }), T0, 'tk')
      .estado;

    // Sala no lobby: log vazio ⇒ teto 0. Âncora 1 já está acima.
    const absurda = aoReceber(
      s,
      'c0',
      JSON.stringify({ tipo: 'hash', escopo: 'draft', ancora: 2 ** 40, hash: '0'.repeat(16) }),
      T0,
    );
    expect(absurda.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'comando-invalido' });
    expect(
      absurda.estado.atestados?.draft,
      'a âncora absurda não pode entrar no estado — é o que trancaria o detector',
    ).toBeUndefined();
  });

  it('🔒 atestado REPETIDO devolve o mesmo estado (não gera escrita no DO)', () => {
    // Achado da revisão: o Durable Object grava quando o estado muda de
    // identidade. Reconstruir o balde a cada atestado daria ~22 escritas por
    // evento de draft, e reenviar o mesmo payload válido seria amplificação de
    // escrita de graça.
    let s = criarServidor('s-idem', 1, 'dificil', T0);
    s = aoReceber(s, 'c0', JSON.stringify({ tipo: 'entrar', nome: 'A', versaoApp: 'v' }), T0, 'tk')
      .estado;

    const atestado = JSON.stringify({
      tipo: 'hash',
      escopo: 'draft',
      ancora: 0,
      hash: 'a'.repeat(16),
    });
    const primeiro = aoReceber(s, 'c0', atestado, T0);
    expect(primeiro.estado).not.toBe(s); // o primeiro MUDA o estado

    const repetido = aoReceber(primeiro.estado, 'c0', atestado, T0);
    expect(repetido.estado, 'atestado repetido não pode mudar a identidade').toBe(primeiro.estado);
    expect(repetido.envios).toEqual([]);
  });

  it('recusa atestado malformado sem derrubar a sala', () => {
    let servidor = criarServidor('sala-y', 1, 'dificil', T0);
    servidor = aoReceber(
      servidor,
      'c0',
      JSON.stringify({ tipo: 'entrar', nome: 'A', versaoApp: 'v' }),
      T0,
      'tok',
    ).estado;

    // 🔑 `escopo: 'corrida'` SAIU desta lista (PR 2/4 de "corrida online"): é
    // um `EscopoHash` válido desde então, não é malformado. Os exemplos de
    // `escopo` ruim abaixo são valores que NUNCA foram (nem serão) membros de
    // `EscopoHash` por acidente de digitação — é isso que continua provando
    // que `escopoValido` recusa o que deve recusar, e não só "tudo que não é
    // a string 'draft'".
    const ruins: unknown[] = [
      { tipo: 'hash', escopo: 'banana', ancora: 1, hash: 'a'.repeat(16) },
      { tipo: 'hash', escopo: '', ancora: 1, hash: 'a'.repeat(16) },
      { tipo: 'hash', escopo: 123, ancora: 1, hash: 'a'.repeat(16) },
      { tipo: 'hash', escopo: null, ancora: 1, hash: 'a'.repeat(16) },
      { tipo: 'hash', escopo: {}, ancora: 1, hash: 'a'.repeat(16) },
      { tipo: 'hash', ancora: 1, hash: 'a'.repeat(16) }, // escopo AUSENTE
      // `escopoValido` usa `Object.hasOwn`, não `in`: `'constructor'` está na
      // cadeia de protótipo de QUALQUER objeto, mas não é chave PRÓPRIA de
      // `ESCOPOS_VALIDOS`. Se alguém trocar por `escopo in ESCOPOS_VALIDOS`
      // no futuro, esta linha passa a aceitar `'constructor'` e este teste
      // reprova.
      { tipo: 'hash', escopo: 'constructor', ancora: 1, hash: 'a'.repeat(16) },
      { tipo: 'hash', escopo: 'draft', ancora: -1, hash: 'a'.repeat(16) },
      { tipo: 'hash', escopo: 'draft', ancora: 1.5, hash: 'a'.repeat(16) },
      { tipo: 'hash', escopo: 'draft', ancora: 1, hash: 'NAO-E-HEX------' },
      // Teto de tamanho: sem ele, um cliente hostil infla o estado persistido.
      { tipo: 'hash', escopo: 'draft', ancora: 1, hash: 'a'.repeat(5000) },
      { tipo: 'hash', escopo: 'draft', ancora: 1 },
    ];
    for (const ruim of ruins) {
      const r = aoReceber(servidor, 'c0', JSON.stringify(ruim), T0);
      expect(r.envios[0].mensagem, JSON.stringify(ruim)).toEqual({
        tipo: 'erro',
        erro: 'comando-invalido',
      });
      expect(r.estado.atestados?.draft, 'atestado inválido não pode entrar no estado').toBeUndefined();
      expect(r.estado.atestados?.corrida, 'atestado inválido não pode entrar no estado').toBeUndefined();
    }
  });

  it('🔴 escopo "corrida" bem-formado é ACEITO — o par positivo do teste acima (PR 2/4)', () => {
    // O docblock do `escopo` em `protocolo.ts` promete, desde o 3.4, que a
    // corrida entraria "sem mudar o protocolo": o TIPO já era a união
    // `'draft' | 'corrida'`, mas a validação em `atestadoValido` travava na
    // string literal `'draft'`. Sem este teste, um atestado de corrida
    // legítimo continuaria batendo em `comando-invalido` pra sempre — código
    // morto que nenhum teste flagraria, porque "recusa atestado malformado"
    // tratava exatamente este caso como malformado.
    let servidor = criarServidor('sala-corrida-ok', 1, 'dificil', T0);
    servidor = aoReceber(
      servidor,
      'c0',
      JSON.stringify({ tipo: 'entrar', nome: 'A', versaoApp: 'v' }),
      T0,
      'tok',
    ).estado;

    const r = aoReceber(
      servidor,
      'c0',
      JSON.stringify({ tipo: 'hash', escopo: 'corrida', ancora: 0, hash: 'a'.repeat(16) }),
      T0,
    );

    expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
    expect(r.estado.atestados?.corrida?.porJogador['humano-01']).toBe('a'.repeat(16));
  });
});

describe('atestados por escopo NÃO se misturam (PR 2/4 de "corrida online")', () => {
  /** Dois jogadores conectados, cada um com sua conexão — mesmo padrão dos testes acima. */
  function duasConexoes(): EstadoServidor {
    let s = criarServidor('s-dois-escopos', 1, 'dificil', T0);
    s = aoReceber(s, 'c0', JSON.stringify({ tipo: 'entrar', nome: 'A', versaoApp: 'v' }), T0, 'tk0')
      .estado;
    s = aoReceber(s, 'c1', JSON.stringify({ tipo: 'entrar', nome: 'B', versaoApp: 'v' }), T0, 'tk1')
      .estado;
    return s;
  }

  function enviar(
    servidor: EstadoServidor,
    conexaoId: string,
    comando: unknown,
  ): { estado: EstadoServidor; divergencias: Extract<MensagemServidor, { tipo: 'divergencia' }>[] } {
    const r = aoReceber(servidor, conexaoId, JSON.stringify(comando), T0);
    return {
      estado: r.estado,
      divergencias: r.envios
        .map((e) => e.mensagem)
        .filter((m): m is Extract<MensagemServidor, { tipo: 'divergencia' }> => m.tipo === 'divergencia'),
    };
  }

  it('🔴 concordam no DRAFT, DIVERGEM na CORRIDA ⇒ alarme só em "corrida", nunca em "draft"', () => {
    let s = duasConexoes();
    const alarmes: Extract<MensagemServidor, { tipo: 'divergencia' }>[] = [];

    // Draft: os dois atestam o MESMO hash — não diverge.
    ({ estado: s } = enviar(s, 'c0', { tipo: 'hash', escopo: 'draft', ancora: 0, hash: 'd'.repeat(16) }));
    let r = enviar(s, 'c1', { tipo: 'hash', escopo: 'draft', ancora: 0, hash: 'd'.repeat(16) });
    s = r.estado;
    alarmes.push(...r.divergencias);

    // Corrida: os dois atestam hashes DIFERENTES — diverge.
    ({ estado: s } = enviar(s, 'c0', {
      tipo: 'hash',
      escopo: 'corrida',
      ancora: 0,
      hash: 'e'.repeat(16),
    }));
    r = enviar(s, 'c1', { tipo: 'hash', escopo: 'corrida', ancora: 0, hash: 'f'.repeat(16) });
    s = r.estado;
    alarmes.push(...r.divergencias);

    expect(alarmes.length, 'a divergência na corrida tem que acusar').toBeGreaterThan(0);
    expect(
      alarmes.every((a) => a.escopo === 'corrida'),
      'nenhum alarme pode sair em "draft" — os dois concordaram lá',
    ).toBe(true);
    expect(s.atestados?.draft?.alarmado ?? false, 'o balde do draft não pode ter sido tocado').toBe(
      false,
    );
    expect(s.atestados?.corrida?.alarmado).toBe(true);
  });

  it('🔴 inverso: DIVERGEM no DRAFT, concordam na CORRIDA ⇒ alarme só em "draft", nunca em "corrida"', () => {
    let s = duasConexoes();
    const alarmes: Extract<MensagemServidor, { tipo: 'divergencia' }>[] = [];

    // Draft: hashes DIFERENTES — diverge.
    ({ estado: s } = enviar(s, 'c0', { tipo: 'hash', escopo: 'draft', ancora: 0, hash: 'a'.repeat(16) }));
    let r = enviar(s, 'c1', { tipo: 'hash', escopo: 'draft', ancora: 0, hash: 'b'.repeat(16) });
    s = r.estado;
    alarmes.push(...r.divergencias);

    // Corrida: MESMO hash — não diverge.
    ({ estado: s } = enviar(s, 'c0', {
      tipo: 'hash',
      escopo: 'corrida',
      ancora: 0,
      hash: 'c'.repeat(16),
    }));
    r = enviar(s, 'c1', { tipo: 'hash', escopo: 'corrida', ancora: 0, hash: 'c'.repeat(16) });
    s = r.estado;
    alarmes.push(...r.divergencias);

    expect(alarmes.length, 'a divergência no draft tem que acusar').toBeGreaterThan(0);
    expect(
      alarmes.every((a) => a.escopo === 'draft'),
      'nenhum alarme pode sair em "corrida" — os dois concordaram lá',
    ).toBe(true);
    expect(s.atestados?.corrida?.alarmado ?? false, 'o balde da corrida não pode ter sido tocado').toBe(
      false,
    );
    expect(s.atestados?.draft?.alarmado).toBe(true);
  });
});
