/**
 * PR 3.5.2 — O CURSOR DE ETAPAS, A BARREIRA POR ETAPA E O CONSERTO DO DETECTOR.
 *
 * 🔑 **O que este arquivo prova, e por que ele é de SERVIDOR PURO.** Regra de
 * método travada no plano do 3.5 (§"REGRAS DE MÉTODO TRAVADAS PARA OS QUATRO
 * PRs", item 1): o baseline do detector é do 3.5.2 e roda em
 * `servidor-sala.ts`, **sem cliente e sem jsdom**. Deixá-lo para o 3.5.3
 * prenderia o teste mais importante da fase à única camada sem cobertura
 * automática (pendência 0(m)).
 *
 * 🔴 **O DEFEITO QUE O BLOCO DO DETECTOR CAPTURA** (achado ao planejar o 3.5,
 * não estava em pendência nenhuma): o balde de atestados é indexado **só por
 * escopo** e a âncora é `draft.log.length`, que **para de crescer quando o
 * draft conclui**. Logo as etapas 1..N atestam com a MESMA âncora e o MESMO
 * escopo `'corrida'`, e o hash difere por `pistaId` — **por construção**.
 * Resultado: um alarme falso na virada da etapa 1, TRAVADO para o resto do
 * campeonato. A reação natural a um banner permanentemente errado é desligar o
 * banner — que é como se mata o detector inteiro.
 *
 * 🔒 **COMO O BASELINE FOI ESCRITO PARA NÃO SER VERMELHO DE COMPILAÇÃO**
 * (regra travada: *"vermelho de compilação não conta como baseline"*).
 * `aoReceber` recebe **JSON cru** (`bruto: string`) e o `atestadoValido` atual
 * confere só `escopo`/`ancora`/`hash`, **ignorando campos desconhecidos**.
 * Então os testes daqui mandam `etapa` desde o começo: o servidor de ANTES do
 * conserto simplesmente o ignora e dispara o alarme falso — vermelho
 * **comportamental**, no comportamento exato que o PR existe para mudar.
 *
 * ⚠️ **AS DUAS METADES, e uma sem a outra é pior que nada** (repetição da 4ª
 * instância de "o teste afirmava o que não conferia", no 3.4, em que um teste
 * de lag comparava estados idênticos):
 * - *"alarme antes"* é **VERDE hoje e VERDE depois** — ele é **guarda
 *   ANTI-VACUIDADE**, não baseline. Sem ele, "silêncio depois" passaria por
 *   "nada nunca alarma", que é como se entrega um detector morto com a suíte
 *   verde.
 * - *"silêncio depois"* é o **baseline vermelho** de verdade.
 * - e o par que fecha a armadilha: **divergência REAL dentro da MESMA etapa
 *   ainda tem que alarmar** depois do conserto.
 */

import { describe, expect, it } from 'vitest';
import {
  aoDesconectar,
  aoPassarOTempo,
  aoReceber,
  avaliarBarreiraDaCorrida,
  criarServidor,
  type EstadoServidor,
} from './servidor-sala';
import { estadoDasSeeds, publicarSala } from './sala';
import type { MensagemServidor } from './protocolo';
import { RODADAS_SORTEIO } from '../engine/draft-utils';
import { N_ETAPAS_CURTA, TIMEOUT_FIM_DE_CORRIDA_MS, type EstadoSala } from './tipos';

/**
 * Seeds do campeonato para esta suíte. Valores fixos e distintivos — nenhum
 * derivado da `seedMestre`, que é o ponto do `B-indep`. Quem exercita o
 * comportamento das seeds é `campeonato-online.test.ts`; aqui elas só
 * satisfazem o construtor.
 */
const SEEDS_T = {
  etapas: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010],
  calendario: 7777,
};

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
  let estado = criarServidor('sala-cursor', 987_654, 'dificil', T0, SEEDS_T, N_ETAPAS_CURTA);
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
 * Leva o draft até `concluido` DE VERDADE, pelo funil real do servidor.
 * Mesmo idioma de `barreira-corrida.test.ts` — fase forjada à mão testaria a
 * fixture, não o servidor.
 */
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

/** Hashes de 16 hex — a FORMA que `atestadoValido` exige. */
const H = (n: number): string => String(n).repeat(16).slice(0, 16);

/** A âncora terminal: o log parou de crescer quando o draft concluiu. */
const ancoraDe = (estado: EstadoServidor): number => estado.sala.draft?.log.length ?? 0;

/**
 * Manda um atestado de hash da CORRIDA, sempre com o campo `etapa`.
 *
 * 🔒 O campo vai desde o baseline de propósito — ver o docblock do topo. No
 * servidor de antes do conserto ele é ignorado (campo desconhecido), e é
 * justamente isso que produz o vermelho comportamental.
 */
function atestarHash(
  estado: EstadoServidor,
  conexaoId: string,
  etapa: number,
  hash: string,
): { estado: EstadoServidor; alarmes: Extract<MensagemServidor, { tipo: 'divergencia' }>[] } {
  const r = mandar(estado, conexaoId, {
    tipo: 'hash',
    escopo: 'corrida',
    ancora: ancoraDe(estado),
    etapa,
    hash,
  });
  const alarmes: Extract<MensagemServidor, { tipo: 'divergencia' }>[] = [];
  for (const envio of r.envios) {
    if (envio.mensagem.tipo === 'divergencia') alarmes.push(envio.mensagem);
  }
  return { estado: r.estado, alarmes };
}

/** Todo mundo atesta o FIM da etapa corrente (a barreira). */
function todosAtestamFim(
  estado: EstadoServidor,
  conexoes: string[],
  agora: number,
): EstadoServidor {
  let atual = estado;
  for (const c of conexoes) {
    atual = mandar(atual, c, { tipo: 'corrida-concluida' }, agora).estado;
  }
  return atual;
}

describe('🔴 O DETECTOR POR ETAPA — o alarme falso que trava o campeonato', () => {
  it('🛡️ ANTI-VACUIDADE (verde antes e depois): divergência na etapa 0 ALARMA', () => {
    const base = comDraftConcluido(2);
    const a = atestarHash(base, 'c1', 0, H(1));
    const b = atestarHash(a.estado, 'c2', 0, H(2));

    // Sem esta asserção, "silêncio depois" passaria por "nada nunca alarma" —
    // um detector morto com a suíte verde.
    expect([...a.alarmes, ...b.alarmes].length).toBeGreaterThan(0);
  });

  it('🔴 BASELINE: etapa seguinte com a MESMA âncora e hash diferente NÃO pode alarmar', () => {
    let estado = comDraftConcluido(2);

    // Etapa 0: os dois concordam. Nada a acusar.
    const e0a = atestarHash(estado, 'c1', 0, H(1));
    const e0b = atestarHash(e0a.estado, 'c2', 0, H(1));
    estado = e0b.estado;
    expect([...e0a.alarmes, ...e0b.alarmes]).toEqual([]);

    // Etapa 1: os dois concordam ENTRE SI, num hash naturalmente diferente do
    // da etapa 0 — o hash difere por `pistaId`, por construção. A âncora é a
    // mesma porque o log do draft parou de crescer.
    const e1a = atestarHash(estado, 'c1', 1, H(2));
    const e1b = atestarHash(e1a.estado, 'c2', 1, H(2));

    expect([...e1a.alarmes, ...e1b.alarmes]).toEqual([]);
  });

  it('🛡️ ANTI-VACUIDADE (verde antes e depois): divergência REAL dentro da MESMA etapa ainda alarma', () => {
    // Este é o par que fecha a armadilha do baseline acima: sem ele, o
    // conserto poderia ser "nunca mais alarma" e os dois testes ficariam
    // verdes juntos.
    let estado = comDraftConcluido(2);
    estado = atestarHash(estado, 'c1', 0, H(1)).estado;
    estado = atestarHash(estado, 'c2', 0, H(1)).estado;

    const a = atestarHash(estado, 'c1', 1, H(2));
    const b = atestarHash(a.estado, 'c2', 1, H(3));

    expect([...a.alarmes, ...b.alarmes].length).toBeGreaterThan(0);
  });

  it('🔴 BASELINE D2: o alarme CARREGA a etapa que divergiu', () => {
    let estado = comDraftConcluido(2);
    estado = atestarHash(estado, 'c1', 0, H(1)).estado;
    estado = atestarHash(estado, 'c2', 0, H(1)).estado;

    const a = atestarHash(estado, 'c1', 1, H(2));
    const b = atestarHash(a.estado, 'c2', 1, H(3));
    const alarmes = [...a.alarmes, ...b.alarmes];

    // 🔒 O CAST É DELIBERADO e existe para manter o vermelho COMPORTAMENTAL.
    // Ler `alarmes[0].etapa` direto seria TS2339 — vermelho de COMPILAÇÃO, que
    // a regra travada do 3.5 não aceita como baseline. Assim o teste compila
    // hoje e falha porque o campo **não existe em runtime**, que é o fato.
    // D2 (decisão do dev, 2026-08-20): sem a etapa, o banner do 3.4.1 não sabe
    // qual etapa divergiu e dois alarmes de etapas diferentes ficam idênticos.
    expect(alarmes.length).toBeGreaterThan(0);
    expect((alarmes[0] as { etapa?: number }).etapa).toBe(1);
  });

  /**
   * 🔴 **BLOQUEANTE C2 DA REVISÃO — a versão anterior deste teste era VACUOSA,
   * e medido: apagar a guarda `if (etapa < cursor)` deixava a suíte inteira
   * verde, 1531/1531.**
   *
   * O defeito: ele rodava sobre `comDraftConcluido(2)`, que deixa o cursor em
   * **0**, e mandava o atestado "atrasado" com `etapa: 0`. A guarda é
   * `etapa < cursor`, ou seja `0 < 0` — **nunca entrada**. O silêncio observado
   * vinha de outro lugar (o balde da etapa 0 nascia vazio, um único ocupante,
   * `divergentes` sai `[]`), então o teste passava com a guarda presente,
   * ausente ou escrita ao contrário.
   *
   * 🔑 **É a 6ª instância da família que a Fase 3 já pagou cinco vezes** — "o
   * teste afirmava o que não conferia" —, desta vez dentro do teste rotulado
   * como baseline da decisão D1.
   *
   * **As DUAS condições abaixo são necessárias, e é por isso que estão
   * asseridas como pré-condição em vez de supostas:**
   * 1. o cursor tem de ter ANDADO (senão a guarda não é alcançada);
   * 2. o balde da etapa velha tem de estar POPULADO com hash conflitante
   *    (senão o silêncio é superdeterminado pelo balde vazio e o teste volta a
   *    ser vacuoso com a guarda apagada).
   */
  it('🔴 BASELINE D1 (metade 2): cliente ATRASADO em relação ao CURSOR é ignorado EM SILÊNCIO', () => {
    let estado = comDraftConcluido(2);

    // Condição 2: c2 deixa o balde `corrida:0` populado com H(9).
    estado = atestarHash(estado, 'c2', 0, H(9)).estado;
    expect(
      estado.atestados?.['corrida:0'],
      'pré-condição: o balde da etapa 0 está POPULADO',
    ).toBeDefined();

    // Condição 1: a barreira da etapa 0 fecha DE VERDADE e o cursor anda.
    estado = todosAtestamFim(estado, ['c1', 'c2'], T0 + 1000);
    expect(estado.sala.etapaAtual, 'pré-condição: o cursor ANDOU para 1').toBe(1);

    // c1 chega atrasado com o hash da etapa 0 — e ele CONFLITA com o de c2 que
    // já está no balde. Sem a guarda, isto alarma. Ele não está errado, está
    // atrasado: alarme que dispara com lag de rede é desligado na primeira
    // semana.
    const atrasado = atestarHash(estado, 'c1', 0, H(1));
    expect(atrasado.alarmes, 'atrasado NÃO alarma').toEqual([]);
    expect(
      atrasado.estado.atestados?.['corrida:0']?.porJogador['humano-01'],
      'e nem sequer entra no balde da etapa que já fechou',
    ).toBeUndefined();
  });

  /**
   * 🔴 **BLOQUEANTE C3 DA REVISÃO — a metade 1 da D1 não tinha teste nenhum.**
   *
   * O docblock de `registrarAtestado` afirma que trocar `atestado.etapa ??
   * cursor` por `?? 0` fixo *"devolveria o alarme falso inteiro pela porta do
   * conserto"*. Medido: o mutante `?? 0` sobrevivia à suíte inteira, 1531/1531
   * verde, lint 0, typecheck 0 — porque nenhum teste mandava atestado SEM o
   * campo com o cursor fora do zero, e em cursor 0 as duas expressões são
   * indistinguíveis.
   *
   * O caso é real e não hipotético: é o cliente 3.5.1 contra o worker 3.5.2
   * numa janela de deploy escalonado — `etapa` é opcional no protocolo
   * exatamente para isso.
   */
  it('🔴 BASELINE D1 (metade 1): sem o campo `etapa`, o default é o CURSOR — nunca 0 fixo', () => {
    let estado = comDraftConcluido(2);
    estado = todosAtestamFim(estado, ['c1', 'c2'], T0 + 1000);
    expect(estado.sala.etapaAtual, 'pré-condição: o cursor ANDOU para 1').toBe(1);

    const r = mandar(estado, 'c1', {
      tipo: 'hash',
      escopo: 'corrida',
      ancora: ancoraDe(estado),
      hash: H(5),
    });

    expect(
      r.estado.atestados?.['corrida:1'],
      'bucketizado na etapa CORRENTE',
    ).toBeDefined();
    expect(
      r.estado.atestados?.['corrida:0'],
      'com `?? 0` fixo cairia aqui — o alarme falso de volta',
    ).toBeUndefined();
  });

  it('🔒 TETO: `etapa` fora de [0, nEtapas-1] é comando inválido (a chave do balde é do cliente)', () => {
    const estado = comDraftConcluido(2);
    // Sem teto, a chave `${escopo}:${etapa}` é controlada pelo cliente e cresce
    // o estado PERSISTIDO do DO sem limite — a amplificação de escrita que
    // `party/sala.ts` chama de "barata de explorar". Mesmo precedente do
    // `tetoAncora` que já existe em `atestadoValido`.
    for (const etapa of [-1, 1.5, N_ETAPAS_CURTA, 2 ** 40]) {
      const r = mandar(estado, 'c1', {
        tipo: 'hash',
        escopo: 'corrida',
        ancora: ancoraDe(estado),
        etapa,
        hash: H(1),
      });
      const erros = r.envios.filter((e) => e.mensagem.tipo === 'erro');
      expect(erros.length, `etapa=${etapa} devia ser recusada`).toBeGreaterThan(0);
    }
  });
});

describe('🏁 A BARREIRA POR ETAPA — o cursor anda, e só a última conclui', () => {
  it('🔴 BASELINE: fechada a barreira da etapa 0, o cursor vai a 1 e `concluidaEm` continua null', () => {
    const base = comDraftConcluido(2);
    expect(base.sala.etapaAtual).toBe(0);

    const depois = todosAtestamFim(base, ['c1', 'c2'], T0 + 1_000);

    expect(depois.sala.etapaAtual).toBe(1);
    // 🔑 `concluidaEm` é o que ARMA A JANELA DE GRAÇA. Marcá-lo na etapa 0
    // mataria a sala no meio do campeonato — é a mesma classe de defeito que o
    // PR 3/4 consertou (o fim do DRAFT armava a janela durante o replay).
    expect(depois.sala.concluidaEm).toBeNull();
  });

  it('🔴 BASELINE: o avanço RESETA os atestados e RE-ANCORA o relógio da etapa', () => {
    const base = comDraftConcluido(2);
    const depois = todosAtestamFim(base, ['c1', 'c2'], T0 + 1_000);

    // Sem o reset, a etapa 1 nasce com a barreira já satisfeita e concluiria
    // na hora; sem a re-âncora, o timeout da etapa 1 já nasceria vencido.
    expect(depois.sala.atestaramFimDaCorrida).toEqual([]);
    expect(depois.sala.corridaAbertaEm).toBe(T0 + 1_000);
  });

  it('🔴 BASELINE: `seedsAbertas` cresce com o cursor — e NUNCA revela as futuras', () => {
    const base = comDraftConcluido(2);
    expect(publicarSala(base.sala).seedsAbertas).toEqual([SEEDS_T.etapas[0]]);

    const depois = todosAtestamFim(base, ['c1', 'c2'], T0 + 1_000);

    expect(publicarSala(depois.sala).seedsAbertas).toEqual([
      SEEDS_T.etapas[0],
      SEEDS_T.etapas[1],
    ]);
  });

  it('🔴 BASELINE: só a barreira da ÚLTIMA etapa marca `concluidaEm`', () => {
    let estado = comDraftConcluido(2);

    for (let k = 0; k < N_ETAPAS_CURTA; k += 1) {
      expect(estado.sala.etapaAtual, `antes de fechar a etapa ${k}`).toBe(k);
      expect(estado.sala.concluidaEm, `etapa ${k} não é a última`).toBeNull();
      estado = todosAtestamFim(estado, ['c1', 'c2'], T0 + 1_000 * (k + 1));
    }

    // 🔒 O cursor PARA em `nEtapas - 1` e quem diz "acabou" é `concluidaEm`.
    // Deixar o cursor passar de `nEtapas` criaria um segundo jeito de dizer a
    // mesma coisa — e dois jeitos de dizer a mesma coisa é a classe de bug do
    // 8.4 em miniatura.
    expect(estado.sala.etapaAtual).toBe(N_ETAPAS_CURTA - 1);
    expect(estado.sala.concluidaEm).not.toBeNull();
  });

  it('🔴 BASELINE (pendência 0(k)): os elegíveis são RECOMPUTADOS por etapa', () => {
    let estado = comDraftConcluido(3);
    estado = todosAtestamFim(estado, ['c1', 'c2', 'c3'], T0 + 1_000);
    expect(estado.sala.etapaAtual).toBe(1);

    // Cida fecha a aba durante a etapa 1.
    estado = aoDesconectar(estado, 'c3', T0 + 2_000).estado;

    // Os dois que ficaram atestam. Com os elegíveis CONGELADOS no fim do draft
    // (o comportamento de hoje), a sala esperaria os 5 minutos inteiros de
    // `TIMEOUT_FIM_DE_CORRIDA_MS` por quem não vai voltar — e pagaria isso em
    // TODA etapa seguinte.
    estado = todosAtestamFim(estado, ['c1', 'c2'], T0 + 3_000);

    expect(estado.sala.etapaAtual).toBe(2);
  });

  it('🛡️ ANTI-VACUIDADE: sem atestado de ninguém, o cursor NÃO anda — quem anda é a barreira', () => {
    const base = comDraftConcluido(2);

    // Sem esta asserção, "o cursor avançou" passaria por "o cursor avança
    // sozinho a cada tique", que não é barreira nenhuma.
    const semNinguem = aoPassarOTempo(base, T0 + 1_000).estado;
    expect(semNinguem.sala.etapaAtual).toBe(0);

    // E o timeout continua sendo o teto para quem nunca atesta.
    const vencido = aoPassarOTempo(base, T0 + TIMEOUT_FIM_DE_CORRIDA_MS + 1).estado;
    expect(vencido.sala.etapaAtual).toBe(1);
  });
});

describe('🔒 Pendência 0(r) — `etapaAtual` DENTRO do discriminante', () => {
  /**
   * O registro da pendência: *"o cursor é justamente o campo que governa
   * quantos segredos saem no fio — quando o 3.5.2 o fizer se mover, trazê-lo
   * para dentro do discriminante."* Este é o PR que o faz se mover.
   *
   * Hoje há três leituras defensivas `?? 0` que tratam o cursor de forma
   * frouxa enquanto `estadoDasSeeds` valida as seeds com rigor.
   */
  const comCursor = (etapaAtual: unknown): EstadoSala => ({
    ...criarServidor('sala-r', 1, 'facil', T0, SEEDS_T, N_ETAPAS_CURTA).sala,
    etapaAtual: etapaAtual as number,
  });

  it('🔴 BASELINE: cursor fora de forma é `corrompida`, não `ok` com default', () => {
    for (const ruim of [-1, 1.5, N_ETAPAS_CURTA, 2 ** 40, undefined, null, '0']) {
      const r = estadoDasSeeds(comCursor(ruim));
      expect(r.tipo, `etapaAtual=${String(ruim)}`).toBe('corrompida');
    }
  });

  it('🛡️ ANTI-VACUIDADE: cursor válido continua `ok` em toda a faixa', () => {
    for (let k = 0; k < N_ETAPAS_CURTA; k += 1) {
      expect(estadoDasSeeds(comCursor(k)).tipo, `etapaAtual=${k}`).toBe('ok');
    }
  });

  /**
   * 🔴 **Aviso N2 da revisão do 3.5.2, promovido a conserto por decisão do dev.**
   *
   * `cursorDaSala` é tolerante de propósito (sala LEGADO não tem `etapaAtual` em
   * runtime e mesmo assim precisa bucketizar atestados de draft). O problema não
   * era a tolerância: era o valor tolerado ser **escrito de volta**. Numa sala
   * com `etapaAtual: -3`, `cursorDaSala` devolvia 0 e o avanço gravava
   * `etapaAtual: 1` — **sala `corrompida` virava íntegra sozinha**, que é a
   * cura silenciosa que `estadoDasSeeds` declara não existir.
   *
   * 🔑 **Por que consertar mesmo sendo hoje inalcançável:** `jogavel()` cobre os
   * caminhos de entrada, então nenhuma sala de produção chega aqui. Mas isso
   * torna a invariante NÃO-LOCAL, exatamente a forma da pendência 0(t) — ela só
   * vale porque uma guarda anterior existe. Uma linha a devolve para dentro.
   *
   * 🔒 **A tolerância com sala LEGADO é preservada e tem asserção própria
   * abaixo** — sem ela, o conserto quebraria a barreira de toda sala pré-3.5.1,
   * que é o oposto do que se quer.
   */
  it('🔴 BASELINE (N2): cursor fora de faixa NÃO é curado pela barreira', () => {
    const base = comDraftConcluido(2);
    const corrompida: EstadoServidor = {
      ...base,
      sala: { ...base.sala, etapaAtual: -3 },
    };
    expect(estadoDasSeeds(corrompida.sala).tipo, 'pré-condição').toBe('corrompida');

    const depois = avaliarBarreiraDaCorrida(corrompida, T0 + 1000, 0);
    expect(depois, 'nada foi tocado — a MESMA referência volta').toBe(corrompida);
    expect(
      estadoDasSeeds(depois.sala).tipo,
      'a sala continua corrompida em vez de se curar',
    ).toBe('corrompida');
  });

  /**
   * 🔴 **AVISO 1 DA SEGUNDA PASSADA DA REVISÃO — e o achado é sobre o conserto
   * do N2, escrito nesta mesma sessão.**
   *
   * A primeira versão da guarda validava a **forma do CURSOR** e o docblock
   * afirmava que "isto devolve a invariante para dentro desta função, em vez de
   * deixá-la depender de `jogavel()` ter rodado antes". **A afirmação era mais
   * forte que o código.** Sala v2 que perde `nEtapas` **com o cursor em 0**:
   * `nEtapasDaSala` devolve o piso 1, `cursorIntegro(0, 1)` é `true`, a guarda
   * **passa**, e `cursor >= nEtapas - 1` marca `concluidaEm` — **o modo de
   * falha medido do bloqueante C1, intacto dentro da camada pura.** O caso
   * cursor 3 tinha duas camadas de defesa; o caso cursor 0 tinha uma só, a
   * mesma que já existia antes do conserto.
   *
   * 🔑 **É a classe de defeito que este PR inteiro existe para combater**,
   * cometida no próprio conserto dela: docblock afirmando garantia que o código
   * não dá. Por isso a guarda passou a consultar `estadoDasSeeds` — a mesma
   * autoridade do discriminante —, e não uma checagem paralela.
   */
  it('🔴 BASELINE (AVISO 1): sala v2 SEM `nEtapas` e cursor 0 NÃO conclui pela barreira', () => {
    const base = comDraftConcluido(2);
    const v2Quebrada = { ...base.sala } as EstadoSala;
    delete (v2Quebrada as { nEtapas?: number }).nEtapas;
    expect(v2Quebrada.versaoSala, 'pré-condição: é v2').toBeGreaterThanOrEqual(2);
    expect(v2Quebrada.etapaAtual, 'pré-condição: o cursor está em 0').toBe(0);
    expect(estadoDasSeeds(v2Quebrada).tipo, 'pré-condição: o discriminante acusa').toBe(
      'corrompida',
    );

    const estado: EstadoServidor = { ...base, sala: v2Quebrada };
    const depois = avaliarBarreiraDaCorrida(estado, T0 + 1000, 0);
    expect(depois, 'a barreira tocou numa sala corrompida').toBe(estado);
    expect(depois.sala.concluidaEm, 'campeonato de 5 etapas encerrado na etapa 1').toBeNull();
  });

  it('🛡️ ANTI-VACUIDADE (N2): sala LEGADO, sem `etapaAtual`, continua fechando a barreira', () => {
    const base = comDraftConcluido(2);
    const legado = { ...base.sala } as EstadoSala;
    delete (legado as { etapaAtual?: number }).etapaAtual;
    delete (legado as { nEtapas?: number }).nEtapas;
    delete (legado as { versaoSala?: number }).versaoSala;
    expect(estadoDasSeeds(legado).tipo, 'pré-condição: é legado').toBe('legado');

    const depois = avaliarBarreiraDaCorrida({ ...base, sala: legado }, T0 + 1000, 0);
    expect(depois.sala.concluidaEm, 'legado é campeonato de 1 etapa e CONCLUI').toBe(T0 + 1000);
  });

  /**
   * 🔒 A metade COMPORTAMENTAL do bloqueante C1 — o discriminante já está
   * coberto em `campeonato-online.test.ts`; aqui se prova o DESFECHO, que é o
   * que a decisão do default 1 promete preservar.
   */
  it('🔒 C1: sala v1 (3.5.1, sem `nEtapas`) conclui na PRIMEIRA barreira — 1 etapa', () => {
    const base = comDraftConcluido(2);
    const v1 = { ...base.sala, versaoSala: 1 } as EstadoSala;
    delete (v1 as { nEtapas?: number }).nEtapas;
    expect(estadoDasSeeds(v1).tipo, 'v1 sem o campo é LEGÍTIMA, não corrompida').toBe('ok');

    const depois = avaliarBarreiraDaCorrida({ ...base, sala: v1 }, T0 + 1000, 0);
    expect(depois.sala.concluidaEm, 'conclui, como fazia sob o 3.5.1').toBe(T0 + 1000);
    expect(depois.sala.etapaAtual, 'e o cursor NÃO anda numa sala de 1 etapa').toBe(0);
  });
});
