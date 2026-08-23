/**
 * Fluxo do modo Online (PR 3.3): lobby → draft → resumo.
 *
 * Reusa as MESMAS telas do offline (`TelaDraft`, `TelaPeca`, `TelaResumo`).
 * Elas já recebiam `DraftState` + `jogadorId` desde o PR 2.1b (modo Local), e o
 * cliente online reconstrói exatamente um `DraftState` — então não há tela nova
 * de draft aqui, e é assim que tem de ser: duas telas desenhando a mesma coisa
 * acabariam divergindo.
 *
 * 🔴 **O que este arquivo NÃO faz, e não pode passar a fazer:** decidir a
 * escolha que substitui um jogador ausente. Isso é regra de jogo, mora em
 * `escolhaDoAusente` (`src/net/cliente.ts`) e precisa ser idêntica nos 22 — dois
 * caminhos de decisão furariam o pool de peças em silêncio. Ver o RISCO ATIVO no
 * `ESTADO.md`; `contrato-ausente.test.ts` varre `src/ui/**` pra impedir isso.
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { DraftState, LinhaClassificacao } from '../engine/types';
import type { EscolhaDraft } from '../engine/types';
import { FluxoCorrida } from './FluxoCorrida';
import { nomeDaPista, nomeDoJogador } from './FluxoCampeonato';
import { PainelCalendario } from './PainelCalendario';
import { PainelCampeonato } from './PainelCampeonato';
import { TelaDraft } from './TelaDraft';
import { TelaLobby } from './TelaLobby';
import { TelaPeca } from './TelaPeca';
import { TelaResumo } from './TelaResumo';
import { useSalaOnline } from './useSalaOnline';
import { urlDaSala, baseParaEstaPagina } from '../net/conexao';
import { AVISAR_FECHAMENTO_MS, JANELA_DE_GRACA_MS } from '../net/tipos';

interface FluxoOnlineProps {
  sala: string;
  onVoltar: () => void;
}

/**
 * O fluxo, com o ALARME por cima de tudo (PR 3.4.1).
 *
 * 🔴 O banner fica AQUI, fora do conteúdo, e não dentro de cada tela — porque a
 * divergência pode acontecer em qualquer ponto (sorteios, peça, espera,
 * resumo) e o jogador precisa vê-la em todos. Pôr em cada tela seria repetir a
 * regra em seis lugares e esquecer num deles.
 */
export function FluxoOnline({ sala, onVoltar }: FluxoOnlineProps) {
  const online = useSalaOnline(sala);
  const [nome, setNome] = useState('');
  /**
   * 🗑️ **O `naCorrida` MORREU no PR 3.5.4, e com ele o limite que ele criava.**
   *
   * Era um `useState` local que guardava "o jogador clicou Ir pra corrida"
   * (PR 4/4) — e, por ser local, **o F5 no meio da corrida devolvia o jogador
   * ao resumo**. No campeonato isso deixaria de ser inconveniência e viraria
   * defeito: com N etapas, recarregar no meio da etapa 3 jogaria o jogador de
   * volta a uma tela que não sabe em que etapa ele está.
   *
   * 🔒 **A tela agora é DERIVADA DO SNAPSHOT** (`online.etapas` /
   * `online.etapaCorrente`), que é a mesma propriedade que faz as etapas
   * sobreviverem ao F5 desde o 3.5.3: o servidor publica as seeds abertas, o
   * cliente recompõe. Nada de estado local para perder.
   */
  return (
    <>
      <BannerDivergencia divergencia={online.cliente.divergencia} />
      <ConteudoOnline online={online} nome={nome} setNome={setNome} sala={sala} onVoltar={onVoltar} />
    </>
  );
}

/**
 * 🔴 O ALARME que o 3.4 passou a levantar (PR 3.4.1).
 *
 * Sem esta tela o detector é código morto do ponto de vista de quem joga: o
 * servidor acusa, o cliente registra, e o jogador segue vendo um resultado que
 * pode não ser o dos outros — que é exatamente o silêncio que a Fase 3 gastou
 * um PR inteiro pra acabar.
 *
 * **Não some.** Uma vez levantado, o alarme fica: o estado já divergiu e nada
 * no jogo o reconcilia. Fechar sozinho sugeriria que passou.
 *
 * O texto evita acusar alguém. O servidor não tem dataset e **não sabe quem
 * está certo** — `jogadores` é a minoria que atestou diferente, uma pista, não
 * um veredito. Dizer "fulano está errado" seria afirmar mais do que se sabe.
 *
 * 🔴 **O texto RAMIFICA por escopo (PR 4/4).** O detector cobre dois escopos
 * desde o PR 2/4 (`EscopoHash = 'draft' | 'corrida'`), e o servidor já
 * carregava `escopo` até aqui — mas o texto dizia "o draft" nos dois casos.
 * Divergir na corrida e ler "não dá pra confiar que o draft é o mesmo" manda o
 * jogador conferir a coisa errada: o draft pode estar íntegro e a corrida não.
 */
function BannerDivergencia({
  divergencia,
}: {
  divergencia: { escopo: string; ancora: number; jogadores: string[] } | null;
}) {
  if (divergencia === null) return null;
  const oQueDivergiu =
    divergencia.escopo === 'corrida'
      ? 'não dá mais pra confiar que a corrida é a mesma em todas as telas.'
      : 'não dá mais pra confiar que o draft é o mesmo em todas as telas.';
  return (
    <div className="fluxo-online__divergencia" role="alert">
      <strong>⚠️ As máquinas divergiram.</strong>{' '}
      <span>
        O resultado que você está vendo pode não ser o mesmo que os outros jogadores estão vendo. A
        partida continua, mas {oQueDivergiu}
      </span>
    </div>
  );
}

function ConteudoOnline({
  online,
  nome,
  setNome,
  sala,
  onVoltar,
}: {
  online: ReturnType<typeof useSalaOnline>;
  nome: string;
  setNome: (nome: string) => void;
  sala: string;
  onVoltar: () => void;
}) {
  const { cliente, euSou, minhaVez, souAusente } = online;
  const publica = cliente.sala;
  const draft = cliente.draft;

  // A sala acabou (janela de graça vencida, ou todo mundo saiu) ou o código não
  // existe. Mensagem clara, não "reconectando…" para sempre.
  if (online.encerrada || online.inexistente) {
    return (
      <Espera
        titulo={online.encerrada ? 'Esta sala foi encerrada' : 'Sala não encontrada'}
        erro={null}
        onVoltar={onVoltar}
      >
        <p>
          {online.encerrada
            ? 'A partida terminou e a sala foi fechada. O código foi liberado.'
            : 'Esta sala não existe ou já encerrou. Confira o código com quem te chamou.'}
        </p>
      </Espera>
    );
  }

  // Ainda no lobby (ou sem estado nenhum): o único caminho de entrada.
  if (publica === null || publica.fase === 'aberta') {
    return (
      <TelaLobby
        sala={publica}
        euSou={euSou}
        estadoConexao={online.estadoConexao}
        erro={online.ultimoErro}
        nome={nome}
        onNomeChange={setNome}
        onEntrar={() => online.entrar(nome)}
        onPronto={online.definirPronto}
        onIniciar={online.iniciar}
        onSair={() => {
          online.sair();
          onVoltar();
        }}
        onVoltar={onVoltar}
        urlDaSala={urlDaSala(
          baseParaEstaPagina(window.location, import.meta.env?.VITE_WS_BASE),
          sala,
        )}
      />
    );
  }

  // Sala iniciada mas eu não sou jogador dela, ou o draft ainda não foi
  // reconstruído.
  //
  // 🔴 ESTE RAMO ERA UM BECO SEM SAÍDA (achado da revisão). Basta digitar o
  // nome de uma sala JÁ INICIADA — erro de digitação, amigo mandando o nome
  // depois do começo, token perdido em outro navegador — para o servidor nunca
  // mandar `voce-e`: `euSou` fica `null` para sempre e a tela virava um
  // parágrafo sem botão nenhum. Pior, o erro que explicava tudo
  // (`sala-iniciada`) não era mostrado. Agora todo ramo tem saída e motivo.
  if (draft === null || euSou === null) {
    const souEspectador = publica.fase === 'iniciada' && euSou === null;
    return (
      <Espera
        titulo={souEspectador ? 'Esta sala já começou' : 'Preparando o draft…'}
        erro={online.ultimoErro}
        onVoltar={onVoltar}
      >
        {souEspectador && (
          <p>
            O draft desta sala já está em andamento e o grupo está fechado. Volte e entre numa sala
            com outro nome.
          </p>
        )}
      </Espera>
    );
  }

  const escolher = (escolha: EscolhaDraft) => online.escolher(escolha);

  if (draft.fase === 'concluido') {
    const etapa = online.etapas[online.etapaCorrente];

    // 🏆 O CAMPEONATO ONLINE (PR 3.5.4) — o caminho normal de toda sala criada
    // por um worker 3.5.1+.
    //
    // `{ modo: 'pronta', corrida: etapa }` passa a etapa JÁ COMPUTADA por
    // `etapasDaSala` — a MESMA referência que alimentou o hash em
    // `useSalaOnline` (ver `alvoDoAtestado`). Esta tela não prepara corrida
    // nenhuma: duas trilhas, cada lado correto isoladamente e a composição
    // errada, é a classe de bug do PR 8.4, e `npm test` não pegaria.
    if (etapa !== undefined) {
      const k = online.etapaCorrente;
      const total = publica.nEtapas;
      const ehUltima = k + 1 >= total;
      return (
        <>
          <AvisoDeFechamento concluidaEm={publica.concluidaEm} />
          <FluxoCorrida
            // 🔒 **A `key` NÃO É DETALHE — é o que faz a etapa nova ser uma
            // corrida nova.** Sem ela o `useState` de `useCorrida` (que só
            // roda o inicializador na MONTAGEM) mantém a corrida da etapa
            // anterior, e o jogador corre a etapa 1 cinco vezes enquanto a
            // tabela pontua as cinco etapas certas — a classe de bug do 8.4,
            // com a agravante de que **nada acusa**: o hash sai correto (ele
            // vem de `etapas[k]`, não da tela) e a cerca do contrato conta
            // sítios textuais, não remontagem. Lição literal de
            // `FluxoCampeonato.tsx`, onde a mesma linha existe pelo mesmo
            // motivo. **O portão desta linha é o VISUAL, não um teste.**
            key={`etapa-${k}`}
            state={draft}
            fonte={{ modo: 'pronta', corrida: etapa }}
            onChegouAoResultado={online.atestarFimDaCorrida}
            rotuloReiniciar="← Voltar ao início"
            onReiniciar={onVoltar}
            extraResultado={
              <>
                {ehUltima && <PodioOnline state={draft} classificacao={online.classificacao} />}
                <PainelCampeonato
                  state={draft}
                  classificacao={online.classificacao}
                  // `k + 1` = `etapas.length`: a tabela mostrada no fim da
                  // corrida INCLUI a etapa que o jogador acabou de ver.
                  corridasFeitas={k + 1}
                  totalCorridas={total}
                  concluido={ehUltima}
                  // 🔒 **`null` de propósito: no online quem avança é a
                  // BARREIRA do servidor, nunca um botão.** Quando a etapa
                  // seguinte abre, o snapshot cresce, `etapaCorrente` anda e a
                  // `key` acima remonta a tela sozinha. Um botão aqui
                  // prometeria um controle que o jogador não tem.
                  onProximaCorrida={null}
                  nomeProximaPista={
                    ehUltima ? null : nomeDaPista(online.calendario[k + 1]?.pistaId)
                  }
                />
                {/* O calendário sai do hook já anotado, com `etapasVistas =
                    etapas.length` — correto AQUI porque `extraResultado` só
                    renderiza na fase de resultado. Ver `calendarioDaSala`. */}
                <PainelCalendario state={draft} etapas={online.calendario} />
              </>
            }
          />
        </>
      );
    }

    // Draft concluído e nenhuma etapa aberta ainda: o servidor publica o draft
    // e as seeds em mensagens diferentes, então existe uma janela curta sem
    // etapa. Mostrar o resumo do draft é a resposta honesta — e **sem botão de
    // corrida**, porque não há destino: quando a etapa abrir, o ramo acima
    // assume sozinho, sem clique nenhum.
    return (
      <>
        <AvisoDeFechamento concluidaEm={publica.concluidaEm} />
        <TelaResumo
          state={draft}
          visibilidade="craque"
          onReiniciar={onVoltar}
          mostrarIrParaCorrida={false}
          rotuloReiniciar="← Voltar ao início"
        />
      </>
    );
  }

  // 🔒 Ausente vê a partida, não joga. Sem esta ramificação a tela mostraria o
  // jogador como ativo e todo clique voltaria `jogador-ausente` do servidor,
  // sem explicação — exigência registrada na revisão do 3.2.1.
  if (souAusente) {
    return (
      <Espera titulo="Você perdeu a vez por inatividade" erro={null} onVoltar={onVoltar}>
        <p>
          O draft seguiu sem você e suas escolhas estão sendo feitas automaticamente. Dá pra
          acompanhar até o fim.
        </p>
        <PainelDeEspera fase={draft.fase} />
      </Espera>
    );
  }

  if (!minhaVez) {
    return (
      <Espera titulo="Esperando os outros" erro={online.ultimoErro} onVoltar={onVoltar}>
        <PainelDeEspera fase={draft.fase} />
      </Espera>
    );
  }

  if (draft.fase === 'sorteios') {
    return (
      <TelaDraft
        state={draft}
        jogadorId={euSou}
        visibilidade="craque"
        erro={online.ultimoErro}
        onEscolher={escolher}
      />
    );
  }

  return (
    <TelaPeca
      state={draft}
      jogadorId={euSou}
      visibilidade="craque"
      erro={online.ultimoErro}
      onEscolher={escolher}
    />
  );
}

/**
 * 🏆 O pódio do campeonato online (PR 3.5.4) — o desfecho, no fim da ÚLTIMA
 * etapa.
 *
 * Mesma marcação e mesmas classes do pódio offline (`FluxoCampeonato`),
 * inclusive a ordem visual **2º-1º-3º**, que é a do pódio real: o campeão ao
 * centro e mais alto, com a altura vindo da classe no CSS. Reusar a marcação é
 * o ponto — dois pódios com CSS próprio divergiriam no primeiro ajuste de
 * estilo.
 *
 * ⚠️ **Aparece dentro do `extraResultado` da última etapa, não numa tela
 * própria.** No offline há uma tela de fim de campeonato porque lá o cursor é
 * do jogador; aqui trocar a tela quando `concluidaEm` chega **arrancaria da
 * corrida** quem ainda estivesse assistindo — a barreira pode fechar por
 * timeout enquanto alguém vê o replay.
 */
function PodioOnline({
  state,
  classificacao,
}: {
  state: DraftState;
  classificacao: LinhaClassificacao[];
}) {
  const podio = classificacao.slice(0, 3);
  return (
    <div className="tela-fim-campeonato">
      <h2>🏆 Fim do campeonato</h2>
      <ol className="podio">
        {[podio[1], podio[0], podio[2]].map((linha, posicaoVisual) =>
          linha === undefined ? null : (
            <li
              key={linha.jogadorId}
              className={`podio__lugar podio__lugar--${[2, 1, 3][posicaoVisual]}`}
            >
              <span className="podio__medalha">{['🥈', '🥇', '🥉'][posicaoVisual]}</span>
              <span className="podio__nome">{nomeDoJogador(state, linha.jogadorId)}</span>
              <span className="podio__pontos">{linha.pontos} pts</span>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

/**
 * Avisa que a sala vai fechar — **só no último minuto** (decisão do dev).
 *
 * Durante os 9 primeiros minutos a tela de resultado fica limpa: o pessoal está
 * comentando o draft, e um relógio correndo o tempo todo cria pressão sem
 * necessidade. No último minuto o aviso aparece, a tempo de printar.
 */
function AvisoDeFechamento({ concluidaEm }: { concluidaEm: number | null }) {
  const [restanteMs, setRestanteMs] = useState<number | null>(null);

  useEffect(() => {
    if (concluidaEm === null) return;
    const recalcular = () => setRestanteMs(concluidaEm + JANELA_DE_GRACA_MS - Date.now());
    recalcular();
    const id = setInterval(recalcular, 1000);
    return () => clearInterval(id);
  }, [concluidaEm]);

  if (restanteMs === null || restanteMs > AVISAR_FECHAMENTO_MS || restanteMs <= 0) return null;
  const segundos = Math.max(0, Math.ceil(restanteMs / 1000));
  const mm = Math.floor(segundos / 60);
  const ss = String(segundos % 60).padStart(2, '0');
  return (
    <p className="fluxo-online__fechando">
      ⏳ esta sala fecha em {mm}:{ss}
    </p>
  );
}

/**
 * Tela de espera com SAÍDA. Toda tela do online precisa de uma: o jogador pode
 * cair num estado que não escolheu (sala já iniciada, vez de outro, ausência),
 * e sem botão a única saída é F5 — que ninguém adivinha.
 */
function Espera({
  titulo,
  erro,
  onVoltar,
  children,
}: {
  titulo: string;
  erro: string | null;
  onVoltar: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="fluxo-online__espera">
      <h2>{titulo}</h2>
      {children}
      {erro !== null && <p className="tela-lobby__erro">⚠️ {erro}</p>}
      <button type="button" onClick={onVoltar}>
        ← Voltar ao início
      </button>
    </div>
  );
}

function PainelDeEspera({ fase }: { fase: string }) {
  return (
    <p className="fluxo-online__fase">
      {fase === 'sorteios'
        ? 'Fase de sorteios — cada um escolhe no seu ritmo.'
        : 'Fase da peça icônica — um de cada vez, na ordem sorteada.'}
    </p>
  );
}
