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
import { hashDoDraft } from '../net/hash-draft';
import { hashDaCorrida } from '../net/hash-corrida';
import { RODADA_COMPLETA } from '../net/tipos';
import { VERSAO_APP } from '../engine/versao';
import type { EscolhaDraft, LinhaClassificacao } from '../engine/types';
import {
  classificacaoDaSala,
  corridaDaSala,
  etapasDaSala,
  type CorridaPreparada,
} from './corrida-online';
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
  /**
   * A corrida da sala, já computada — `null` até o draft concluir E a
   * `seedCorrida` ser publicada (PR 2/4 de "corrida online").
   *
   * 🔒 **A ÚNICA referência.** Computada uma vez aqui, por `corridaDaSala`; é
   * esta MESMA referência que alimenta tanto o atestado de hash abaixo quanto
   * a tela (`FluxoCorrida`, via `{ modo: 'pronta', corrida }` no PR 4). Ver o
   * docblock de `corrida-online.ts` pra tese completa.
   */
  corrida: CorridaPreparada | null;
  /**
   * 🏆 As etapas ABERTAS do campeonato online, derivadas do snapshot (PR 3.5.3).
   *
   * `[]` enquanto o draft não conclui e em sala legado. Cresce quando o cursor
   * do servidor anda: `etapas[k]` é a etapa k, e `etapas.length - 1` é a etapa
   * corrente (`cliente.sala.etapaAtual` diz o mesmo, pelo lado do servidor).
   *
   * ⚠️ **NADA CONSOME ISTO AINDA, e é de propósito (recorte do 3.5.3).** A tela
   * e o atestado de hash continuam ligados em `corrida` acima — a corrida
   * AVULSA — exatamente como no 3.5.2. Ligar a tela às etapas exige o
   * `key={'etapa-'+k}` no `FluxoCorrida` (sem ele o `useState` de `useCorrida`
   * mantém a corrida anterior) e o atestado por etapa; as duas coisas andam
   * JUNTAS, porque atestar o hash da etapa k com a tela mostrando a etapa 0 é a
   * classe de bug do 8.4 — a mesma que este arquivo existe para evitar. **É o
   * 3.5.4 que as liga, no PR que tem portão visual.**
   */
  etapas: CorridaPreparada[];
  /**
   * 🏆 A classificação acumulada das etapas ABERTAS (PR 3.5.3), pela mesma
   * `acumularClassificacao` do offline. `[]` junto com `etapas`.
   */
  classificacao: LinhaClassificacao[];
  /**
   * 🏁 "Terminei a corrida" — alimenta a BARREIRA DO FIM (PR 3/4).
   *
   * 🔑 **Chamar isto NÃO segura ninguém, e não chamar não segura ninguém
   * tampouco.** A barreira é ciclo de vida, não portão de UI: ela só decide
   * QUANDO a sala considera a partida encerrada, para então armar a janela de
   * graça de 10 minutos em que dá pra olhar o resultado. Quem nunca atesta é
   * resolvido pelo `TIMEOUT_FIM_DE_CORRIDA_MS` do servidor.
   *
   * ⚠️ **A CHAMADA fica no PR 4/4**, quando existir a tela: o momento certo é
   * o fim do replay (o jogador chegou à tela de resultado), e é lá que esse
   * evento existe. Enquanto ninguém chamar, a barreira resolve sempre por
   * timeout — funciona, só demora 5 minutos a mais para a janela começar.
   * É seguro; é só não ser o ideal.
   */
  atestarFimDaCorrida: () => void;
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
          // `versaoApp` também aqui: reconectar é o caminho MAIS comum (todo
          // F5 passa por ele), e um deploy no meio da partida traria o jogador
          // de volta com engine nova numa sala de engine velha.
          conexaoRef.current?.enviar({
            tipo: 'reentrar',
            token: tokenRef.current,
            versaoApp: VERSAO_APP,
          });
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

  /**
   * 🔴 ATESTADO DE HASH (PR 3.4) — o detector de divergência.
   *
   * Sai a cada avanço REAL do draft (`eventosAplicados` mudou), não a cada
   * mensagem: snapshot repetido e `voce-e` não movem o estado, e reatestar só
   * geraria tráfego e escrita no Durable Object.
   *
   * ⚠️ Mora num efeito, e **não dentro do updater do `setCliente`** — foi onde
   * a primeira versão o pôs (achado da revisão). Updater tem que ser puro: o
   * StrictMode o invoca duas vezes, e o envio saía duplicado. Idempotente pra
   * detecção, mas somava amplificação de escrita no DO de graça.
   */
  useEffect(() => {
    if (cliente.draft === null || cliente.euSou === null) return;
    conexaoRef.current?.enviar({
      tipo: 'hash',
      escopo: 'draft',
      ancora: cliente.eventosAplicados,
      hash: hashDoDraft(cliente.draft),
    });
    // `draft` fora das dependências de propósito: ele é reconstruído a cada
    // sincronização e mudaria de IDENTIDADE sem mudar de CONTEÚDO, reatestando
    // à toa (e gravando no Durable Object à toa junto). `eventosAplicados` é o
    // contador que marca avanço de verdade — é ele que define quando reatestar.
  }, [cliente.eventosAplicados, cliente.euSou]);

  /**
   * 🔴 A ÚNICA COMPUTAÇÃO DA CORRIDA ONLINE (PR 2/4 de "corrida online") — a
   * defesa contra a classe de bug do PR 8.4 (duas trilhas de corrida, cada
   * lado correto isoladamente, composição errada, e nada acusa). `corrida`
   * nasce aqui, UMA vez, e é a MESMA REFERÊNCIA que o atestado de hash abaixo
   * usa e que o PR 4 vai passar pra `FluxoCorrida` como `{ modo: 'pronta',
   * corrida }`. Ninguém mais chama `corridaDaSala`.
   *
   * Condição: só quando o draft concluiu E a `seedCorrida` já foi publicada
   * (`seedCorrida` só sai do servidor com o draft concluído — ver
   * `EstadoSalaPublico.seedCorrida`). Fora disso, `null`.
   *
   * `cliente.draft` ENTRA nas dependências aqui — ao contrário do atestado de
   * hash do draft acima — porque `sincronizarDraft` (`src/net/cliente.ts`)
   * só troca a IDENTIDADE de `estado.draft` quando o log realmente cresce
   * (`aplicados` avança); sem evento novo, a variável local `draft` não é
   * reatribuída e a referência anterior é devolvida. Depois que o draft
   * conclui, o log para de crescer, então `cliente.draft` fica estável e
   * `corrida` é computada uma única vez.
   */
  const corrida = useMemo<CorridaPreparada | null>(() => {
    if (cliente.draft === null || cliente.draft.fase !== 'concluido') return null;
    const seedCorrida = cliente.sala?.seedCorrida;
    if (seedCorrida === null || seedCorrida === undefined) return null;
    return corridaDaSala(dataset, cliente.draft, seedCorrida);
  }, [cliente.draft, cliente.sala?.seedCorrida]);

  /**
   * 🏆 AS ETAPAS DO CAMPEONATO ONLINE (PR 3.5.3) — derivação PURA do snapshot.
   *
   * Toda a lógica mora em `etapasDaSala` (`corrida-online.ts`), e este `useMemo`
   * é casca fina em cima dela. **Não é estilo:** o projeto não tem
   * `jsdom`/`@testing-library`, então nada que more dentro deste hook pode ser
   * alcançado por teste — e o 3.5.2 acabou de pagar caro pela lição de que
   * baseline que não alcança a guarda não é baseline. O pareamento
   * `seedsAbertas[k]` ↔ `calendario[k]`, que é o coração deste PR, fica do lado
   * puro justamente para que as mutações possam ser vistas vermelhas.
   *
   * 🔴 **`chaveSeedsAbertas` (string) na lista de dependências, e NÃO o array.**
   * `cliente.sala` é reconstruído a cada snapshot que chega do servidor, então
   * `seedsAbertas` é um array NOVO a cada mensagem, mesmo sem nenhuma etapa ter
   * aberto. Depender da referência recomputaria 5 etapas × 22 carros a cada
   * broadcast — inclusive durante o draft dos outros. A chave por VALOR muda
   * exatamente quando o conteúdo muda, que é o gatilho pretendido. Mesma
   * família da limitação registrada na pendência 0(j), agora resolvida em vez
   * de rastreada à mão.
   */
  const chaveSeedsAbertas = (cliente.sala?.seedsAbertas ?? []).join(',');
  const etapas = useMemo<CorridaPreparada[]>(() => {
    if (cliente.draft === null || cliente.draft.fase !== 'concluido') return [];
    return etapasDaSala(
      dataset,
      cliente.draft,
      cliente.sala?.seedCalendario ?? null,
      cliente.sala?.seedsAbertas ?? [],
    );
    // `cliente.sala?.seedsAbertas` é LIDA aqui mas não entra nas dependências —
    // quem a representa é `chaveSeedsAbertas`, pelo motivo acima. O projeto não
    // usa `react-hooks/exhaustive-deps` (medido em `eslint.config.js`), então
    // isto é decisão explícita, não regra silenciada.
  }, [cliente.draft, cliente.sala?.seedCalendario, chaveSeedsAbertas]);

  const classificacao = useMemo<LinhaClassificacao[]>(
    () => (cliente.draft === null ? [] : classificacaoDaSala(etapas, cliente.draft)),
    [etapas, cliente.draft],
  );

  /**
   * 🔴 ATESTADO DE HASH DA CORRIDA (PR 2/4) — mesmo detector do draft, agora
   * sobre `corrida`. Mesmo molde do efeito acima: mora num efeito separado
   * (não dentro de um updater de `setState`, pelo mesmo motivo do StrictMode
   * duplicando envio), e dispara só quando `corrida` muda de REFERÊNCIA — que,
   * por construção do `useMemo` acima, só acontece na primeira vez que a
   * corrida fica disponível (a partir daí `cliente.draft` e `seedCorrida`
   * ficam estáveis, então `corrida` também fica).
   *
   * ⚠️ **LIMITAÇÃO CONHECIDA, registrada e não coberta por teste**: "o
   * atestado sai uma vez" se apoia na estabilidade de REFERÊNCIA de
   * `cliente.draft` entre re-sincronizações sem evento novo — rastreada
   * manualmente em `sincronizarDraft` (`src/net/cliente.ts:195-224`: quando
   * `sala.draft.log.slice(aplicados)` vem vazio, o `for` não executa, a
   * variável local `draft` nunca é reatribuída, e o objeto devolvido carrega
   * a MESMA referência de `estado.draft`). Isso NÃO tem asserção própria: o
   * projeto não tem `jsdom`/`@testing-library` pra renderizar este hook e
   * observar quantas vezes o efeito dispara, e instalar essa dependência só
   * por causa de um efeito é escopo fora deste PR. Se `sincronizarDraft`
   * mudar a ponto de `estado.draft` passar a trocar de identidade mesmo sem
   * evento novo, este efeito volta a reatestar a cada snapshot — silenciosamente.
   */
  useEffect(() => {
    if (corrida === null || cliente.euSou === null) return;
    conexaoRef.current?.enviar({
      tipo: 'hash',
      escopo: 'corrida',
      ancora: cliente.eventosAplicados,
      hash: hashDaCorrida(corrida),
    });
    // `eventosAplicados` fora das dependências de propósito, mesmo raciocínio
    // do efeito do draft: quando `corrida` já está disponível, o log parou de
    // crescer (draft concluído), então `eventosAplicados` já está no valor
    // final. Disparar por `corrida` (a referência) é suficiente e evita
    // qualquer reatestado supérfluo.
  }, [corrida, cliente.euSou]);

  // `versaoApp` é o handshake do 3.4: dois builds diferentes produzem loadouts
  // diferentes do mesmo log, e o servidor recusa a entrada em vez de deixar a
  // partida nascer dividida.
  const entrar = useCallback(
    (nome: string) => enviar({ tipo: 'entrar', nome, versaoApp: VERSAO_APP }),
    [enviar],
  );
  const definirPronto = useCallback(
    (pronto: boolean) => enviar({ tipo: 'pronto', pronto }),
    [enviar],
  );
  const iniciar = useCallback(() => enviar({ tipo: 'iniciar' }), [enviar]);
  // Idempotente no servidor (atestado repetido preserva a identidade do estado
  // e não gera escrita no Durable Object), então a UI pode chamar sem guardar
  // se já chamou.
  //
  // ⚠️ **Correção do PR 4/4:** esta linha dizia "inclusive depois de um F5 na
  // tela de resultado", e isso NÃO acontece — não há caminho que reateste após
  // um F5. O `naCorrida` que leva à corrida é estado local do `FluxoOnline`, e
  // recarregar devolve o jogador ao resumo (limite conhecido, registrado lá).
  // Quem não reatesta cai no `TIMEOUT_FIM_DE_CORRIDA_MS`, que é o fallback
  // projetado — funciona, só adia a janela de graça. As duas metades estavam
  // documentadas em arquivos diferentes e ninguém tinha ligado uma na outra.
  const atestarFimDaCorrida = useCallback(
    () => enviar({ tipo: 'corrida-concluida' }),
    [enviar],
  );
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
    corrida,
    etapas,
    classificacao,
    atestarFimDaCorrida,
  };
}
