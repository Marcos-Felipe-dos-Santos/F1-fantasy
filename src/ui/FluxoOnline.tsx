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

import { useState, type ReactNode } from 'react';
import type { EscolhaDraft } from '../engine/types';
import { TelaDraft } from './TelaDraft';
import { TelaLobby } from './TelaLobby';
import { TelaPeca } from './TelaPeca';
import { TelaResumo } from './TelaResumo';
import { useSalaOnline } from './useSalaOnline';
import { urlDaSala, baseParaEstaPagina } from '../net/conexao';

interface FluxoOnlineProps {
  sala: string;
  onVoltar: () => void;
}

export function FluxoOnline({ sala, onVoltar }: FluxoOnlineProps) {
  const online = useSalaOnline(sala);
  const [nome, setNome] = useState('');
  const { cliente, euSou, minhaVez, souAusente } = online;
  const publica = cliente.sala;
  const draft = cliente.draft;

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
    // `mostrarIrParaCorrida={false}`: a corrida online é PR posterior, e um
    // botão "Ir pra corrida →" que devolve o jogador à tela inicial sem
    // explicação é pior que botão nenhum (achado da revisão).
    return (
      <TelaResumo
        state={draft}
        visibilidade="craque"
        onReiniciar={onVoltar}
        onIrParaCorrida={onVoltar}
        mostrarIrParaCorrida={false}
        rotuloReiniciar="← Voltar ao início"
      />
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
