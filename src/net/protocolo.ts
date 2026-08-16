/**
 * Protocolo da sala (Fase 3). PR 3.1a — só os comandos de lobby.
 *
 * Só TIPOS e constantes: nenhuma função, nenhum I/O. O transporte (3.2) e os
 * comandos de turno do draft (3.1b) entram depois, sem quebrar o que está
 * aqui — `ComandoSala` e `MensagemServidor` são uniões discriminadas, então
 * crescer é aditivo.
 *
 * 🔒 NENHUM COMANDO CARREGA `jogadorId`. Quem é o remetente é decidido pelo
 * TRANSPORTE, a partir da conexão, e injetado em `reduzirSala(estado, comando,
 * remetenteId)`. Se o id viesse no fio, qualquer cliente mandaria
 * `{tipo:'sair'}` em nome de outro, ou iniciaria a partida se passando pelo
 * anfitrião — e o token de turno do 3.1b nasceria sobre um remetente forjável.
 */

import type { EstadoSalaPublico } from './tipos';

/**
 * Versão do protocolo. O handshake de versão do PR 3.4 compara este número
 * entre cliente e servidor — a defesa contra divergência de engine é o
 * handshake, não um detector a posteriori (decisão registrada no ESTADO).
 */
export const VERSAO_PROTOCOLO = 1;

/** Comprimento máximo do nome de exibição aceito pela sala. */
export const MAX_TAMANHO_NOME = 20;

/** Comandos que o cliente manda pro servidor. Nenhum diz de quem é: ver o cabeçalho. */
export type ComandoSala =
  /**
   * `versaoApp` é o HANDSHAKE do PR 3.4, e é **opcional no tipo de propósito**:
   * um cliente velho, que não a manda, não pode ser silenciosamente aceito —
   * quem decide o que fazer com a ausência é `reduzirSala`, não o tipo. Ver
   * `VERSAO_APP` em `src/engine/versao.ts` pro que ela representa.
   */
  | { tipo: 'entrar'; nome: string; versaoApp?: string }
  /**
   * "Quem sou eu nesta sala?" — recuperação, não cortesia. O `voce-e` é
   * direcionado e enviado UMA vez; se ele se perde, o cliente fica sem saber a
   * própria identidade e não consegue mais jogar, para sempre. Medido no
   * harness: com 15% de perda, isso acontecia com 3 ou 4 dos 22 em toda
   * execução. É idempotente e não altera estado.
   */
  | { tipo: 'quem-sou' }
  /**
   * "Me manda o estado de novo." Recuperação, como o `quem-sou`.
   *
   * O servidor só difunde quando ACEITA um comando. Se o snapshot que anuncia
   * "chegou a sua vez" se perde, o jogador não sabe que é a vez dele, não joga,
   * e a sala inteira espera até o cronômetro expirá-lo. Medido no harness antes
   * deste comando existir: com 15% de perda, **6 a 12 dos 22 turnos de peça
   * eram resolvidos por expiração em vez de por gente**. É idempotente e não
   * altera estado.
   */
  | { tipo: 'sincronizar' }
  /**
   * "Sou eu de novo, aqui está meu token." Reassocia esta conexão ao jogador
   * que recebeu o token no `entrar` — e é o ÚNICO comando de lobby que funciona
   * com a sala já iniciada.
   *
   * Resolve duas coisas de uma vez, que era a razão de fazê-lo antes do 3.3:
   * (1) quem cai deixa de ficar preso no roster ocupando turno sem ter por onde
   * jogar; (2) o token é a prova de identidade que faltava — o `entrar` alocava
   * um id e nada impedia que outra conexão reivindicasse aquele jogador.
   *
   * ⚠️ Em navegador, a "reconexão" comum não é queda de socket: é **F5**. Por
   * isso o token tem que sobreviver ao recarregamento — o cliente o guarda, e
   * nada na forma dele supõe que viva só na memória de um socket.
   */
  /**
   * `versaoApp` é obrigatória aqui pelo mesmo motivo do `entrar` — e este é o
   * caminho que MAIS importa na prática: entra-se uma vez, mas reconecta-se a
   * cada F5. Um deploy no meio da partida troca a engine debaixo do jogador, e
   * sem esta checagem ele voltaria com build novo numa sala de build velho.
   */
  | { tipo: 'reentrar'; token: string; versaoApp?: string }
  | { tipo: 'sair' }
  | { tipo: 'pronto'; pronto: boolean }
  | { tipo: 'iniciar' }
  /**
   * "Esta é a minha impressão digital do estado" (PR 3.4) — o detector de
   * divergência.
   *
   * 🔒 **O servidor NÃO sabe o que este hash significa, e não pode saber**: ele
   * não tem o dataset (fronteira travada no 3.2). Ele compara STRINGS OPACAS de
   * jogadores diferentes na MESMA âncora e alarma quando não batem. Todo o
   * significado mora em `hash-draft.ts`, no cliente.
   *
   * `escopo` existe para que a corrida online entre depois **sem mudar o
   * protocolo**: `escopo: 'corrida'` com o mesmo comparador (PR 2/4 de
   * "corrida online" — `hashDaCorrida` em `src/net/hash-corrida.ts`). Um
   * comando `hash-draft` separado teria que ser alargado a cada escopo novo.
   *
   * `ancora` é `eventosAplicados` do cliente — quantos eventos do log ele já
   * aplicou. É o que torna a comparação justa: dois clientes CORRETOS em pontos
   * diferentes do log têm hashes diferentes, e comparar isso seria alarme falso.
   * `seq` não serviria — ele avança também com evento de lobby.
   */
  | { tipo: 'hash'; escopo: EscopoHash; ancora: number; hash: string }
  /**
   * 🏁 "Terminei a corrida" (PR 3/4 de "corrida online") — alimenta a BARREIRA
   * DO FIM. Não carrega nada: quem mandou vem do transporte, como todo comando
   * desde o 3.1a, e QUANDO é o `agora` injetado no servidor.
   *
   * 🔑 **É barreira de FIM, nunca de LARGADA.** Nenhum cliente espera pelos
   * atestados alheios para ver a corrida — a `seedCorrida` já vai no snapshot
   * assim que o draft conclui. O que a sala faz com estes atestados é decidir
   * QUANDO considerar a partida encerrada, para só então armar a janela de
   * graça. Quem nunca atesta é resolvido pelo `TIMEOUT_FIM_DE_CORRIDA_MS`, sem
   * prender ninguém.
   *
   * Idempotente: reatestar não muda estado nem gera escrita no Durable Object.
   */
  | { tipo: 'corrida-concluida' };

/**
 * O que está sendo atestado. `draft` é o RISCO ATIVO que o 3.4 fechou (o pool
 * de peças do draft); `corrida` entra no PR 2/4 de "corrida online" — mesma
 * ideia, sobre `CorridaPreparada` em vez de `DraftState` (ver
 * `src/net/hash-corrida.ts`).
 */
export type EscopoHash = 'draft' | 'corrida';

/**
 * Comandos do draft (PR 3.1b). Como os de lobby, nenhum diz de quem é.
 *
 * `escolha` é `unknown` DE PROPÓSITO: o servidor não carrega o dataset, então
 * não tem como validar o conteúdo — ele decide de quem é a vez e repassa o
 * payload aos clientes, que validam com a engine. Não há `expirar` aqui: quem
 * expira turno é o SERVIDOR (`expirarJogador`), nunca um cliente.
 */
export type ComandoDraft =
  | {
      tipo: 'escolher';
      escolha: unknown;
      /**
       * 🔑 COORDENADA DE TURNO — o que torna o comando IDEMPOTENTE.
       *
       * Na fase sorteios é a rodada do próprio jogador (1..5); na fase peça é o
       * `indicePeca` esperado. O redutor compara com o valor corrente e recusa
       * se divergir. Sem isso, uma mensagem DUPLICADA pela rede é aceita como
       * segunda jogada — na fase peça, `indicePeca` andaria duas casas e alguém
       * perderia a vez. O harness do 3.2 injeta duplicação e reordenação por
       * planejamento, e o 3.4 congela o protocolo: é uma linha agora e uma
       * mudança de protocolo versionado depois.
       */
      turnoEsperado: number;
    }
  | { tipo: 'abandonar' };

/** Recusas do redutor de draft. Como no lobby, toda recusa deixa o estado INTOCADO. */
export type ErroDraft =
  | 'nao-e-sua-vez'
  | 'draft-concluido'
  | 'jogador-desconhecido'
  | 'jogador-ausente'
  | 'turno-divergente'
  | 'escolha-grande-demais'
  | 'comando-invalido';

/** Recusas possíveis do redutor. Toda recusa deixa o estado INTOCADO. */
export type ErroSala =
  | 'sala-cheia'
  | 'sala-iniciada'
  | 'jogador-desconhecido'
  | 'ja-na-sala'
  | 'nao-e-anfitriao'
  | 'jogadores-insuficientes'
  | 'nem-todos-prontos'
  | 'nome-invalido'
  | 'sala-nao-iniciada'
  | 'sala-inexistente'
  | 'token-invalido'
  /**
   * Handshake do 3.4: este cliente roda uma versão de engine/dataset diferente
   * da sala. **Recusa a ENTRADA, não avisa depois** — dois builds diferentes
   * produzem loadouts diferentes do mesmo log, e deixar entrar seria criar a
   * divergência que o detector então acusaria. Barato prevenir, caro detectar.
   */
  | 'versao-divergente'
  /**
   * `corrida-concluida` chegou antes de existir corrida (PR 3/4). Cliente
   * legítimo nunca manda isso — só chega a atestar quem já viu `seedCorrida`
   * no snapshot, e ela só sai com o draft concluído. Recusar em vez de
   * ignorar impede que um atestado precoce entre na contagem da barreira e
   * feche a sala dos outros mais cedo.
   */
  | 'corrida-nao-comecou'
  | 'comando-invalido';

/**
 * Mensagens que o servidor manda pro cliente.
 *
 * 🔒 `estado` é `EstadoSalaPublico`, NÃO `EstadoSala`: a `seedMestre` do
 * campeonato nunca sai do Durable Object (decisão (b) da Fase 3 — com a seed
 * base na mão, qualquer jogador computa as corridas futuras no console).
 */
export type MensagemServidor =
  | { tipo: 'estado'; versaoProtocolo: number; estado: EstadoSalaPublico }
  /**
   * Quem você é — e, no `entrar`, o token para voltar. O token vai **só para
   * esta conexão**, nunca em broadcast.
   */
  | { tipo: 'voce-e'; jogadorId: string; token?: string }
  | { tipo: 'erro'; erro: ErroSala | ErroDraft }
  /**
   * 🔴 **O ALARME** (PR 3.4). Dois ou mais jogadores atestaram hashes
   * diferentes na mesma âncora: as máquinas deixaram de jogar o mesmo jogo.
   *
   * Vai em BROADCAST porque o problema não é de quem divergiu — é da partida.
   * Quem está certo e quem está errado o servidor não tem como saber (ele não
   * tem o dataset); `jogadores` lista quem atestou algo diferente da primeira
   * versão vista, que é uma pista, não um veredito.
   *
   * Sai UMA vez por âncora: sem isso, cada atestado seguinte redisparia o
   * alarme e a tela viraria enxurrada.
   */
  | { tipo: 'divergencia'; escopo: EscopoHash; ancora: number; jogadores: string[] }
  /**
   * A sala acabou de ser encerrada e o estado foi descartado. Vem antes de o
   * servidor fechar as conexões, pra que a tela diga o que houve em vez de
   * virar "reconectando…" para sempre.
   */
  | { tipo: 'sala-encerrada' };
