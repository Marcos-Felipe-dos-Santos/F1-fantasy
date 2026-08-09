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
  | { tipo: 'sair' }
  | { tipo: 'pronto'; pronto: boolean }
  | { tipo: 'iniciar' };

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
  | { tipo: 'voce-e'; jogadorId: string }
  | { tipo: 'erro'; erro: ErroSala };
