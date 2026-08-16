/**
 * PR 3/4 de "corrida online" — A BARREIRA DO FIM DA CORRIDA.
 *
 * 🔑 **O que foi decidido, e o que NÃO foi** (veredito do dev, retomando o
 * plano da Fase 3: "cada um no seu ritmo, com barreira no fim + timeout"):
 *
 * - ❌ **NÃO é barreira de LARGADA.** Ninguém é segurado esperando os outros
 *   atestarem para poder ver a corrida. **Quem chegou, corre.** A barreira é
 *   mecanismo de CICLO DE VIDA, não portão de UI — se bloqueasse, um jogador
 *   parado na tela de resumo prenderia os outros pelo timeout inteiro.
 * - ✅ **É barreira NO FIM:** a SALA decide quando considerar a corrida
 *   encerrada — quando todos os elegíveis atestam, ou quando o timeout vence
 *   para quem nunca chega.
 * - ✅ **E `concluidaEm` passa a marcar o fim da CORRIDA, não o do DRAFT.** É
 *   ele que arma a janela de graça de 10 minutos; armá-la no fim do draft
 *   fazia a janela correr durante o replay, e a sala podia fechar com gente
 *   ainda assistindo.
 */

import { describe, expect, it } from 'vitest';
import {
  aoPassarOTempo,
  aoReceber,
  criarServidor,
  decidirVida,
  registrarConexoes,
  type EstadoServidor,
} from './servidor-sala';
import type { MensagemServidor } from './protocolo';
import { RODADAS_SORTEIO } from '../engine/draft-utils';
import { JANELA_DE_GRACA_MS, TIMEOUT_FIM_DE_CORRIDA_MS, type EstadoSala } from './tipos';

const T0 = 1_000_000;
const CONEXAO_DO_HUMANO: Record<string, string> = {
  'humano-01': 'c1',
  'humano-02': 'c2',
  'humano-03': 'c3',
};

type Envios = { para: string | null; mensagem: MensagemServidor }[];

function mandar(
  estado: EstadoServidor,
  conexaoId: string,
  comando: unknown,
  agora = T0,
  token = 'tk',
): { estado: EstadoServidor; envios: Envios } {
  return aoReceber(estado, conexaoId, JSON.stringify(comando), agora, token);
}

/** Sala com N humanos prontos e o draft REALMENTE iniciado — nenhuma fase forjada. */
function salaIniciada(quantos: number): EstadoServidor {
  let estado = criarServidor('sala-barreira', 987_654, 'dificil', T0);
  const nomes = ['Ana', 'Beto', 'Cida'];
  for (let i = 0; i < quantos; i += 1) {
    estado = mandar(estado, `c${i + 1}`, { tipo: 'entrar', nome: nomes[i] }, T0, `tk${i + 1}`).estado;
  }
  for (let i = 0; i < quantos; i += 1) {
    estado = mandar(estado, `c${i + 1}`, { tipo: 'pronto', pronto: true }).estado;
  }
  return mandar(estado, 'c1', { tipo: 'iniciar' }).estado;
}

/** Avança UM passo real do draft, em nome de quem tem a vez. */
function passoDoDraft(estado: EstadoServidor): EstadoServidor {
  const draft = estado.sala.draft!;
  if (draft.fase === 'sorteios') {
    const vez = draft.humanos.find((id) => draft.rodada[id] <= RODADAS_SORTEIO)!;
    return mandar(estado, CONEXAO_DO_HUMANO[vez], {
      tipo: 'escolher',
      escolha: { tipo: 'componente', slot: 'chassi' },
      turnoEsperado: draft.rodada[vez],
    }).estado;
  }
  const vez = draft.ordemPeca[draft.indicePeca];
  return mandar(estado, CONEXAO_DO_HUMANO[vez], {
    tipo: 'escolher',
    escolha: { tipo: 'peca', pecaId: 'peca-qualquer' },
    turnoEsperado: draft.indicePeca,
  }).estado;
}

/**
 * Registra que há gente conectada. A sala NASCE com `vazioDesde` preenchido
 * (a carência de 2 min é o que dá tempo de compartilhar o código), então todo
 * teste que olha `decidirVida` depois de 2 minutos precisa disto — senão mede
 * a regra de sala VAZIA achando que mede a janela de graça.
 */
const comConexoes = (estado: EstadoServidor): EstadoServidor =>
  registrarConexoes(estado, 2, T0);

/** Leva o draft até `concluido` DE VERDADE, pelo funil real do servidor. */
function comDraftConcluido(quantos = 2): EstadoServidor {
  let estado = salaIniciada(quantos);
  let passos = 0;
  while (estado.sala.draft?.fase !== 'concluido') {
    estado = passoDoDraft(estado);
    passos += 1;
    if (passos > 500) throw new Error('o driver do teste não conseguiu concluir o draft');
  }
  return estado;
}

describe('📏 MEDIÇÃO da pendência 0(e): o tique com o draft concluído é inofensivo', () => {
  /**
   * O `ESTADO.md` registrava que adiar `concluidaEm` para o fim da corrida
   * "faz o tique de 5 s voltar a rodar durante o replay", e o comentário de
   * `party/sala.ts` estimava o custo em "~120 escritas em storage e 120
   * broadcasts de snapshot completo, por sala".
   *
   * 🔴 **A estimativa está ERRADA, e isto mede em vez de assumir** — que é a
   * regra que o próprio `ESTADO.md` impõe ("afirmação de estado só entra
   * medida"). Com o draft concluído, `deQuemEhAVez` devolve `[]`
   * (`draft-rede.ts:143`), logo `expirados` devolve `[]`, logo
   * `aoPassarOTempo` devolve o estado com a **MESMA REFERÊNCIA** e `envios`
   * vazio. E `aplicar` (`party/sala.ts:123`) só grava quando a referência
   * mudou. Custo real do tique durante o replay: **zero escritas, zero
   * broadcasts.**
   *
   * É isso que torna o corte nº 1 desnecessário — a razão para derrubar este
   * PR era um custo que não existe.
   */
  it('aoPassarOTempo DURANTE o replay devolve a MESMA referência e nenhum envio', () => {
    const estado = comDraftConcluido();
    expect(estado.sala.draft?.fase).toBe('concluido');

    // 1 minuto após a corrida abrir: dentro do replay, antes do timeout da
    // barreira. É a janela em que o comentário do `party/sala.ts` estimava
    // ~120 escritas e ~120 broadcasts.
    const r = aoPassarOTempo(estado, T0 + 60_000);

    expect(r.estado, 'identidade preservada ⇒ `aplicar` não grava no storage').toBe(estado);
    expect(r.envios, 'nenhum broadcast ⇒ nenhum snapshot completo no fio').toEqual([]);
  });

  it('anti-vacuidade: com o draft EM ANDAMENTO e prazo vencido, o mesmo tique MUDA o estado', () => {
    // Sem este par, o teste acima passaria mesmo que `aoPassarOTempo` fosse um
    // no-op incondicional — e não provaria nada sobre a fase concluída.
    const estado = salaIniciada(2);
    expect(estado.sala.draft?.fase).toBe('sorteios');

    const r = aoPassarOTempo(estado, T0 + 10 * 60_000);

    expect(r.estado).not.toBe(estado);
    expect(r.envios.length).toBeGreaterThan(0);
  });
});

describe('🔴 SALA REIDRATADA DE ANTES DO PR 3/4 (campos ausentes no storage)', () => {
  /**
   * O Durable Object devolve o objeto persistido CRU, sem migração de schema
   * (`carregar()` em `party/sala.ts`). Uma sala gravada antes deste PR não tem
   * `corridaAbertaEm` nem `atestaramFimDaCorrida` — e `undefined` **não é**
   * `null`. Precedente idêntico: `tokens` no 3.2.1 (`sala.ts`, `?? {}`).
   *
   * 🔴 BLOQUEANTE da revisão, em duas metades, e a primeira **não precisa de
   * cliente nenhum para acontecer**.
   */
  const semOsCamposNovos = (estado: EstadoServidor): EstadoServidor => {
    const cru = structuredClone(estado);
    // `Partial<EstadoSala>` só pra que o `delete` seja legal no TypeScript —
    // o objeto em runtime é o mesmo, e é exatamente o que o storage devolveria.
    const salaCrua = cru.sala as Partial<EstadoSala>;
    delete salaCrua.corridaAbertaEm;
    delete salaCrua.atestaramFimDaCorrida;
    return cru;
  };

  it('metade 1: o draft concluir ainda ABRE a corrida — senão `concluidaEm` fica null pra sempre', () => {
    // Com `!== null` em vez de `?? null`, `undefined !== null` é true e
    // `marcarCorridaAberta` retornava cedo PARA SEMPRE: a corrida nunca abria,
    // a barreira nunca fechava, a janela de graça nunca armava, e o log
    // append-only perdia o ponto de descarte que o C2 do 3.2 criou.
    const antigo = semOsCamposNovos(salaIniciada(2));
    expect(antigo.sala.corridaAbertaEm, 'pré-condição: o campo NÃO existe').toBeUndefined();

    let estado = antigo;
    let passos = 0;
    while (estado.sala.draft?.fase !== 'concluido') {
      estado = passoDoDraft(estado);
      passos += 1;
      if (passos > 500) throw new Error('o driver do teste não conseguiu concluir o draft');
    }
    expect(estado.sala.corridaAbertaEm, 'a corrida tem que abrir mesmo vindo de storage velho').not
      .toBeUndefined();
    expect(estado.sala.corridaAbertaEm).not.toBeNull();
  });

  it('metade 2: `corrida-concluida` numa sala reidratada NÃO LANÇA (aoReceber nunca lança)', () => {
    // `undefined.includes(jogadorId)` seria TypeError dentro do `onMessage` do
    // Durable Object. Hoje só um cliente fora do app alcança isso; com o PR
    // 4/4 vira caminho normal, e o cliente reconecta e reatesta em laço.
    const antigo = semOsCamposNovos(comDraftConcluido());
    expect(antigo.sala.atestaramFimDaCorrida, 'pré-condição: o campo NÃO existe').toBeUndefined();

    expect(() => mandar(antigo, 'c1', { tipo: 'corrida-concluida' }, T0 + 1000)).not.toThrow();
  });

  it('e a barreira funciona ponta a ponta a partir de um estado reidratado', () => {
    // 🔑 O cenário REAL do deploy: a sala foi gravada com o draft EM
    // ANDAMENTO e o código novo subiu no meio. (Uma sala pré-PR com o draft já
    // concluído teria `concluidaEm` preenchido pelo código ANTIGO, e aí o
    // comportamento antigo se mantém — não é este o caminho a proteger.)
    let estado = semOsCamposNovos(salaIniciada(2));
    let passos = 0;
    while (estado.sala.draft?.fase !== 'concluido') {
      estado = passoDoDraft(estado);
      passos += 1;
      if (passos > 500) throw new Error('o driver do teste não conseguiu concluir o draft');
    }
    const abertaEm = estado.sala.corridaAbertaEm!;
    expect(abertaEm, 'a corrida abriu apesar do storage velho').toBe(T0);

    estado = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, T0 + 1000).estado;
    expect(estado.sala.concluidaEm, '1 de 2 não fecha').toBeNull();
    estado = mandar(estado, 'c2', { tipo: 'corrida-concluida' }, T0 + 2000).estado;
    expect(estado.sala.concluidaEm, 'e o segundo fecha, vindo de storage sem os campos').toBe(
      T0 + 2000,
    );
  });
});

describe('🔴 (B) `concluidaEm` marca o fim da CORRIDA, não o do DRAFT', () => {
  it('o draft concluir NÃO arma mais a janela de graça', () => {
    const estado = comDraftConcluido();
    expect(estado.sala.draft?.fase).toBe('concluido');
    expect(
      estado.sala.concluidaEm,
      'armar a janela no fim do draft faz os 10 minutos correrem durante o replay — a sala podia fechar com gente assistindo',
    ).toBeNull();
  });

  it('o draft concluir ABRE a corrida — é daí que o timeout da barreira conta', () => {
    const estado = comDraftConcluido();
    expect(estado.sala.corridaAbertaEm).toBe(T0);
  });

  it('`corridaAbertaEm` é idempotente: não se remarca a cada broadcast seguinte', () => {
    // 🔴 8ª ocorrência de "o teste afirmava o que não conferia", pega na
    // revisão: a versão anterior usava `{ tipo: 'sincronizar' }`, que é
    // justamente o ÚNICO comando que NÃO difunde — ele cai em `soPara` e
    // devolve o MESMO objeto de estado. A asserção comparava um campo consigo
    // mesmo e passava sob qualquer implementação, inclusive com o guarda de
    // idempotência de `marcarCorridaAberta` removido.
    //
    // `corrida-concluida` de 1 dos 2 humanos MUDA o estado, então passa por
    // `difundir` de verdade — que é onde `marcarCorridaAberta` é chamada com
    // um `agora` novo e teria a chance de remarcar.
    let estado = comDraftConcluido();
    const marcadoEm = estado.sala.corridaAbertaEm;
    expect(marcadoEm).toBe(T0);

    const r = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, T0 + 30_000);
    expect(r.estado, 'pré-condição: este comando precisa MUDAR o estado').not.toBe(estado);
    expect(r.envios.some((e) => e.para === null), 'e precisa DIFUNDIR').toBe(true);
    estado = r.estado;

    expect(estado.sala.corridaAbertaEm, 'a âncora do timeout não pode fugir pra frente').toBe(
      marcadoEm,
    );
  });

  it('enquanto a corrida não termina, a sala NÃO é encerrada pela janela de graça', () => {
    // `comConexoes` é obrigatório aqui: a sala nasce com `vazioDesde`
    // preenchido (a carência é o que dá tempo de compartilhar o código), e sem
    // registrar que há gente dentro o `decidirVida` encerraria por VAZIA em 2
    // minutos — o teste passaria a medir a coisa errada.
    const estado = comConexoes(comDraftConcluido());
    // Bem depois dos 10 minutos: sem `concluidaEm`, a janela nem começou.
    const bemDepois = T0 + JANELA_DE_GRACA_MS + 60_000;
    expect(decidirVida(estado, bemDepois).tipo).toBe('seguir');
  });
});

describe('🔴 (A fraca) a barreira é NO FIM e NÃO bloqueia ninguém', () => {
  it('todos os elegíveis atestando fecha a corrida na hora', () => {
    let estado = comDraftConcluido();
    const tFim = T0 + 200_000;

    estado = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, tFim).estado;
    expect(estado.sala.concluidaEm, 'com 1 de 2, a corrida ainda não acabou').toBeNull();

    estado = mandar(estado, 'c2', { tipo: 'corrida-concluida' }, tFim).estado;
    expect(estado.sala.concluidaEm, 'o último atestado fecha a barreira').toBe(tFim);
  });

  it('a janela de graça passa a contar do FIM DA CORRIDA', () => {
    let estado = comDraftConcluido();
    const tFim = T0 + 200_000;
    estado = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, tFim).estado;
    estado = mandar(estado, 'c2', { tipo: 'corrida-concluida' }, tFim).estado;
    estado = comConexoes(estado);

    expect(decidirVida(estado, tFim + JANELA_DE_GRACA_MS - 1).tipo).toBe('seguir');
    const fim = decidirVida(estado, tFim + JANELA_DE_GRACA_MS);
    expect(fim.tipo).toBe('encerrar');
    // 🔒 O motivo importa: sem esta asserção o teste ficaria verde por
    // 'vazia', que é outra regra e conta de outro instante — e a janela do fim
    // da corrida não estaria sendo medida por nada.
    expect(fim.tipo === 'encerrar' && fim.motivo).toBe('janela-vencida');
  });

  it('🔒 quem NUNCA atesta não prende a sala: o timeout resolve no tique', () => {
    // O caso que a barreira forte (bloqueante) tornaria insuportável: um
    // jogador fecha a aba no meio do replay e nunca reporta. A sala não pode
    // ficar refém dele — nem para sempre, nem prendendo os outros numa tela.
    let estado = comDraftConcluido();
    estado = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, T0 + 200_000).estado;
    expect(estado.sala.concluidaEm).toBeNull();

    const antes = aoPassarOTempo(estado, T0 + TIMEOUT_FIM_DE_CORRIDA_MS - 1);
    expect(antes.estado.sala.concluidaEm, 'um tique antes do timeout, ainda aberta').toBeNull();

    const vencido = T0 + TIMEOUT_FIM_DE_CORRIDA_MS;
    const depois = aoPassarOTempo(estado, vencido);
    expect(depois.estado.sala.concluidaEm, 'vencido o timeout, a sala decide sozinha').toBe(vencido);
  });

  it('🔒 um AUSENTE não conta para a barreira — senão toda sala cairia no timeout', () => {
    // `humano-02` abandona; sobra só `humano-01` como elegível. Se o ausente
    // contasse, o atestado do único jogador restante não fecharia nada e a
    // barreira seria decorativa: todas as salas com abandono esperariam o
    // timeout inteiro.
    // O abandono tem que acontecer DURANTE o draft: `abandonar` com o draft
    // concluído é recusado (`draft-concluido`, em `draft-rede.ts`). Então:
    // inicia, abandona, e só então leva o draft ao fim com quem sobrou.
    let estado = salaIniciada(2);
    estado = mandar(estado, 'c2', { tipo: 'abandonar' }, T0 + 1000).estado;
    expect(estado.sala.draft?.ausentes).toContain('humano-02');
    let passos = 0;
    while (estado.sala.draft?.fase !== 'concluido') {
      estado = passoDoDraft(estado);
      passos += 1;
      if (passos > 500) throw new Error('o driver do teste não conseguiu concluir o draft');
    }

    const tFim = T0 + 200_000;
    estado = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, tFim).estado;
    expect(estado.sala.concluidaEm).toBe(tFim);
  });

  it('atestado DUPLICADO preserva a identidade do estado (não vira escrita no DO)', () => {
    // 22 clientes reatestando a cada reconexão seriam 22 escritas de graça.
    let estado = comDraftConcluido();
    estado = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, T0 + 200_000).estado;
    const depoisDoPrimeiro = estado;

    const r = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, T0 + 210_000);
    expect(r.estado, 'atestado repetido não muda nada').toBe(depoisDoPrimeiro);
  });

  it('atestado ANTES do draft concluir é recusado — não há corrida pra terminar', () => {
    const estado = salaIniciada(2);
    expect(estado.sala.draft?.fase).toBe('sorteios');
    const r = mandar(estado, 'c1', { tipo: 'corrida-concluida' }, T0 + 1000);
    expect(r.estado).toBe(estado);
    expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(true);
  });

  it('🔒 TODOS ausentes não fecha a corrida na hora — resolve pelo timeout', () => {
    // Cobre o guarda `elegiveis.length > 0`. Sem ele, `every` sobre lista
    // vazia é `true` e a barreira fecharia no instante em que o draft
    // concluísse — rearmando a janela de graça cedo demais, que é exatamente
    // o defeito que este PR conserta. A mutação que apaga o guarda sobrevivia
    // à suíte inteira antes deste teste (achado da revisão).
    let estado = salaIniciada(2);
    estado = mandar(estado, 'c1', { tipo: 'abandonar' }, T0 + 500).estado;
    estado = mandar(estado, 'c2', { tipo: 'abandonar' }, T0 + 600).estado;
    let passos = 0;
    while (estado.sala.draft?.fase !== 'concluido') {
      estado = passoDoDraft(estado);
      passos += 1;
      if (passos > 500) throw new Error('o driver do teste não conseguiu concluir o draft');
    }
    expect(estado.sala.draft?.ausentes.length, 'pré-condição: ninguém ativo').toBe(2);

    expect(estado.sala.concluidaEm, 'sem elegíveis, NÃO fecha na conclusão do draft').toBeNull();
    // ⚠️ A âncora é `corridaAbertaEm`, NÃO `T0`: aqui o draft conclui depois
    // do início (os abandonos acontecem em T0+500/+600), então contar a partir
    // de `T0` deixaria o tique 600 ms antes do timeout e o teste falharia
    // dizendo a coisa errada sobre o guarda que ele existe pra cobrir.
    const abertaEm = estado.sala.corridaAbertaEm!;
    const vencido = abertaEm + TIMEOUT_FIM_DE_CORRIDA_MS;
    expect(aoPassarOTempo(estado, vencido - 1).estado.sala.concluidaEm).toBeNull();
    expect(aoPassarOTempo(estado, vencido).estado.sala.concluidaEm).toBe(vencido);
  });

  it('🔒 NÃO é barreira de largada: o servidor não segura NADA antes da corrida', () => {
    // A prova de que ninguém espera numa tela: assim que o draft conclui, o
    // snapshot já leva `seedCorrida` preenchida — que é tudo de que o cliente
    // precisa pra computar e exibir a corrida. Nenhum atestado alheio é
    // pré-requisito. Quem chegou, corre.
    const estado = comDraftConcluido();
    const r = mandar(estado, 'c1', { tipo: 'sincronizar' }, T0 + 1000);
    const snapshot = r.envios.find((e) => e.mensagem.tipo === 'estado')!.mensagem as {
      estado: { seedCorrida: number | null };
    };
    expect(snapshot.estado.seedCorrida, 'a corrida está disponível sem esperar ninguém').not.toBeNull();
    expect(estado.sala.concluidaEm, 'e ela ainda não terminou').toBeNull();
  });
});
