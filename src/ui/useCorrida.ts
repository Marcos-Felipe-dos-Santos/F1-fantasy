/**
 * Hook da corrida do modo Single (PR 1.7b): casca fina de `useState`/`useRef`
 * sobre `prepararCorrida` (engine) e a matemática pura de replay de
 * `fluxo-corrida.ts`. Nenhuma regra de jogo mora aqui — só orquestra o
 * relógio do replay (via `requestAnimationFrame`, permitido na UI — a
 * proibição de `performance.now`/`Date.now` é só na engine, ver CLAUDE.md).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dataset } from '../engine/dataset';
import type { DraftState, Pista, ResultadoCorrida, ResultadoQuali } from '../engine/types';
import type { CorridaPreparada } from './corrida-online';
import { dataset } from './dataset-app';
import { escalaReplay, MS_REPLAY_POR_VOLTA, prepararCorrida, type VelocidadeReplay } from './fluxo-corrida';

export type FaseCorrida = 'grid' | 'replay' | 'resultado';

/**
 * De onde `useCorrida` tira a corrida a exibir (PR 2/4 de "corrida online") —
 * a costura que evita a classe de bug do PR 8.4 (duas trilhas de corrida,
 * cada lado correto isoladamente, a composição errada, e nada acusa porque
 * hoje as duas trilhas dão o mesmo resultado por serem determinísticas).
 *
 * - `'preparar'` — caminho OFFLINE (corrida avulsa e etapa de campeonato):
 *   `useCorrida` chama `prepararCorrida` ele mesmo. `pistaId` explícito,
 *   `seed` opcional (default é a seed do draft — mesma semântica de sempre).
 * - `'pronta'` — caminho ONLINE: a corrida já foi computada UMA vez por
 *   `corridaDaSala` dentro de `useSalaOnline`, e é essa MESMA REFERÊNCIA que
 *   chega aqui. `prepararCorrida` NÃO é chamada neste modo — é o que garante
 *   que a tela mostra exatamente o que o hash de divergência atestou.
 */
export type FonteDaCorrida =
  | { modo: 'preparar'; pistaId: string; seed?: number }
  | { modo: 'pronta'; corrida: CorridaPreparada };

/**
 * Decide a corrida inicial de `useCorrida`, a partir da `FonteDaCorrida`.
 * Função PURA, extraída do `useState` pra ser testável sem renderizar hook
 * (o projeto não tem ambiente jsdom — `useCorrida.test.ts` testa esta função
 * diretamente).
 *
 * 🔒 Modo `'pronta'`: devolve `fonte.corrida` POR REFERÊNCIA, sem tocar em
 * `prepararCorrida`. Qualquer transformação aqui (mesmo que dê o mesmo
 * resultado, por ser determinístico) reabriria a segunda trilha que este PR
 * existe pra fechar.
 */
export function corridaInicial(
  dataset: Dataset,
  state: DraftState,
  fonte: FonteDaCorrida,
): CorridaPreparada {
  if (fonte.modo === 'pronta') return fonte.corrida;
  const preparo = prepararCorrida(dataset, state, fonte.pistaId, fonte.seed);
  return { pistaId: fonte.pistaId, ...preparo };
}

/** Tempo de relógio (ms) que o replay espera parado no resultado final antes de trocar de fase sozinho. */
const PAUSA_FINAL_MS = 1000;

export interface UseCorridaResultado {
  fase: FaseCorrida;
  pista: Pista;
  grid: ResultadoQuali;
  resultado: ResultadoCorrida;
  /** Tempo simulado (ms) decorrido de corrida no instante atual do replay. */
  tempoSimMs: number;
  /** Fase 'grid' → 'replay': larga a corrida e começa a animar o replay. */
  largar: () => void;
  /** Pula direto pro resultado final, de qualquer fase (GDD: assistir ou pular). */
  acelerar: () => void;
  /** Velocidade atual do replay (PR 2.6) — default 'media'. */
  velocidade: VelocidadeReplay;
  /** Troca a velocidade do replay em andamento, sem reiniciar nem pular tempo (PR 2.6). */
  setVelocidade: (velocidade: VelocidadeReplay) => void;
}

export function useCorrida(
  state: DraftState,
  /** De onde vem a corrida — 'preparar' (offline) ou 'pronta' (online, já computada). Ver `FonteDaCorrida`. */
  fonte: FonteDaCorrida,
  /**
   * Larga sozinho ao montar, sem esperar clique (PR C, modo automático do
   * campeonato). Sem isto o auto-avanço empacaria na tela de grid: avançar o
   * cursor do campeonato leva à fase `'grid'`, que só sai no botão "Largar".
   */
  autoLargar = false,
): UseCorridaResultado {
  // O inicializador do `useState` roda uma vez por MONTAGEM do hook. No
  // campeonato, cada etapa monta um `FluxoCorrida` novo (o `key` no `App`
  // garante isso) — sem essa remontagem, trocar de etapa não re-prepararia a
  // corrida e o jogador correria a primeira pista o campeonato inteiro. No
  // modo 'pronta' (online), o mesmo raciocínio vale ao contrário: não há
  // recomputação nenhuma, só a REFERÊNCIA recebida — ver `corridaInicial`.
  const [{ pista, grid, resultado }] = useState(() => corridaInicial(dataset, state, fonte));
  const [fase, setFase] = useState<FaseCorrida>('grid');
  const [tempoSimMs, setTempoSimMs] = useState(0);
  const [velocidade, setVelocidadeState] = useState<VelocidadeReplay>('media');

  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  // Espelha `tempoSimMs` fora do ciclo de render: o passo do rAF lê/escreve
  // aqui (não no updater de `setState`) pra manter os efeitos colaterais
  // (agendar o próximo rAF/timeout) fora de qualquer função que o React
  // possa invocar mais de uma vez (StrictMode invoca updaters de `setState`
  // 2x em dev pra flagar impureza — um updater que agenda rAF/timeout dobra
  // os callbacks agendados a cada frame e trava a aba em segundos).
  const tempoSimRef = useRef(0);

  const tempoVencedorMs = resultado.classificacao[0].tempoTotal;
  // Fator de escala espelhado numa ref (mesmo motivo do `tempoSimRef`): o
  // passo do rAF (`largar`) lê daqui a cada frame, então trocar a
  // velocidade DURANTE o replay (PR 2.6) só precisa atualizar esta ref —
  // não reinicia o replay nem re-cria o loop do rAF. A atualização acontece
  // dentro do handler `setVelocidade` (evento de clique), não num updater de
  // `setState`, então não corre o risco de duplicar em StrictMode.
  const fatorEscalaRef = useRef(escalaReplay(tempoVencedorMs, pista.voltas, MS_REPLAY_POR_VOLTA[velocidade]));

  const setVelocidade = useCallback(
    (proxima: VelocidadeReplay) => {
      fatorEscalaRef.current = escalaReplay(tempoVencedorMs, pista.voltas, MS_REPLAY_POR_VOLTA[proxima]);
      setVelocidadeState(proxima);
    },
    [tempoVencedorMs, pista.voltas],
  );

  const pararAnimacao = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Limpa qualquer animação/timeout pendente ao desmontar.
  useEffect(() => pararAnimacao, [pararAnimacao]);

  const largar = useCallback(() => {
    pararAnimacao();
    tempoSimRef.current = 0;
    setTempoSimMs(0);
    setFase('replay');

    let ultimoTimestamp: number | null = null;

    const passo = (timestamp: number) => {
      if (ultimoTimestamp === null) ultimoTimestamp = timestamp;
      const deltaRealMs = timestamp - ultimoTimestamp;
      ultimoTimestamp = timestamp;

      const proximo = tempoSimRef.current + deltaRealMs * fatorEscalaRef.current;

      if (proximo >= tempoVencedorMs) {
        tempoSimRef.current = tempoVencedorMs;
        setTempoSimMs(tempoVencedorMs);
        rafRef.current = null;
        timeoutRef.current = window.setTimeout(() => setFase('resultado'), PAUSA_FINAL_MS);
        return;
      }

      tempoSimRef.current = proximo;
      setTempoSimMs(proximo);
      rafRef.current = requestAnimationFrame(passo);
    };

    rafRef.current = requestAnimationFrame(passo);
  }, [tempoVencedorMs, pararAnimacao]);

  // Auto-largada (PR C). Roda uma vez, na fase 'grid': a guarda de fase evita
  // relargar se `largar` mudar de identidade no meio do replay. `largar` já
  // limpa animação pendente antes de começar, então mesmo o duplo-invoke do
  // StrictMode não deixa dois rAF vivos.
  useEffect(() => {
    if (!autoLargar || fase !== 'grid') return;
    largar();
  }, [autoLargar, fase, largar]);

  const acelerar = useCallback(() => {
    pararAnimacao();
    tempoSimRef.current = tempoVencedorMs;
    setTempoSimMs(tempoVencedorMs);
    setFase('resultado');
  }, [pararAnimacao, tempoVencedorMs]);

  return { fase, pista, grid, resultado, tempoSimMs, largar, acelerar, velocidade, setVelocidade };
}
