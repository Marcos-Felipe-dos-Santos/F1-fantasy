/**
 * Hook da sala online (PR 3.3): casca de `useState`/`useEffect` sobre a conexão
 * (`src/net/conexao.ts`) e o cliente puro (`src/net/cliente.ts`).
 *
 * 🔴 **NENHUMA REGRA DE JOGO MORA AQUI, e uma em especial não pode nascer
 * aqui: a escolha que substitui um jogador ausente.** Ela é calculada num lugar
 * só — `escolhaDoAusente`, em `src/net/cliente.ts` — porque precisa ser
 * IDÊNTICA nos 22 clientes. Se a UI criasse um segundo caminho, dois jogadores
 * debitariam cópias diferentes do pool compartilhado de peças e as partidas
 * divergiriam **em silêncio**. Ver o RISCO ATIVO no `ESTADO.md`; há um teste
 * que varre `src/ui/**` justamente para impedir esse segundo caminho.
 *
 * O token de reentrada é persistido no `localStorage` porque, no navegador, a
 * "reconexão" comum é **F5**. E a política tem duas metades, medidas no 3.2.1:
 * no lobby cair é sair (o token morre e o certo é `entrar` de novo); com a sala
 * iniciada o `reentrar` devolve identidade e estado.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  abrirConexao,
  baseParaEstaPagina,
  type Conexao,
  type EstadoConexao,
} from '../net/conexao';
import {
  aplicarMensagem,
  criarCliente,
  sincronizarDraft,
  type EstadoCliente,
} from '../net/cliente';
import type { ComandoDraft, ComandoSala } from '../net/protocolo';
import { RODADA_COMPLETA } from '../net/tipos';
import type { EscolhaDraft } from '../engine/types';
import { dataset } from './dataset-app';
import { storageDoNavegador } from './storage-app';

/** Chave do token no `localStorage`, por sala — salas diferentes, tokens diferentes. */
const chaveToken = (sala: string): string => `f1f:token-sala:${sala}`;

export interface UseSalaOnline {
  estadoConexao: EstadoConexao;
  cliente: EstadoCliente;
  /** Meu jogador na sala, se já entrei. */
  euSou: string | null;
  /** Eu perdi a vez por inatividade e agora só assisto? */
  souAusente: boolean;
  /** É a minha vez de jogar agora? */
  minhaVez: boolean;
  entrar: (nome: string) => void;
  definirPronto: (pronto: boolean) => void;
  iniciar: () => void;
  escolher: (escolha: EscolhaDraft) => void;
  sair: () => void;
  /** Último erro recebido do servidor, para a UI mostrar. */
  ultimoErro: string | null;
  /** A sala foi encerrada pelo servidor (janela vencida ou esvaziou). */
  encerrada: boolean;
  /** O código não existe (nunca criado, ou já encerrado). */
  inexistente: boolean;
}

export function useSalaOnline(sala: string): UseSalaOnline {
  const [estadoConexao, setEstadoConexao] = useState<EstadoConexao>('conectando');
  const [cliente, setCliente] = useState<EstadoCliente>(() => criarCliente());
  const conexaoRef = useRef<Conexao | null>(null);
  const storage = useMemo(() => storageDoNavegador(), []);

  // O token vive num ref porque o `aoAbrir` da conexão o lê fora do ciclo de
  // render — e precisa do valor mais recente, não do capturado na montagem.
  const tokenRef = useRef<string | null>(null);
  if (tokenRef.current === null && storage !== null) {
    try {
      tokenRef.current = storage.getItem(chaveToken(sala));
    } catch {
      tokenRef.current = null;
    }
  }

  useEffect(() => {
    const conexao = abrirConexao({
      base: baseParaEstaPagina(window.location, import.meta.env?.VITE_WS_BASE),
      sala,
      aoMudarEstado: setEstadoConexao,
      aoAbrir: () => {
        // Se tenho token, tento voltar como quem eu era. Se ele não valer mais
        // (lobby: cair é sair), o servidor responde `token-invalido` e a tela
        // de entrada aparece — que é o comportamento certo.
        // `conexaoRef.current`, e não a `const conexao` local: aquela ainda
        // está sendo inicializada quando este callback é criado. Só funciona
        // hoje porque o evento `open` é assíncrono — um socket que abrisse
        // sincronamente (mock, polyfill) daria `ReferenceError`.
        if (tokenRef.current !== null) {
          conexaoRef.current?.enviar({ tipo: 'reentrar', token: tokenRef.current });
        }
      },
      aoReceber: (mensagem) => {
        if (mensagem.tipo === 'voce-e' && typeof mensagem.token === 'string') {
          tokenRef.current = mensagem.token;
          try {
            storage?.setItem(chaveToken(sala), mensagem.token);
          } catch {
            // Sem persistência o jogo continua; só não sobrevive a um F5.
          }
        }
        // `sala-inexistente` também invalida o token guardado: ele pertencia a
        // uma sala que não existe mais, e insistir com ele só geraria erro a
        // cada reconexão.
        if (
          mensagem.tipo === 'erro' &&
          (mensagem.erro === 'token-invalido' || mensagem.erro === 'sala-inexistente')
        ) {
          tokenRef.current = null;
          try {
            storage?.removeItem(chaveToken(sala));
          } catch {
            /* idem */
          }
        }
        // O draft é reconstruído com a engine e o dataset, que só o cliente
        // tem. `sincronizarDraft` aplica só o delta do log.
        setCliente((atual) => sincronizarDraft(aplicarMensagem(atual, mensagem), dataset));
      },
    });
    conexaoRef.current = conexao;
    return () => {
      conexao.fechar();
      conexaoRef.current = null;
    };
  }, [sala, storage]);

  const enviar = useCallback((comando: ComandoSala | ComandoDraft) => {
    conexaoRef.current?.enviar(comando);
  }, []);

  const entrar = useCallback((nome: string) => enviar({ tipo: 'entrar', nome }), [enviar]);
  const definirPronto = useCallback(
    (pronto: boolean) => enviar({ tipo: 'pronto', pronto }),
    [enviar],
  );
  const iniciar = useCallback(() => enviar({ tipo: 'iniciar' }), [enviar]);
  const sair = useCallback(() => {
    enviar({ tipo: 'sair' });
    tokenRef.current = null;
    try {
      storage?.removeItem(chaveToken(sala));
    } catch {
      /* sem storage, nada a limpar */
    }
  }, [enviar, sala, storage]);

  const draftRede = cliente.sala?.draft ?? null;
  const euSou = cliente.euSou;

  const souAusente = euSou !== null && (draftRede?.ausentes.includes(euSou) ?? false);

  const minhaVez =
    euSou !== null &&
    draftRede !== null &&
    !souAusente &&
    (draftRede.fase === 'sorteios'
      ? (draftRede.rodada[euSou] ?? Infinity) < RODADA_COMPLETA
      : draftRede.fase === 'peca' && draftRede.ordemPeca[draftRede.indicePeca] === euSou);

  const escolher = useCallback(
    (escolha: EscolhaDraft) => {
      if (euSou === null || draftRede === null) return;
      // A coordenada de turno vem da MINHA visão, que pode estar atrasada — e é
      // por isso que ela existe: comando montado sobre visão velha é recusado
      // (`turno-divergente`) em vez de virar jogada fantasma.
      const turnoEsperado =
        draftRede.fase === 'sorteios' ? draftRede.rodada[euSou] : draftRede.indicePeca;
      enviar({ tipo: 'escolher', escolha, turnoEsperado });
    },
    [enviar, euSou, draftRede],
  );

  return {
    estadoConexao,
    cliente,
    euSou,
    souAusente,
    minhaVez,
    entrar,
    definirPronto,
    iniciar,
    escolher,
    sair,
    ultimoErro: cliente.erros.at(-1) ?? null,
    encerrada: cliente.encerrada,
    inexistente: cliente.erros.includes('sala-inexistente'),
  };
}
