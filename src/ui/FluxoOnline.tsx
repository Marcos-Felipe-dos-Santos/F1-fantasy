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

import { useState } from 'react';
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
        urlDaSala={urlDaSala(baseParaEstaPagina(window.location), sala)}
      />
    );
  }

  // Sala iniciada mas o draft local ainda não foi reconstruído (primeiro
  // snapshot chegando, ou dataset carregando).
  if (draft === null || euSou === null) {
    return (
      <div className="fluxo-online__espera">
        <p>Preparando o draft…</p>
      </div>
    );
  }

  const escolher = (escolha: EscolhaDraft) => online.escolher(escolha);

  if (draft.fase === 'concluido') {
    return (
      <TelaResumo
        state={draft}
        visibilidade="craque"
        onReiniciar={onVoltar}
        onIrParaCorrida={onVoltar}
      />
    );
  }

  // 🔒 Ausente vê a partida, não joga. Sem esta ramificação a tela mostraria o
  // jogador como ativo e todo clique voltaria `jogador-ausente` do servidor,
  // sem explicação — exigência registrada na revisão do 3.2.1.
  if (souAusente) {
    return (
      <div className="fluxo-online__espera">
        <h2>Você perdeu a vez por inatividade</h2>
        <p>
          O draft seguiu sem você e suas escolhas estão sendo feitas automaticamente. Dá pra
          acompanhar até o fim.
        </p>
        <PainelDeEspera fase={draft.fase} />
      </div>
    );
  }

  if (!minhaVez) {
    return (
      <div className="fluxo-online__espera">
        <h2>Esperando os outros</h2>
        <PainelDeEspera fase={draft.fase} />
      </div>
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

function PainelDeEspera({ fase }: { fase: string }) {
  return (
    <p className="fluxo-online__fase">
      {fase === 'sorteios'
        ? 'Fase de sorteios — cada um escolhe no seu ritmo.'
        : 'Fase da peça icônica — um de cada vez, na ordem sorteada.'}
    </p>
  );
}
