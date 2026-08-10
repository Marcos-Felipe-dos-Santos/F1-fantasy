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
  | { tipo: 'entrar'; nome: string }
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
  | { tipo: 'reentrar'; token: string }
  | { tipo: 'sair' }
  | { tipo: 'pronto'; pronto: boolean }
  | { tipo: 'iniciar' };

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
   * A sala acabou de ser encerrada e o estado foi descartado. Vem antes de o
   * servidor fechar as conexões, pra que a tela diga o que houve em vez de
   * virar "reconectando…" para sempre.
   */
  | { tipo: 'sala-encerrada' };
