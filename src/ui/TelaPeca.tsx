/**
 * Tela da rodada 6 do draft (peça icônica, §7). Se `revelarRodada` indicar
 * que não é a vez do humano, mostra estado de espera — na prática o hook já
 * resolveu todos os bots antes de devolver o controle à UI, então esse ramo é
 * só uma rede de segurança defensiva.
 */

import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { CardPeca } from './componentes';
import { dataset } from './dataset-app';

interface TelaPecaProps {
  state: DraftState;
  /** Jogador que está fazendo a escolha nesta tela — quem tem o aparelho agora (roteamento em `App.tsx`/`fluxo-local.ts`, PR 2.1b). */
  jogadorId: string;
  /** Nome pra "Vez de {nome}" (modo Local, 2+ humanos); `undefined` omite o subtítulo (Single). */
  vezDe?: string;
  erro: string | null;
  onEscolher: (escolha: EscolhaDraft) => void;
}

export function TelaPeca({ state, jogadorId, vezDe, erro, onEscolher }: TelaPecaProps) {
  const revelacao = revelarRodada(state, jogadorId);

  if (revelacao.fase !== 'peca') {
    // Fora do escopo desta tela — App só a renderiza durante a fase peça.
    return null;
  }

  if (!revelacao.suaVez || !revelacao.pecasReveladas) {
    return (
      <div className="tela-peca">
        <h2>Rodada 6 — peça icônica</h2>
        <p>Aguardando outros jogadores...</p>
      </div>
    );
  }

  return (
    <div className="tela-peca">
      {vezDe && <p className="tela-peca__vez">Vez de {vezDe}</p>}
      <h2>Rodada 6 — escolha sua peça icônica</h2>
      {erro && <p className="erro">{erro}</p>}
      <div className="grid-cards">
        {revelacao.pecasReveladas.map((pecaId) => {
          const peca = dataset.pecasById.get(pecaId);
          if (!peca) return null;
          return (
            <CardPeca key={pecaId} peca={peca} onClick={() => onEscolher({ tipo: 'peca', pecaId })} />
          );
        })}
      </div>
    </div>
  );
}
