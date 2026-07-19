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
import { ID_HUMANO } from './fluxo-draft';

interface TelaPecaProps {
  state: DraftState;
  erro: string | null;
  onEscolher: (escolha: EscolhaDraft) => void;
}

export function TelaPeca({ state, erro, onEscolher }: TelaPecaProps) {
  const revelacao = revelarRodada(state, ID_HUMANO);

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
