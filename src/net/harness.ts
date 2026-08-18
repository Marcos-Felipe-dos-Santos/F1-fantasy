/**
 * HARNESS HEADLESS — 22 clientes, sem navegador e sem amigos (PR 3.2).
 *
 * Pedido do dev nestes termos: *"preciso simular 22 clientes com injeção de
 * latência, reordenação, duplicação e desconexão, sem depender de amigos
 * disponíveis. Se ele não ficar utilizável, a fase inteira fica cega."* Então:
 * roda no `npm test`, é determinístico por seed, e não precisa de servidor no ar.
 *
 * 🔑 **A INJEÇÃO ACONTECE NOS DOIS SENTIDOS, com stream de RNG por conexão.**
 * Isto não é detalhe. Se as patologias só atingissem cliente→servidor, os 22
 * clientes veriam exatamente os mesmos broadcasts na mesma ordem e "os 22
 * chegaram ao mesmo `DraftState`" seria verdade **por construção** — um teste
 * que não pode falhar. A divergência só nasce onde os clientes DIFEREM: cada um
 * com a sua ordem de chegada, as suas perdas, e a sua conta local da escolha do
 * ausente.
 *
 * 🔒 Sem `Math.random`, sem `Date.now`: o relógio é um contador e o sorteio vem
 * de `deriveSeed`. Mesma seed ⇒ mesma sequência de patologias, sempre. Um bug
 * achado aqui é reproduzível pelo número da seed.
 *
 * Não simula o WebSocket literal — simula tudo o que ele faz de ruim. O socket
 * de verdade e o workerd ficam pro smoke manual (`scripts/smoke-online.mjs`).
 */

import { createRng, deriveSeed, type Rng } from '../engine/rng';
import type { Dataset } from '../engine/dataset';
import type { DraftState } from '../engine/types';
import {
  aoConectar,
  aoDesconectar,
  aoPassarOTempo,
  aoReceber,
  criarServidor,
  type Envio,
  type EstadoServidor,
} from './servidor-sala';
import { publicarSala } from './sala';
import {
  aplicarMensagem,
  criarCliente,
  escolhaDoAusente,
  escolhaPadrao,
  sincronizarDraft,
  type EscolherPeloAusente,
  type EstadoCliente,
} from './cliente';
import { VERSAO_PROTOCOLO, type ComandoDraft, type ComandoSala } from './protocolo';
import { RODADAS_SORTEIO } from '../engine/draft-utils';
import { MAX_ETAPAS } from './tipos';

/** Patologias injetadas. Cada campo é probabilidade por mensagem (0..1). */
export interface Patologias {
  /** Chance de a mensagem ser entregue com atraso — é o que reordena de fato. */
  atraso: number;
  /** Chance de a mensagem ser entregue DUAS vezes. */
  duplicacao: number;
  /** Chance de a mensagem ser perdida. */
  perda: number;
  /** Chance de uma conexão cair, por passo do laço. */
  desconexao: number;
  /** Chance de um caído voltar, por passo — apresentando o token (PR 3.2.1). */
  reconexao?: number;
}

export const SEM_PATOLOGIA: Patologias = { atraso: 0, duplicacao: 0, perda: 0, desconexao: 0 };

/**
 * Prazo do turno DENTRO do harness, em passos do laço. Folgado o bastante para
 * que a partida ande quando um snapshot se perde, apertado o bastante para não
 * travar o teste. Ver `pecasPorHumano`/`pecasPorAusencia`: se este número for
 * curto demais, a maioria dos turnos passa a ser resolvida por expiração e o
 * teste vira decoração.
 */
const PRAZO_HARNESS_PASSOS = 120;

/** Passos sem snapshot novo antes de o cliente re-pedir o estado. */
const PASSOS_ATE_RESSINCRONIZAR = 4;

/**
 * Quantas vezes cada patologia REALMENTE aconteceu.
 *
 * Existe porque "configurei duplicação" não é o mesmo que "houve duplicação":
 * uma execução em que o sorteio não duplicou nada passaria verde sem testar
 * nada. O teste assere que cada contador é > 0 — é isso que dá sentido ao
 * "os 22 chegaram ao mesmo estado".
 */
export interface Contadores {
  entregues: number;
  atrasadas: number;
  duplicadas: number;
  perdidas: number;
  desconexoes: number;
  /** Recusas do servidor por código. `turno-divergente` prova a idempotência. */
  recusas: Record<string, number>;
  /** Snapshots que os clientes jogaram fora por `seq` atrasado/repetido. */
  descartadosPorSeq: number;
  comandosEnviados: number;
  /** Quantos caídos voltaram apresentando o token (PR 3.2.1). */
  reconexoes: number;
  /** Tentativas de reentrada recusadas por token inválido. */
  tokensRecusados: number;
  /**
   * Escolhas de peça feitas por um HUMANO de verdade, e escolhas que a rede teve
   * de cobrir porque o jogador virou ausente.
   *
   * Achado da revisão, e o contador mais importante daqui: com rede ruim, 6 a 12
   * dos 22 turnos de peça estavam sendo resolvidos por expiração, não por
   * jogador. "Os 22 concordam" continuava verdadeiro e quase oco — uma regressão
   * em que TODOS os turnos expirassem passaria verde. O teste assere um piso.
   */
  pecasPorHumano: number;
  pecasPorAusencia: number;
}

interface EmTransito {
  destino: string;
  mensagem: import('./protocolo').MensagemServidor;
  entregarEm: number;
  ordem: number;
}

interface Participante {
  conexaoId: string;
  cliente: EstadoCliente;
  rng: Rng;
  conectado: boolean;
  /** Último passo em que este cliente aceitou um snapshot — base do re-pedido. */
  ultimoSnapshotEm?: number;
  /** Quantas vezes já voltou; entra no `conexaoId` para que cada volta seja socket novo. */
  reconexoes?: number;
}

export interface ResultadoHarness {
  contadores: Contadores;
  /** `DraftState` reconstruído por cada cliente, por jogadorId. */
  draftsPorJogador: Map<string, DraftState>;
  servidor: EstadoServidor;
  clientes: Map<string, EstadoCliente>;
  /** Conexões que caíram e nunca voltaram — ficam de fora da comparação final. */
  desconectados: Set<string>;
  passos: number;
}

export interface OpcoesHarness {
  seed: number;
  qtdClientes: number;
  dataset: Dataset;
  patologias?: Patologias;
  /**
   * Defeito injetado de propósito, pra provar que o harness DETECTA divergência
   * em vez de só afirmar convergência. Sem controle negativo, um harness verde
   * não distingue "convergiu" de "não sabe olhar".
   */
  sabotagem?: 'escolha-do-ausente-divergente';
  /**
   * Um cliente manda escolhas ILEGAIS na própria vez — payload com forma
   * válida mas conteúdo que a engine rejeita (`pilotoId` inexistente). Passa
   * por todas as guardas do servidor, que não tem dataset para julgar. Serve
   * para provar que isso NÃO mata a sala.
   */
  clienteHostil?: string;
  /** Conexão sabotada (default: a segunda). */
  conexaoSabotada?: string;
  /**
   * Em que passo DO DRAFT um jogador abandona (1 = primeiro passo do laço do
   * draft). Contado a partir do início do draft, e não do relógio global, que
   * já avançou durante o lobby — a primeira versão usava o relógio global e o
   * abandono simplesmente nunca disparava.
   */
  abandonarNoPasso?: number;
  maxPassos?: number;
}

export function rodarHarness(opcoes: OpcoesHarness): ResultadoHarness {
  const { seed, qtdClientes, dataset } = opcoes;
  const patologias = opcoes.patologias ?? SEM_PATOLOGIA;
  const maxPassos = opcoes.maxPassos ?? 3000;

  const contadores: Contadores = {
    entregues: 0,
    atrasadas: 0,
    duplicadas: 0,
    perdidas: 0,
    desconexoes: 0,
    recusas: {},
    descartadosPorSeq: 0,
    comandosEnviados: 0,
    pecasPorHumano: 0,
    pecasPorAusencia: 0,
    reconexoes: 0,
    tokensRecusados: 0,
  };

  // As seeds do campeonato (3.5.1). O harness é determinístico por `seed`, e
  // sortear aqui quebraria isso — então elas são DERIVADAS, ao contrário da
  // produção, onde são sorteadas (`party/sala.ts`). Isso não afrouxa o
  // `B-indep`: este é o harness de rede, que não joga campeonato nenhum.
  //
  // 🔒 Quem prova que a PRODUÇÃO sorteia em vez de derivar é a cerca textual
  // sobre `party/sala.ts`, em `campeonato-online.test.ts` §"CERCA DO SÍTIO QUE
  // REALMENTE SORTEIA". A versão anterior deste comentário apontava para o
  // arquivo de teste inteiro e era FALSA: os testes de `B-indep` de lá rodam
  // sobre uma fixture literal passada a `criarSala`, e as mutações M5/M6
  // aplicadas na casca deixavam a suíte inteira verde (medido: 1509/63).
  // Bloqueante da revisão — o comentário afirmava cobertura que não existia.
  const seedsHarness = {
    etapas: Array.from({ length: MAX_ETAPAS }, (_, k) =>
      deriveSeed(seed, `online:harness:etapa:${k}`),
    ),
    calendario: deriveSeed(seed, 'online:harness:calendario'),
  };
  let servidor = criarServidor('sala-harness', seed, 'dificil', 0, seedsHarness);
  const participantes = new Map<string, Participante>();
  const emTransito: EmTransito[] = [];
  let ordem = 0;
  let passo = 0; // relógio simulado: contador, nunca `Date.now`

  const rngRede = createRng(deriveSeed(seed, 'online:harness:rede'));

  function despachar(envios: Envio[], garantido = false): void {
    for (const envio of envios) {
      const destinos =
        envio.para === null
          ? [...participantes.values()].filter((p) => p.conectado).map((p) => p.conexaoId)
          : [envio.para];

      for (const destino of destinos) {
        const p = participantes.get(destino);
        if (p === undefined || !p.conectado) continue;

        // Stream PRÓPRIO por conexão: é o que faz dois clientes verem
        // históricos diferentes, e portanto o que os deixa poder divergir.
        if (!garantido && p.rng.next() < patologias.perda) {
          contadores.perdidas += 1;
          continue;
        }
        const atrasa = !garantido && p.rng.next() < patologias.atraso;
        if (atrasa) contadores.atrasadas += 1;
        emTransito.push({
          destino,
          mensagem: envio.mensagem,
          entregarEm: passo + (atrasa ? 1 + Math.floor(p.rng.next() * 3) : 0),
          ordem: (ordem += 1),
        });

        if (!garantido && p.rng.next() < patologias.duplicacao) {
          contadores.duplicadas += 1;
          emTransito.push({
            destino,
            mensagem: envio.mensagem,
            entregarEm: passo + Math.floor(p.rng.next() * 3),
            ordem: (ordem += 1),
          });
        }
      }
    }
  }

  function entregar(): void {
    const prontas: EmTransito[] = [];
    for (let i = emTransito.length - 1; i >= 0; i -= 1) {
      if (emTransito[i].entregarEm <= passo) prontas.push(...emTransito.splice(i, 1));
    }
    if (prontas.length === 0) return;
    // Empate pela ordem de emissão; o atraso é o que embaralha de verdade.
    prontas.sort((a, b) => a.entregarEm - b.entregarEm || a.ordem - b.ordem);
    for (const m of prontas) {
      const p = participantes.get(m.destino);
      if (p === undefined || !p.conectado) continue;
      const antes = p.cliente.descartados;
      const seqAntes = p.cliente.seqVisto;
      p.cliente = aplicarMensagem(p.cliente, m.mensagem);
      contadores.entregues += 1;
      if (p.cliente.descartados > antes) contadores.descartadosPorSeq += 1;
      if (p.cliente.seqVisto > seqAntes) p.ultimoSnapshotEm = passo;
      if (m.mensagem.tipo === 'erro') {
        contadores.recusas[m.mensagem.erro] = (contadores.recusas[m.mensagem.erro] ?? 0) + 1;
      }
    }
  }

  /**
   * Token determinístico — o harness não pode usar `crypto.randomUUID` sem
   * perder a reprodutibilidade por seed. Em produção quem gera é a casca, com
   * 128 bits de verdade; aqui só precisa ser único e estável.
   */
  let proximoToken = 0;
  function enviar(conexaoId: string, comando: ComandoSala | ComandoDraft): void {
    contadores.comandosEnviados += 1;
    const faseAntes = servidor.sala.draft?.fase;
    const logAntes = servidor.sala.draft?.log.length ?? 0;
    proximoToken += 1;
    const r = aoReceber(
      servidor,
      conexaoId,
      JSON.stringify(comando),
      passo,
      `token-${seed}-${proximoToken}`,
    );
    servidor = r.estado;
    // Um turno de peça de fato jogado por gente: o log cresceu na fase peça.
    if (
      faseAntes === 'peca' &&
      comando.tipo === 'escolher' &&
      (servidor.sala.draft?.log.length ?? 0) > logAntes
    ) {
      contadores.pecasPorHumano += 1;
    }
    despachar(r.envios);
  }

  // --- 1. Conectam e entram -------------------------------------------------
  for (let i = 0; i < qtdClientes; i += 1) {
    const conexaoId = `conexao-${String(i + 1).padStart(2, '0')}`;
    participantes.set(conexaoId, {
      conexaoId,
      cliente: criarCliente(),
      rng: createRng(deriveSeed(seed, `online:harness:conexao:${conexaoId}`)),
      conectado: true,
      ultimoSnapshotEm: 0,
    });
    const r = aoConectar(servidor, conexaoId);
    servidor = r.estado;
    despachar(r.envios);
    enviar(conexaoId, { tipo: 'entrar', nome: `Jogador ${i + 1}` });
  }
  passo += 5;
  entregar();

  // --- 2. Prontos, e o anfitrião inicia ------------------------------------
  for (const p of participantes.values()) enviar(p.conexaoId, { tipo: 'pronto', pronto: true });
  enviar([...participantes.values()][0].conexaoId, { tipo: 'iniciar' });
  passo += 5;
  entregar();

  // --- 3. O draft -----------------------------------------------------------
  let passoDoDraft = 0;
  while (servidor.sala.draft !== null && servidor.sala.draft.fase !== 'concluido') {
    passo += 1;
    passoDoDraft += 1;
    if (passo > maxPassos) throw new Error(`harness: não concluiu em ${maxPassos} passos`);
    entregar();

    if (opcoes.abandonarNoPasso === passoDoDraft) {
      const vitima = [...participantes.values()].find(
        (p) => p.conectado && p.cliente.euSou !== null,
      );
      if (vitima !== undefined) enviar(vitima.conexaoId, { tipo: 'abandonar' });
    }

    // Quem caiu tenta VOLTAR, apresentando o token. É a razão de ser do 3.2.1:
    // sem isso, quem cai fica preso no roster ocupando turno sem ter por onde
    // jogar, até o cronômetro o expulsar.
    for (const p of participantes.values()) {
      if (p.conectado || p.cliente.token === null) continue;
      if (rngRede.next() >= (patologias.reconexao ?? 0)) continue;
      // 🔑 A volta usa um `conexaoId` NOVO — socket novo é conexão nova. A
      // primeira versão reusava o mesmo id, e como `aoDesconectar` já tinha
      // apagado aquela chave, o laço de evicção nunca tinha o que evictar: o
      // teste passava sem exercitar nada (achado da revisão). Com id novo, um
      // mapeamento duplicado apareceria no `conexoesPorJogador` abaixo.
      p.reconexoes = (p.reconexoes ?? 0) + 1;
      const idAntigo = p.conexaoId;
      p.conexaoId = `${idAntigo}-r${p.reconexoes}`;
      participantes.delete(idAntigo);
      participantes.set(p.conexaoId, p);
      p.conectado = true;
      const rc = aoConectar(servidor, p.conexaoId);
      servidor = rc.estado;
      despachar(rc.envios);
      enviar(p.conexaoId, { tipo: 'reentrar', token: p.cliente.token });
      if (servidor.jogadorPorConexao[p.conexaoId] !== undefined) {
        contadores.reconexoes += 1;
      } else {
        contadores.tokensRecusados += 1;
      }
    }

    for (const p of participantes.values()) {
      if (!p.conectado) continue;
      if (rngRede.next() < patologias.desconexao) {
        contadores.desconexoes += 1;
        p.conectado = false;
        const r = aoDesconectar(servidor, p.conexaoId, passo);
        servidor = r.estado;
        despachar(r.envios);
      }
    }

    // Quem perdeu o `voce-e` pergunta de novo — sem isso, um cliente azarado
    // fica mudo o resto da partida.
    for (const p of participantes.values()) {
      if (p.conectado && p.cliente.euSou === null) enviar(p.conexaoId, { tipo: 'quem-sou' });
    }

    // E quem está sem novidade há um tempo re-pede o estado. É o comportamento
    // que a UI real terá: sem isso, um snapshot perdido custa o turno inteiro
    // do jogador, que só destrava quando o cronômetro o expira.
    for (const p of participantes.values()) {
      if (!p.conectado) continue;
      if (passo - (p.ultimoSnapshotEm ?? 0) >= PASSOS_ATE_RESSINCRONIZAR) {
        p.ultimoSnapshotEm = passo;
        enviar(p.conexaoId, { tipo: 'sincronizar' });
      }
    }

    for (const p of participantes.values()) {
      if (!p.conectado || p.cliente.euSou === null) continue;
      p.cliente = sincronizarDraft(p.cliente, dataset, escolhaAusenteDe(p, opcoes));
      const comando = comandoDoCliente(p, dataset, opcoes);
      if (comando !== null) enviar(p.conexaoId, comando);
    }

    // Tique do relógio do servidor. Prazo folgado: o teste de timeout é o
    // `draft-rede.test.ts`; aqui ele só impede sala parada por desconexão.
    const ausentesAntes = servidor.sala.draft?.ausentes.length ?? 0;
    const naFasePeca = servidor.sala.draft?.fase === 'peca';
    const r = aoPassarOTempo(servidor, passo, PRAZO_HARNESS_PASSOS);
    servidor = r.estado;
    const novosAusentes = (servidor.sala.draft?.ausentes.length ?? 0) - ausentesAntes;
    if (naFasePeca && novosAusentes > 0) contadores.pecasPorAusencia += novosAusentes;
    despachar(r.envios);
  }

  // --- 4. Drenagem: todo mundo recebe o snapshot final ---------------------
  passo += 10;
  entregar();
  // Drenagem GARANTIDA: sem patologia. Na vida real isso é o retry/reconexão
  // do cliente; aqui o ponto é comparar estados finais, não medir a perda de
  // novo — quem nunca recebesse o último snapshot ficaria para trás por um
  // motivo que o teste não está investigando.
  despachar(
    [
      {
        para: null,
        mensagem: {
          tipo: 'estado',
          versaoProtocolo: VERSAO_PROTOCOLO,
          estado: publicarSala(servidor.sala),
        },
      },
    ],
    true,
  );
  for (const p of participantes.values()) {
    if (p.conectado && p.cliente.euSou === null) {
      const r = aoReceber(servidor, p.conexaoId, JSON.stringify({ tipo: 'quem-sou' }), passo);
      servidor = r.estado;
      despachar(r.envios, true);
    }
  }
  passo += 10;
  entregar();

  const draftsPorJogador = new Map<string, DraftState>();
  const clientes = new Map<string, EstadoCliente>();
  const desconectados = new Set<string>();
  for (const p of participantes.values()) {
    p.cliente = sincronizarDraft(p.cliente, dataset, escolhaAusenteDe(p, opcoes));
    clientes.set(p.conexaoId, p.cliente);
    if (!p.conectado) {
      desconectados.add(p.conexaoId);
      continue;
    }
    if (p.cliente.euSou !== null && p.cliente.draft !== null) {
      draftsPorJogador.set(p.cliente.euSou, p.cliente.draft);
    }
  }

  return { contadores, draftsPorJogador, servidor, clientes, desconectados, passos: passo };
}

/** O comando que este cliente mandaria agora, decidido pela visão DELE. */
function comandoDoCliente(
  p: Participante,
  dataset: Dataset,
  opcoes: OpcoesHarness,
): ComandoDraft | null {
  const sala = p.cliente.sala;
  const jogadorId = p.cliente.euSou;
  const draftLocal = p.cliente.draft;
  if (sala?.draft == null || jogadorId === null || draftLocal === null) return null;
  const visto = sala.draft;

  if (visto.ausentes.includes(jogadorId)) return null;
  const podeJogar =
    visto.fase === 'sorteios'
      ? visto.rodada[jogadorId] <= RODADAS_SORTEIO
      : visto.ordemPeca[visto.indicePeca] === jogadorId;
  if (!podeJogar) return null;
  if (draftLocal.fase === 'concluido') return null;

  let escolha = escolhaPadrao(draftLocal, dataset, jogadorId);
  if (escolha === null) return null;
  if (opcoes.clienteHostil === p.conexaoId) {
    // Forma impecável, conteúdo impossível: exatamente o que o servidor não
    // consegue barrar e o que bricava a sala antes do `try` no cliente.
    escolha = { tipo: 'piloto', pilotoId: 'piloto-que-nao-existe' };
  }

  // A coordenada vem da visão do CLIENTE, que pode estar atrasada — e é
  // exatamente por isso que `turnoEsperado` existe: comando montado sobre visão
  // velha é recusado em vez de virar jogada fantasma.
  const turnoEsperado =
    visto.fase === 'sorteios' ? visto.rodada[jogadorId] : visto.indicePeca;
  return { tipo: 'escolher', escolha, turnoEsperado };
}

/**
 * A função que ESTE cliente usa para escolher no lugar de um ausente.
 *
 * 🔴 É AQUI que o controle negativo tem de morar, e a primeira versão errou o
 * alvo: sabotar a escolha PRÓPRIA do cliente não diverge nada, porque essa
 * escolha vai para o log e o log é a fonte da verdade dos 22. A única decisão
 * que cada cliente toma **sozinho, sem passar pela rede**, é a substituição do
 * ausente — exatamente o RISCO ATIVO registrado no `ESTADO.md`. Medido: com a
 * sabotagem no lugar errado, os 22 continuavam idênticos.
 */
function escolhaAusenteDe(p: Participante, opcoes: OpcoesHarness): EscolherPeloAusente {
  const alvo = opcoes.conexaoSabotada ?? 'conexao-02';
  if (opcoes.sabotagem !== 'escolha-do-ausente-divergente' || p.conexaoId !== alvo) {
    return escolhaDoAusente;
  }
  return (state, dataset, jogadorId) => {
    const canonica = escolhaDoAusente(state, dataset, jogadorId);
    // Na fase peça, pega OUTRA peça revelada — é o furo do pool acontecendo.
    if (state.fase === 'peca' && state.pecasReveladas !== null) {
      const outra = state.pecasReveladas.find(
        (id) => canonica.tipo === 'peca' && id !== canonica.pecaId,
      );
      if (outra !== undefined) return { tipo: 'peca', pecaId: outra };
    }
    return canonica;
  };
}
