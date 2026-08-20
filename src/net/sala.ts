/**
 * Redutor puro da sala (PR 3.1a). Entra `EstadoSala` + `ComandoSala` + o id do
 * remetente (injetado pelo transporte, nunca vindo do fio), sai um
 * `EstadoSala` novo — sem I/O, sem estado global, sem `Math.random()`. O
 * transporte (3.2) só vai ligar mensagem de WebSocket neste redutor.
 *
 * Toda recusa devolve o MESMO objeto de estado (identidade preservada, não só
 * igualdade), o que torna barato pro servidor decidir se precisa fazer
 * broadcast — e nenhuma recusa incrementa `seq`.
 */

import { atribuirPerfis } from '../engine/bots';
import { deriveSeed } from '../engine/rng';
import type { Dificuldade, Jogador } from '../engine/types';
import { criarDraftRede, expirarJogador, reduzirDraft } from './draft-rede';
import {
  MAX_TAMANHO_NOME,
  type ComandoDraft,
  type ComandoSala,
  type ErroDraft,
  type ErroSala,
} from './protocolo';
import {
  MAX_ETAPAS,
  MIN_HUMANOS,
  QTD_JOGADORES,
  ROTULO_SEED_CORRIDA,
  ROTULO_SEED_DRAFT,
  VERSAO_ESTADO_SALA,
  type EstadoSala,
  type EstadoSalaPublico,
  type JogadorSala,
  type SeedsDoCampeonato,
} from './tipos';

/** Resultado de uma redução. `erro === null` ⇒ o comando foi aceito. */
export interface ResultadoSala {
  estado: EstadoSala;
  erro: ErroSala | null;
  /** Id alocado — só no `entrar` aceito. */
  jogadorId?: string;
}

/** Resultado de um comando de draft aplicado sobre a sala. */
export interface ResultadoSalaOuDraft {
  estado: EstadoSala;
  erro: ErroSala | ErroDraft | null;
}

/** `humano-01` .. `humano-22`. Padding de 2 dígitos pra que a ordem lexicográfica seja a numérica. */
function idHumano(indice: number): string {
  return `humano-${String(indice).padStart(2, '0')}`;
}

/** Ordem canônica da sala: crescente por id. Com o padding, comparar string basta. */
function porId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Cria uma sala vazia. `seedMestre` é normalizada pra uint32 (`>>> 0`), a
 * mesma convenção de `seedDeTexto` — é o contrato de seed que `createRng` e
 * `deriveSeed` esperam. No 3.2 quem gera esse valor é o Durable Object, que
 * também precisa PERSISTI-LO: regerar a seed depois de um restart mudaria a
 * partida no meio.
 */
export function criarSala(
  salaId: string,
  seedMestre: number,
  dificuldade: Dificuldade,
  /** Instante da criação. OBRIGATÓRIO: com default, a sala nasceria "vazia
   * desde 1970" e morreria no primeiro tique — a armadilha exata do defeito
   * que a carência conserta. */
  agora: number,
  /**
   * As seeds do campeonato, sorteadas pela casca. **OBRIGATÓRIO e sem
   * default**, pelo mesmo motivo de `agora`: um default aqui seria uma seed de
   * produção fixa, e um parâmetro opcional faria "esqueci de passar" virar
   * sala legado silenciosa — a exata confusão que `versaoSala` existe pra
   * impedir. Faltando, não compila.
   */
  seeds: SeedsDoCampeonato,
  /**
   * Quantas etapas esta sala tem.
   *
   * 🔒 **OBRIGATÓRIO e sem default, pelo mesmo motivo de `agora` e `seeds`
   * (decisão do dev, 2026-08-20).** Um default aqui deixaria a casca herdar em
   * silêncio um formato que ela não declarou — e como é `nEtapas` que decide
   * quando o campeonato ACABA, "esqueci de passar" viraria uma sala que
   * conclui na primeira barreira sem que ninguém tenha pedido isso. Faltando,
   * não compila; foi assim que a medição desta sessão flagrou que
   * `N_ETAPAS_CURTA` não tinha mais nenhum chamador de produção.
   *
   * **Todo jogo online é campeonato de `N_ETAPAS_CURTA` etapas** — a corrida
   * avulsa online foi o degrau, não um modo (decisão do dev, 2026-08-20).
   */
  nEtapas: number,
): EstadoSala {
  // 🔒 FALHA ALTO, e de propósito (aviso A5 da revisão). `SeedsDoCampeonato`
  // não expressa cardinalidade no tipo, então um chamador que passe menos de
  // `MAX_ETAPAS` seeds gravaria `versaoSala` com comprimento errado:
  // `estadoDasSeeds` classificaria `corrompida`, a casca recusaria TODA
  // conexão — e o `POST /criar-sala` já teria respondido 200 com o código. O
  // jogador receberia o código de uma sala que nunca aceita ninguém. Melhor
  // estourar no deploy do que parir sala morta em produção.
  if (seeds.etapas.length !== MAX_ETAPAS) {
    throw new Error(
      `criarSala: esperava ${MAX_ETAPAS} seeds de etapa, recebeu ${seeds.etapas.length}`,
    );
  }
  // 🔒 MESMA guarda, MESMO motivo, para `nEtapas` (aviso A4 da revisão do
  // 3.5.2). Ele entrava CRU ao lado da cardinalidade das seeds, e os dois casos
  // ruins não são simétricos:
  // - `nEtapas > seeds.etapas.length` nasce uma sala que o discriminante APROVA
  //   e que joga normalmente até a última seed existente, e só então pede uma
  //   etapa sem seed — falha tardia, no meio de um campeonato em andamento;
  // - `nEtapas < 1` deixa estado e leitura em desacordo (o campo diz 0,
  //   `nEtapasDaSala` devolve 1), que é a inconsistência de tese que a
  //   pendência 0(r) fechou para o cursor.
  if (!Number.isInteger(nEtapas) || nEtapas < 1 || nEtapas > seeds.etapas.length) {
    throw new Error(
      `criarSala: nEtapas deve ser inteiro em [1, ${seeds.etapas.length}], recebeu ${String(nEtapas)}`,
    );
  }
  return {
    salaId,
    seedMestre: seedMestre >>> 0,
    versaoSala: VERSAO_ESTADO_SALA,
    seedsEtapas: seeds.etapas,
    seedCalendario: seeds.calendario,
    etapaAtual: 0,
    nEtapas,
    dificuldade,
    fase: 'aberta',
    anfitriaoId: null,
    jogadores: [],
    roster: null,
    draft: null,
    tokens: {},
    // Nasce vazia: a carência é o que dá tempo de compartilhar o código.
    vazioDesde: agora,
    concluidaEm: null,
    corridaAbertaEm: null,
    atestaramFimDaCorrida: [],
    seq: 0,
  };
}

/**
 * O que as seeds desta sala são, das TRÊS coisas que elas podem ser.
 *
 * 🔒 **Substitui a leitura defensiva `sala.seedsEtapas ?? []`, e a diferença é
 * o PR inteiro.** O `??` colapsa duas situações que precisam ser distinguidas:
 * a sala que nunca teve seeds (criada antes do 3.5.1) e a sala que TINHA seeds
 * e as perdeu na reidratação. Tratar a segunda como a primeira significa
 * re-sortear as etapas em silêncio — o jogador correria uma corrida diferente
 * da que atestou, que é exatamente a quebra de determinismo silenciosa que o
 * requisito (a) do baseline existe pra impedir. Perda de segredo não pode
 * virar estado válido pela porta do conserto.
 *
 * `corrompida` **não tem caminho de cura aqui, de propósito**: quem sorteia é
 * `criar()` na casca, e ela só roda com o storage vazio. Sala corrompida é
 * recusada, nunca re-semeada.
 */
export type EstadoDasSeeds =
  /** Sala de antes do 3.5.1: nunca teve seeds. Não joga campeonato, e isso é correto. */
  | { tipo: 'legado' }
  | { tipo: 'ok'; etapas: number[]; calendario: number }
  /** Pós-3.5.1 com seeds inválidas: é ERRO, não default. */
  | { tipo: 'corrompida'; motivo: string };

/** Uint32 de verdade — descarta `NaN`, fração, negativo e o que veio de JSON torto. */
function ehUint32(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 0xffff_ffff;
}

/** O draft terminou? É o portão que libera calendário e seeds de etapa no fio. */
function draftConcluido(estado: EstadoSala): boolean {
  return estado.draft?.fase === 'concluido';
}

/**
 * As seeds de etapa que podem ir no fio agora: as ABERTAS, nunca as futuras.
 *
 * Com o cursor em `etapaAtual`, abertas são `0..etapaAtual`.
 * ⚠️ **A redação anterior dizia "no 3.5.1 o cursor não avança, então isto
 * devolve exatamente UM elemento" — verdade até o 3.5.1 e FALSA desde o
 * 3.5.2**, que é o PR onde a barreira passa a mover o cursor. Hoje isto devolve
 * `cursor + 1` elementos, crescendo etapa a etapa.
 * `corrompida` e `legado` devolvem `[]`: nenhuma das duas tem
 * seed legítima pra publicar, e inventar uma é o que o 3.5.1 proíbe.
 */
function seedsAbertasDe(estado: EstadoSala): number[] {
  if (!draftConcluido(estado)) return [];
  const seeds = estadoDasSeeds(estado);
  if (seeds.tipo !== 'ok') return [];
  return seeds.etapas.slice(0, cursorPublicavel(estado) + 1);
}

/**
 * O cursor como ele vai no fio: dentro de `[0, nEtapas - 1]`.
 *
 * Fonte ÚNICA do recorte — `seedsAbertasDe` e `publicarSala` usam esta mesma
 * função justamente para que não possam discordar. Duas contas paralelas do
 * mesmo número é a classe de bug do 8.4 em miniatura.
 *
 * 🔒 **O clamp FICA, mesmo com o cursor agora dentro do discriminante (3.5.2,
 * pendência 0(r)) — e as duas coisas não são redundantes, são camadas
 * diferentes.** O discriminante decide se a SALA é jogável (cursor fora de
 * forma ⇒ `corrompida` ⇒ a casca recusa todo mundo); o clamp garante que o
 * SNAPSHOT nunca se contradiz. Tirar o clamp confiando no discriminante
 * apostaria que nenhum caminho futuro publica uma sala não validada — aposta
 * que o aviso A1 da revisão do 3.5.1 já perdeu uma vez.
 */
function cursorPublicavel(estado: EstadoSala): number {
  const cursor = estado.etapaAtual;
  if (!Number.isInteger(cursor) || cursor < 0) return 0;
  return Math.min(cursor, nEtapasDaSala(estado) - 1);
}

/**
 * `nEtapas` está na forma que uma sala v2 exige? Inteiro em `[1, teto]`.
 *
 * O teto é o número de seeds de etapa que a sala tem — ver a chamada em
 * `estadoDasSeeds`. Sem ele, o campo lido do storage governa o teto de baldes
 * de atestado sem nenhum limite.
 */
function nEtapasIntegro(n: unknown, teto: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= teto;
}

/**
 * Quantas etapas esta sala tem — **fonte ÚNICA**, e é ela que substitui o
 * `N_ETAPAS_CURTA` que estava hardcodado em cinco sítios (barreira, clamp,
 * discriminante, teto do balde de atestados e o campo publicado).
 *
 * 🔒 **O default 1 vale SÓ para sala v1 (3.5.1), e essa restrição é o conserto
 * do bloqueante C1 da revisão.** Numa sala **v1** a ausência do campo é
 * legítima: o código do 3.5.1 marcava `concluidaEm` no primeiro fechamento de
 * barreira, o que é exatamente um campeonato de uma etapa. Numa sala **v2** a
 * mesma ausência é **corrupção**, e quem a recusa é `estadoDasSeeds` — ver
 * `VERSAO_ESTADO_SALA` para por que o bump era pré-requisito de conseguir
 * distinguir as duas.
 *
 * ⚠️ **O 1 devolvido no caso v2-corrompido é piso de segurança, não
 * comportamento pretendido.** Nenhum caminho de produção chega aqui com uma
 * sala v2 sem o campo — a casca recusa sala `corrompida` antes de jogar
 * qualquer comando —, mas esta função é chamada de sítios que não passam pelo
 * discriminante (`cursorPublicavel`, a barreira, o teto do balde), e devolver
 * `NaN` ou lançar quebraria a promessa de `aoReceber` de nunca lançar.
 * **Ela não decide a recusa; só se recusa a inventar um número grande.**
 */
export function nEtapasDaSala(estado: EstadoSala): number {
  // 🔒 O MESMO teto do discriminante, derivado da própria sala — duas contas
  // paralelas do mesmo limite é a classe de bug do 8.4 em miniatura.
  // `MAX_ETAPAS` só entra quando `seedsEtapas` está fora de forma, e aí a sala
  // já é `corrompida` por outra guarda: aqui o número só existe para não
  // inventar um grande.
  const teto = Array.isArray(estado.seedsEtapas) ? estado.seedsEtapas.length : MAX_ETAPAS;
  return nEtapasIntegro(estado.nEtapas, teto) ? estado.nEtapas : 1;
}

/**
 * O cursor está na forma que o campeonato exige? (pendência 0(r), fechada no
 * 3.5.2.)
 *
 * 🔑 **Por que ele entrou no discriminante exatamente neste PR:** até o 3.5.1
 * o cursor não se movia, então tratá-lo com `?? 0` era inconsistência de tese,
 * não vazamento. **É o cursor que governa quantos segredos saem no fio**
 * (`seedsAbertasDe` fatia por ele), e a partir daqui ele se move — então um
 * cursor fora de forma deixa de ser detalhe e vira a mesma classe de risco que
 * `seedsEtapas` corrompida: melhor recusar a sala do que servir um default
 * silencioso que abre seed que não devia abrir.
 */
function cursorIntegro(cursor: unknown, nEtapas: number): boolean {
  return typeof cursor === 'number' && Number.isInteger(cursor) && cursor >= 0 && cursor < nEtapas;
}

/** A seed do calendário, se e só se o draft concluiu e as seeds estão íntegras. */
function calendarioPublicavel(estado: EstadoSala): number | null {
  if (!draftConcluido(estado)) return null;
  const seeds = estadoDasSeeds(estado);
  return seeds.tipo === 'ok' ? seeds.calendario : null;
}

export function estadoDasSeeds(sala: EstadoSala): EstadoDasSeeds {
  if (sala.versaoSala === undefined) return { tipo: 'legado' };

  const { seedsEtapas, seedCalendario } = sala;
  if (!Array.isArray(seedsEtapas)) {
    return { tipo: 'corrompida', motivo: 'seedsEtapas ausente numa sala pós-3.5.1' };
  }
  if (seedsEtapas.length !== MAX_ETAPAS) {
    return {
      tipo: 'corrompida',
      motivo: `seedsEtapas tem ${seedsEtapas.length} slots, esperado ${MAX_ETAPAS}`,
    };
  }
  if (!seedsEtapas.every(ehUint32)) {
    return { tipo: 'corrompida', motivo: 'seedsEtapas tem slot que não é uint32' };
  }
  if (!ehUint32(seedCalendario)) {
    return { tipo: 'corrompida', motivo: 'seedCalendario ausente ou não é uint32' };
  }
  // 🔴 Bloqueante C1 da revisão do 3.5.2: `nEtapas` é campo do formato v2 e
  // entra no discriminante ANTES do cursor — é ele que define a faixa contra a
  // qual o cursor é medido, então validar o cursor primeiro seria medi-lo
  // contra um número que pode ser o default de emergência.
  //
  // 🔒 A guarda é `versaoSala >= 2` e não "campo ausente": numa sala v1 a
  // ausência é LEGÍTIMA (o 3.5.1 não tinha o campo, e a semântica dele era 1
  // etapa). Reprovar por ausência mataria toda sala em andamento no instante
  // do deploy, que é o oposto do que o discriminante existe para fazer.
  //
  // 🔒 **O TETO É PARTE DA GUARDA, não refinamento** (aviso 3 da segunda passada
  // da revisão). `criarSala` limita `nEtapas` a `[1, seeds.etapas.length]`, mas
  // o CAMINHO DE LEITURA não limitava nada: um `nEtapas: 999` persistido passava
  // no discriminante e `aoReceber` usava `nEtapasDaSala(sala) - 1` como teto de
  // `atestadoValido` ⇒ **999 baldes por escopo no estado do Durable Object**,
  // derrubando a propriedade que este mesmo PR declara em `EstadoServidor`
  // ("o teto do número de baldes é `escopos × nEtapas`"). Guarda de escrita sem
  // guarda de leitura não é teto — é convenção.
  // Custa zero aqui: `seedsEtapas.length === MAX_ETAPAS` já foi validado acima.
  if (sala.versaoSala >= 2 && !nEtapasIntegro(sala.nEtapas, seedsEtapas.length)) {
    return {
      tipo: 'corrompida',
      motivo: `nEtapas ausente ou fora de [1, ${seedsEtapas.length}] numa sala v${sala.versaoSala}: ${String(sala.nEtapas)}`,
    };
  }
  // 🔒 Pendência 0(r), fechada no 3.5.2: o CURSOR entra no discriminante junto
  // com as seeds. Ver `cursorIntegro` — é ele que decide quantos segredos saem
  // no fio, e a partir deste PR ele se move.
  const nEtapas = nEtapasDaSala(sala);
  if (!cursorIntegro(sala.etapaAtual, nEtapas)) {
    return {
      tipo: 'corrompida',
      motivo: `etapaAtual fora de [0, ${nEtapas - 1}]: ${String(sala.etapaAtual)}`,
    };
  }
  return { tipo: 'ok', etapas: seedsEtapas, calendario: seedCalendario };
}

/**
 * RELATÓRIO DE BUG DO OPERADOR — as seeds desta sala em texto colável.
 *
 * 🔒 **FERRAMENTA DE OPERADOR, NUNCA DO FIO.** Ela imprime segredos de
 * propósito: `seedsEtapas` inteiro, inclusive as etapas ainda não abertas.
 * Nada em `publicarSala` nem em `estadoPara` a chama, e a varredura de
 * `JSON.stringify` no snapshot (`campeonato-online.test.ts`) é o que garante
 * que a saída daqui não aparece no broadcast.
 *
 * 🔑 **Por que ela existe** (exigência do dev no 3.5.1): sob `B-indep` as
 * seeds são independentes, logo **não são reconstituíveis** a partir da
 * `seedMestre` — palavras dele, *"hoje um bug de corrida se reproduz com uma
 * seed; num campeonato `B-indep` preciso das 11."* Sem via de extração, um
 * despejo do Durable Object no meio do campeonato deixaria uma etapa
 * irreproduzível e o determinismo viraria promessa não verificável.
 *
 * **Como o operador chega até aqui:** as seeds vivem no estado PERSISTIDO do
 * Durable Object (chave `estado`), então extrair é ler o storage do DO e
 * passar `sala` para esta função. ⚠️ O comando exato de despejo do storage
 * depende do ambiente (local vs. deployado) e **fica a confirmar pelo dev na
 * máquina dele** — não invento aqui um comando que não rodei.
 *
 * Para reproduzir a etapa k, o consumidor faz o que o cliente faz:
 * `seedDaEtapa(etapas[k], calendarioSorteado(dataset, calendario, 'curta')[k])`.
 */
export function relatorioDeSeeds(sala: EstadoSala): string {
  const seeds = estadoDasSeeds(sala);
  // 🔒 `etapaAtual` sai CRU aqui, sem `?? 0` (pendência 0(r), 3.5.2). Isto é
  // relatório de BUG: mascarar um cursor corrompido com um zero plausível
  // esconderia justamente o que o operador precisa ver. Quem valida é
  // `estadoDasSeeds`, logo abaixo.
  const cabecalho = `sala=${sala.salaId} versaoSala=${sala.versaoSala ?? '(pré-3.5.1)'} etapaAtual=${String(sala.etapaAtual)}`;
  if (seeds.tipo === 'legado') return `${cabecalho}\nsem seeds: sala criada antes do 3.5.1`;
  if (seeds.tipo === 'corrompida') return `${cabecalho}\nSEEDS CORROMPIDAS: ${seeds.motivo}`;
  return [
    cabecalho,
    `seedCalendario=${seeds.calendario}`,
    ...seeds.etapas.map((seed, k) => `etapa[${k}]=${seed}`),
  ].join('\n');
}

/** Seed do draft desta partida — derivada, pra que a `seedMestre` não precise sair do DO. */
export function seedDoDraft(estado: EstadoSala): number {
  return deriveSeed(estado.seedMestre, ROTULO_SEED_DRAFT);
}

/**
 * O que vai no fio: tudo do estado menos os SEGREDOS (`seedMestre` e `tokens`),
 * com a seed do draft derivada no lugar.
 *
 * 🔒 Campo a campo DE PROPÓSITO, em vez de `{...resto}` com rest destructuring:
 * assim um segredo novo em `EstadoSala` não passa a vazar sozinho por ter sido
 * acrescentado. Isso não é hipotético — foi exatamente o que aconteceu no
 * 3.2.1, quando `tokens` entrou no estado: com spread, o token de cada jogador
 * teria ido no broadcast para os outros 21. O teste
 * "publicarSala preserva todo o resto do estado" pega o esquecimento inverso.
 */
export function publicarSala(estado: EstadoSala): EstadoSalaPublico {
  return {
    salaId: estado.salaId,
    seedDraft: seedDoDraft(estado),
    // Só publica quando o draft CONCLUI — antes disso seria vantagem
    // competitiva computável no console (ver docblock de `seedCorrida` em
    // `tipos.ts`, e a pista deriva dela em `pistaSorteada`).
    seedCorrida:
      estado.draft?.fase === 'concluido'
        ? deriveSeed(estado.seedMestre, ROTULO_SEED_CORRIDA)
        : null,
    // 🔒 CLAMPADO (aviso A1 da revisão). `seedsAbertasDe` satura em
    // `N_ETAPAS_CURTA`; publicar o cursor cru deixaria o snapshot
    // internamente inconsistente — `etapaAtual: 15` com `nEtapas: 5` e
    // 5 seeds abertas. No 3.5.2 o cliente indexaria `calendario[15]` e pegaria
    // `undefined`. A invariante publicada é
    // `seedsAbertas.length === min(etapaAtual + 1, nEtapas)` quando o portão
    // está aberto, e ela tem teste.
    etapaAtual: cursorPublicavel(estado),
    nEtapas: nEtapasDaSala(estado),
    // 🔒 As duas linhas abaixo têm o MESMO portão da `seedCorrida` acima, e o
    // mesmo motivo. Sob a pendência 0(i) a `seedMestre` é recomponível desde o
    // lobby; publicar calendário ou seed de etapa durante o draft deixaria
    // escolher peça sabendo as 5 pistas. E seed sem calendário não protegeria
    // nada sozinha: são 10 pistas no dataset, o jogador computa as 10 e
    // escolhe. `seedsAbertas` fica `[]` até o draft concluir.
    seedCalendario: calendarioPublicavel(estado),
    seedsAbertas: seedsAbertasDe(estado),
    dificuldade: estado.dificuldade,
    fase: estado.fase,
    anfitriaoId: estado.anfitriaoId,
    jogadores: estado.jogadores,
    roster: estado.roster,
    draft: estado.draft,
    seq: estado.seq,
    concluidaEm: estado.concluidaEm,
    corridaAbertaEm: estado.corridaAbertaEm,
    // `atestaramFimDaCorrida` NÃO vai no fio de propósito: é contabilidade
    // interna da barreira, não muda nada na tela, e publicá-la só daria a
    // cada cliente uma lista de quem já terminou — informação que ninguém
    // consome e que engordaria todo snapshot.
  };
}

/**
 * Monta os 22 jogadores da partida a partir dos humanos da sala: humanos
 * primeiro em ORDEM CANÔNICA DE ID, depois bots `bot-01..` até completar, e
 * `atribuirPerfis` por cima — exatamente a mesma composição do caminho
 * offline (`montarJogadores`, em `fluxo-draft.ts`). Um teste de conformidade
 * compara o resultado desta função com `iniciarDraft(...).jogadores`, então
 * as duas não podem divergir em silêncio.
 *
 * A ordenação explícita por id é defesa em profundidade: mesmo que o array de
 * `jogadores` chegue fora de ordem (round-trip de JSON, merge de estado, bug
 * futuro no redutor), o roster congelado é o mesmo — e com ele `ordemPeca`.
 */
export function congelarRoster(
  jogadores: JogadorSala[],
  seedDraft: number,
  dificuldade: Dificuldade,
): Jogador[] {
  const humanos = [...jogadores].sort(porId);
  const qtdBots = QTD_JOGADORES - humanos.length;
  const base: Jogador[] = [
    ...humanos.map((h): Jogador => ({ id: h.id, tipo: 'humano', nome: h.nome })),
    ...Array.from({ length: qtdBots }, (_, i) => ({
      id: `bot-${String(i + 1).padStart(2, '0')}`,
      tipo: 'bot' as const,
    })),
  ];
  return atribuirPerfis(base, seedDraft, dificuldade);
}

function recusar(estado: EstadoSala, erro: ErroSala): ResultadoSala {
  return { estado, erro };
}

/** Aceita um comando: aplica a mudança e avança `seq`. */
function aceitar(
  estado: EstadoSala,
  mudanca: Partial<EstadoSala>,
  jogadorId?: string,
): ResultadoSala {
  return { estado: { ...estado, ...mudanca, seq: estado.seq + 1 }, erro: null, jogadorId };
}

function entrar(
  estado: EstadoSala,
  nome: unknown,
  remetenteId: string | null,
  tokenNovo: string,
): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (typeof nome !== 'string') return recusar(estado, 'nome-invalido');
  if (remetenteId !== null && estado.jogadores.some((j) => j.id === remetenteId)) {
    return recusar(estado, 'ja-na-sala');
  }
  // Aparar DEPOIS do corte também: o `slice` pode ter deixado espaço no fim.
  const nomeAparado = nome.trim().slice(0, MAX_TAMANHO_NOME).trim();
  if (nomeAparado.length === 0) return recusar(estado, 'nome-invalido');
  if (estado.jogadores.length >= QTD_JOGADORES) return recusar(estado, 'sala-cheia');

  // Menor id livre: reusa a vaga de quem saiu, em vez de crescer pra sempre.
  const ocupados = new Set(estado.jogadores.map((j) => j.id));
  let indice = 1;
  while (ocupados.has(idHumano(indice))) indice += 1;
  const id = idHumano(indice);

  const jogadores = [...estado.jogadores, { id, nome: nomeAparado, pronto: false }].sort(porId);
  // Anfitrião é PEGAJOSO: quem entra nunca toma o posto de quem já está. Sem
  // isso, quem reusasse o `humano-01` de um anfitrião que saiu viraria
  // anfitrião ao entrar — e poderia iniciar a partida pelos outros.
  const anfitriaoId = estado.anfitriaoId ?? id;
  // O token nasce aqui e vai SÓ para quem entrou. É a prova de identidade que
  // permite voltar depois de cair — inclusive depois de um F5.
  const tokens = { ...estado.tokens, [id]: tokenNovo };
  return aceitar(estado, { jogadores, anfitriaoId, tokens }, id);
}

function sair(estado: EstadoSala, remetenteId: string | null): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (remetenteId === null || !estado.jogadores.some((j) => j.id === remetenteId)) {
    return recusar(estado, 'jogador-desconhecido');
  }
  const jogadores = estado.jogadores.filter((j) => j.id !== remetenteId);
  const anfitriaoId =
    estado.anfitriaoId === remetenteId ? (jogadores[0]?.id ?? null) : estado.anfitriaoId;
  // O TOKEN MORRE COM A SAIDA. Se sobrevivesse, o dono poderia reentrar como um
  // id que ja nao existe no roster -- e, como `entrar` reusa o MENOR id livre, o
  // proximo a entrar receberia exatamente esse id. Resultado medido pela
  // revisao: duas conexoes mandando comando pelo mesmo jogador, uma delas sem
  // nunca ter tido o token da outra.
  const tokens = { ...estado.tokens };
  delete tokens[remetenteId];
  return aceitar(estado, { jogadores, anfitriaoId, tokens });
}

function definirPronto(
  estado: EstadoSala,
  pronto: unknown,
  remetenteId: string | null,
): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (typeof pronto !== 'boolean') return recusar(estado, 'comando-invalido');
  if (remetenteId === null || !estado.jogadores.some((j) => j.id === remetenteId)) {
    return recusar(estado, 'jogador-desconhecido');
  }
  const jogadores = estado.jogadores.map((j) => (j.id === remetenteId ? { ...j, pronto } : j));
  return aceitar(estado, { jogadores });
}

function iniciar(estado: EstadoSala, remetenteId: string | null, agora: number): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (remetenteId === null || estado.anfitriaoId !== remetenteId) {
    return recusar(estado, 'nao-e-anfitriao');
  }
  if (estado.jogadores.length < MIN_HUMANOS) return recusar(estado, 'jogadores-insuficientes');
  if (!estado.jogadores.every((j) => j.pronto)) return recusar(estado, 'nem-todos-prontos');

  // Congelar o roster e abrir o draft são o MESMO evento: um roster congelado
  // sem turno aberto seria um estado em que ninguém pode jogar.
  const seedDraft = seedDoDraft(estado);
  const roster = congelarRoster(estado.jogadores, seedDraft, estado.dificuldade);
  return aceitar(estado, {
    fase: 'iniciada',
    roster,
    draft: criarDraftRede(roster, seedDraft, agora),
  });
}

/**
 * Qual jogador tem este token? `null` se nenhum.
 *
 * Comparação direta de string: o token tem 128 bits de `crypto.randomUUID` e
 * não é adivinhável por tentativa; blindagem contra ataque de tempo seria
 * teatro num jogo de navegador onde a latência de rede domina qualquer
 * diferença mensurável. Registrado como decisão, não como descuido.
 */
export function jogadorDoToken(estado: EstadoSala, token: unknown): string | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  // `?? {}`: o Durable Object devolve o objeto persistido CRU, sem migracao de
  // schema. Uma sala gravada antes do 3.2.1 nao tem `tokens`, e `Object.entries`
  // de `undefined` lanca -- quebrando a promessa de `aoReceber` de nunca lancar.
  for (const [jogadorId, t] of Object.entries(estado.tokens ?? {})) {
    if (t !== token) continue;
    // O token so vale enquanto o dono ESTA na sala. Ver o comentario em `sair`.
    return estado.jogadores.some((j) => j.id === jogadorId) ? jogadorId : null;
  }
  return null;
}

/**
 * Aplica um comando de DRAFT sobre o estado da sala.
 *
 * 🔑 Existe por causa do `seq`. `reduzirDraft` sozinho não sabe da sala, e os
 * comandos de draft não passam por `reduzirSala` — então, sem esta função, o
 * `draft` mudaria por baixo de um `seq` CONGELADO, e o cliente que descarta
 * broadcast atrasado por `seq` (que é a razão de o campo existir) jogaria fora
 * atualizações legítimas ou aceitaria as velhas. Aqui, todo comando aceito
 * avança o contador — lobby ou draft, uma regra só.
 */
export function reduzirDraftDaSala(
  estado: EstadoSala,
  comando: ComandoDraft,
  remetenteId: string | null,
  agora: number,
): ResultadoSalaOuDraft {
  if (estado.fase !== 'iniciada' || estado.draft === null) {
    return { estado, erro: 'sala-nao-iniciada' };
  }
  const r = reduzirDraft(estado.draft, comando, remetenteId, agora);
  if (r.erro !== null) return { estado, erro: r.erro };
  return { estado: { ...estado, draft: r.estado, seq: estado.seq + 1 }, erro: null };
}

/**
 * Expira o turno de um jogador. É ação do SERVIDOR (ver `expirarJogador`), então
 * não vem de `ComandoDraft` — mas passa pelo mesmo contador.
 */
export function expirarNaSala(
  estado: EstadoSala,
  jogadorId: string,
  agora: number,
): ResultadoSalaOuDraft {
  if (estado.fase !== 'iniciada' || estado.draft === null) {
    return { estado, erro: 'sala-nao-iniciada' };
  }
  const r = expirarJogador(estado.draft, jogadorId, agora);
  if (r.erro !== null) return { estado, erro: r.erro };
  return { estado: { ...estado, draft: r.estado, seq: estado.seq + 1 }, erro: null };
}

/**
 * Aplica um comando de lobby em nome de `remetenteId` — o id que o TRANSPORTE
 * associou à conexão, nunca um campo do fio. `null` = conexão que ainda não
 * entrou na sala (só `entrar` faz sentido aí).
 *
 * A guarda de fase é POR HANDLER, não global: os comandos do draft (3.1b) só
 * valem com a sala já iniciada, e uma guarda global obrigaria a reescrever este
 * ponto de entrada em vez de estendê-lo. Comandos de DRAFT não passam por aqui
 * — vão direto pra `reduzirDraft`, sobre `estado.draft`.
 *
 * `agora` (ms) é injetado, nunca lido de relógio: é ele que arma o cronômetro
 * de turno no `iniciar`. Parâmetro obrigatório de propósito — esquecê-lo faria
 * todo turno nascer expirado.
 */
export function reduzirSala(
  estado: EstadoSala,
  comando: ComandoSala,
  remetenteId: string | null,
  agora: number,
  tokenNovo = '',
): ResultadoSala {
  switch (comando?.tipo) {
    case 'entrar':
      return entrar(estado, comando.nome, remetenteId, tokenNovo);
    case 'sair':
      return sair(estado, remetenteId);
    case 'pronto':
      return definirPronto(estado, comando.pronto, remetenteId);
    case 'iniciar':
      return iniciar(estado, remetenteId, agora);
    case 'quem-sou':
    case 'sincronizar':
    case 'reentrar':
      // Comandos de RECUPERAÇÃO: não mudam o estado da sala, são resolvidos
      // pelo servidor (`servidor-sala.ts`), que é quem conhece as conexões.
      return recusar(estado, 'comando-invalido');
    default:
      // Alcançável em runtime: o cliente manda JSON não confiável, não TS.
      return recusar(estado, 'comando-invalido');
  }
}
