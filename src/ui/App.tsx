/**
 * Roteador de telas (PR 1.7a: Single; PR 2.1b: hotseat do modo Local):
 * sem estado ⇒ TelaInicio; fase 'sorteios'/'peca' ⇒ TelaHandoff (se o
 * aparelho precisa trocar de mão) ou TelaDraft/TelaPeca (se quem está
 * confirmado com o aparelho já é o alvo); 'concluido' ⇒ TelaResumo ou, depois
 * de "Ir pra corrida", `FluxoCorrida`. Toda transição de estado do draft é
 * delegada ao hook `useDraft`; o roteamento de turno hotseat é derivado (sem
 * efeito) por `decisaoLocal` (`fluxo-local.ts`) a partir de `confirmadoId` —
 * o único estado extra que esta tela guarda, e que a engine nunca vê.
 */

import { useCallback, useMemo, useState } from 'react';
import './estilos.css';
import type { Dificuldade, EscolhaDraft } from '../engine/types';
import { BotaoTema } from './BotaoTema';
import { dataset } from './dataset-app';
import { FluxoCampeonato } from './FluxoCampeonato';
import { FluxoCorrida } from './FluxoCorrida';
import { FluxoOnline } from './FluxoOnline';
import { TelaSalaOnline } from './TelaSalaOnline';
import { criarSalaNoServidor, fixarSalaNaBarra, linkDaSala, salaDaUrl } from './sala-online';
import { PISTA_CORRIDA_ID } from './fluxo-corrida';
import {
  avancarEtapa,
  calendarioSorteado,
  ehCampeonato,
  iniciarCampeonato,
  resumoCampeonatoSalvo,
  type EstadoCampeonato,
  type FormatoPartida,
} from './fluxo-campeonato';
import type { HumanoConfig } from './fluxo-draft';
import { decisaoLocal } from './fluxo-local';
import { nomeJogador } from './loadout-view';
import { carregarCampeonato, limparSave, salvarCampeonato } from './persistencia';
import { storageDoNavegador } from './storage-app';
import { TelaDraft } from './TelaDraft';
import { TelaHandoff } from './TelaHandoff';
import { TelaInicio } from './TelaInicio';
import { TelaPeca } from './TelaPeca';
import { TelaResumo } from './TelaResumo';
import { useDraft } from './useDraft';
import type { Visibilidade } from './visibilidade';

function App() {
  const { state, humanos, erro, comecar, escolher, retomar, reiniciar } = useDraft();
  const [naCorrida, setNaCorrida] = useState(false);
  const [confirmadoId, setConfirmadoId] = useState<string | null>(null);
  // Visibilidade é opção da partida (§5), não conceito da engine — guardada
  // aqui, ao lado de `naCorrida`/`confirmadoId`. Default 'craque' só serve
  // pra tipar o estado inicial: antes de `comecarPartida` não há TelaInicio
  // nenhuma renderizada que dependa desse valor.
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('craque');
  // Pista da corrida (PR 2.5) é opção da partida, no mesmo espírito de
  // `visibilidade` — default só serve pra tipar o estado inicial (nunca
  // renderizado antes de `comecarPartida`).
  const [pistaId, setPistaId] = useState(PISTA_CORRIDA_ID);
  // Formato da partida (PR 8.4-mínimo): 'unica' preserva o fluxo de sempre.
  const [formato, setFormato] = useState<FormatoPartida>('unica');
  // Campeonato em andamento. `null` na corrida avulsa. Vem de
  // `iniciarCampeonato`, que PRÉ-SIMULA todas as etapas — `etapaAtual` é só um
  // cursor de apresentação, nunca dispara simulação nova.
  const [campeonato, setCampeonato] = useState<EstadoCampeonato | null>(null);
  // Sala online em que estamos, ou `null` no offline (PR 3.3). É um roteamento
  // à parte de propósito: no online o `DraftState` não vem de `useDraft` — vem
  // reconstruído do log da sala, e quem manda na seed é o servidor.
  // `?sala=A3F9C2` no link entra direto na sala — é o caminho principal no
  // celular, onde ditar código é chato. Lido UMA vez, na montagem.
  const [salaOnline, setSalaOnline] = useState<string | null>(() => salaDaUrl(window.location));
  // `true` = está na tela de criar/entrar. O link pula direto pra sala.
  const [escolhendoSala, setEscolhendoSala] = useState(false);
  const [codigoCriado, setCodigoCriado] = useState<string | null>(null);
  const [criandoSala, setCriandoSala] = useState(false);
  const [erroSala, setErroSala] = useState<string | null>(null);

  const criarSala = useCallback(async () => {
    setCriandoSala(true);
    setErroSala(null);
    const codigo = await criarSalaNoServidor();
    setCriandoSala(false);
    if (codigo === null) {
      setErroSala('Não deu pra criar a sala. O servidor está rodando? (`npm run sala`)');
      return;
    }
    setCodigoCriado(codigo);
  }, []);

  /**
   * 🔑 O ÚNICO caminho de entrada numa sala — e ele grava `?sala=` na URL.
   *
   * O funil existe porque a sala vive em DOIS lugares que precisam concordar:
   * o estado React (que a tela usa agora) e a URL (que é a ÚNICA fonte no
   * boot, `salaDaUrl` logo acima). Enquanto entrar era só `setSalaOnline`,
   * quem criava a sala ficava com a URL limpa e perdia a sala no F5 — com o
   * token de reentrada guardado e inútil, porque nada dizia de que sala ele
   * era. `sala-na-url.test.ts` trava que não volte a existir uma segunda
   * entrada que esqueça a URL.
   */
  const entrarNaSala = useCallback((codigo: string) => {
    setSalaOnline(codigo);
    setEscolhendoSala(false);
    fixarSalaNaBarra(codigo);
  }, []);

  const sairDaSala = useCallback(() => {
    setSalaOnline(null);
    setEscolhendoSala(false);
    setCodigoCriado(null);
    // Tira o `?sala=` da barra: sem isso, um F5 depois de sair voltaria pra
    // sala que o jogador acabou de deixar.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const storage = useMemo(() => storageDoNavegador(), []);

  // Save encontrado no carregamento da página, pro botão "Continuar
  // campeonato". Lido UMA vez (o `useState` com inicializador), não a cada
  // render: depois disso quem manda é o estado em memória.
  const [saveInicial, setSaveInicial] = useState(() => {
    if (!storage) return null;
    const carga = carregarCampeonato(storage);
    return carga.ok ? carga.save : null;
  });

  const resumoSalvo = useMemo(
    () => (saveInicial ? resumoCampeonatoSalvo(saveInicial.calendario, saveInicial.etapaAtual) : null),
    [saveInicial],
  );

  const reiniciarTudo = useCallback(() => {
    setNaCorrida(false);
    setConfirmadoId(null);
    setCampeonato(null);
    setFormato('unica');
    // O save só é apagado aqui, no "Novo draft" explícito — não ao começar a
    // ler a página. Assim fechar a aba no meio de um campeonato nunca perde
    // progresso, que é o ponto do "Continuar".
    if (storage) limparSave(storage);
    setSaveInicial(null);
    reiniciar();
  }, [reiniciar, storage]);

  const comecarPartida = useCallback(
    (
      seedTexto: string,
      dificuldade: Dificuldade,
      humanosConfig: HumanoConfig[],
      visibilidadeEscolhida: Visibilidade,
      pistaEscolhidaId: string,
      formatoEscolhido: FormatoPartida,
    ) => {
      comecar(seedTexto, dificuldade, humanosConfig);
      setVisibilidade(visibilidadeEscolhida);
      setPistaId(pistaEscolhidaId);
      setFormato(formatoEscolhido);
      setCampeonato(null);
      // Começar partida nova descarta o campeonato salvo: o aviso disso está
      // na própria TelaInicio, ao lado do botão "Continuar".
      if (storage) limparSave(storage);
      setSaveInicial(null);
      // Single (1 humano): pula a TelaHandoff — comportamento do modo Single
      // preservado (nunca troca de mão). Local (2-4 humanos): começa sem
      // ninguém confirmado, então o primeiro render já pede handoff pro
      // humano-1.
      setConfirmadoId(humanosConfig.length === 1 ? humanosConfig[0].id : null);
    },
    [comecar, storage],
  );

  /**
   * Loadouts do draft concluído, na MESMA ordem que `prepararCorrida` usa
   * (por `jogadorId`). A ordem não muda o resultado — a engine sorteia por
   * jogador —, mas manter uma só evita divergência boba entre as duas
   * trilhas.
   */
  const loadoutsOrdenados = useCallback(
    (draft: NonNullable<typeof state>) =>
      Object.entries(draft.loadouts)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([, loadout]) => loadout),
    [],
  );

  /**
   * "Ir pra corrida" na TelaResumo. Na corrida avulsa só troca de tela; no
   * campeonato é aqui que o calendário é sorteado e as etapas são
   * pré-simuladas, porque só agora existem loadouts.
   */
  const irParaCorrida = useCallback(() => {
    if (state && state.fase === 'concluido' && ehCampeonato(formato)) {
      const calendario = calendarioSorteado(dataset, state.seed, formato);
      const novo = iniciarCampeonato(dataset, loadoutsOrdenados(state), state.seed, calendario);
      setCampeonato(novo);
      // Salva já na etapa 0: se o jogador fechar a aba antes de terminar a
      // primeira corrida, o campeonato (e o calendário sorteado) sobrevive.
      if (storage) salvarCampeonato(storage, state.seed, state, novo);
    }
    setNaCorrida(true);
  }, [state, formato, loadoutsOrdenados, storage]);

  /** Fim de uma etapa: avança o cursor e persiste. */
  const proximaCorrida = useCallback(() => {
    if (!state || !campeonato) return;
    const avancado = avancarEtapa(campeonato);
    setCampeonato(avancado);
    if (storage) salvarCampeonato(storage, state.seed, state, avancado);
  }, [state, campeonato, storage]);

  /**
   * "Continuar campeonato": re-hidrata o draft salvo e RE-SIMULA o campeonato
   * a partir de seed + loadouts + calendário. Não usa `retomarCampeonato`
   * porque este caminho precisa do `DraftState` no hook de draft de qualquer
   * forma; a validação de integridade que interessa aqui já foi feita por
   * `carregarCampeonato` (shape + versão) na leitura inicial.
   */
  const continuarCampeonato = useCallback(() => {
    if (!saveInicial) return;
    const draft = saveInicial.draft;
    const estado = iniciarCampeonato(
      dataset,
      loadoutsOrdenados(draft),
      saveInicial.seed,
      saveInicial.calendario,
    );
    const formatoSalvo = resumoCampeonatoSalvo(saveInicial.calendario, saveInicial.etapaAtual);
    if (!formatoSalvo) return;

    retomar(draft);
    setFormato(formatoSalvo.formato);
    setCampeonato({ ...estado, etapaAtual: saveInicial.etapaAtual });
    setVisibilidade('craque');
    setConfirmadoId(draft.jogadores.find((j) => j.tipo === 'humano')?.id ?? null);
    setNaCorrida(true);
  }, [saveInicial, loadoutsOrdenados, retomar]);

  const idsHumanos = useMemo(() => humanos.map((h) => h.id), [humanos]);

  const decisao =
    state && state.fase !== 'concluido' ? decisaoLocal(state, idsHumanos, confirmadoId) : null;

  const nomeDoAlvo =
    decisao?.tipo === 'handoff'
      ? nomeJogador(
          state?.jogadores.find((j) => j.id === decisao.alvo) ?? { id: decisao.alvo, tipo: 'humano' },
        )
      : null;

  // Subtítulo "Vez de {nome}" nas telas de jogada: só faz sentido com 2+
  // humanos (modo Local) — no Single ele é sempre o mesmo e só polui a tela,
  // então é omitido (decisão de UI deste PR).
  const vezDe =
    state && decisao?.tipo === 'jogar' && idsHumanos.length > 1
      ? nomeJogador(state.jogadores.find((j) => j.id === decisao.jogadorId)!)
      : undefined;

  return (
    <div className="app-shell">
      <BotaoTema />

      {salaOnline !== null && (
        // `key`: trocar de sala remonta o fluxo, zerando token e estado local.
        <FluxoOnline key={salaOnline} sala={salaOnline} onVoltar={sairDaSala} />
      )}

      {salaOnline === null && escolhendoSala && (
        <TelaSalaOnline
          onCriar={criarSala}
          onEntrar={entrarNaSala}
          onVoltar={sairDaSala}
          codigoCriado={codigoCriado}
          criando={criandoSala}
          erro={erroSala}
          linkDaSala={linkDaSala}
        />
      )}

      {salaOnline === null && !escolhendoSala && !state && (
        <TelaInicio
          onComecar={comecarPartida}
          campeonatoSalvo={resumoSalvo}
          onContinuarCampeonato={continuarCampeonato}
          onEntrarOnline={() => setEscolhendoSala(true)}
        />
      )}

      {state && decisao?.tipo === 'handoff' && nomeDoAlvo !== null && (
        <TelaHandoff
          nome={nomeDoAlvo}
          fase={state.fase === 'peca' ? 'peca' : 'sorteios'}
          onConfirmar={() => setConfirmadoId(decisao.alvo)}
        />
      )}

      {state?.fase === 'sorteios' && decisao?.tipo === 'jogar' && (
        <TelaDraft
          state={state}
          jogadorId={decisao.jogadorId}
          vezDe={vezDe}
          visibilidade={visibilidade}
          erro={erro}
          onEscolher={(escolha: EscolhaDraft) => escolher(decisao.jogadorId, escolha)}
        />
      )}
      {state?.fase === 'peca' && decisao?.tipo === 'jogar' && (
        <TelaPeca
          state={state}
          jogadorId={decisao.jogadorId}
          vezDe={vezDe}
          visibilidade={visibilidade}
          erro={erro}
          onEscolher={(escolha: EscolhaDraft) => escolher(decisao.jogadorId, escolha)}
        />
      )}
      {state?.fase === 'concluido' && !naCorrida && (
        <TelaResumo
          state={state}
          visibilidade={visibilidade}
          onReiniciar={reiniciarTudo}
          onIrParaCorrida={irParaCorrida}
        />
      )}
      {state?.fase === 'concluido' && naCorrida && campeonato === null && (
        <FluxoCorrida
          state={state}
          fonte={{ modo: 'preparar', pistaId }}
          onReiniciar={reiniciarTudo}
        />
      )}
      {state?.fase === 'concluido' && naCorrida && campeonato !== null && (
        <FluxoCampeonato
          state={state}
          campeonato={campeonato}
          onProximaCorrida={proximaCorrida}
          onReiniciar={reiniciarTudo}
        />
      )}
    </div>
  );
}

export default App;
