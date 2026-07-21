/**
 * Tela de handoff do modo Local (PR 2.1b, hotseat): NEUTRA por design —
 * mostra só o nome de quem deve pegar o aparelho e a fase corrente ("Draft —
 * rodadas 1-5" ou "Escolha da peça"). Nenhum dado de jogo (sorteio, peça,
 * loadout, nota) entra aqui — é a barreira anti-vazamento entre o turno de
 * um humano e o do próximo (ver `fluxo-local.ts`).
 */

interface TelaHandoffProps {
  nome: string;
  fase: 'sorteios' | 'peca';
  onConfirmar: () => void;
}

export function TelaHandoff({ nome, fase, onConfirmar }: TelaHandoffProps) {
  const rotuloFase = fase === 'sorteios' ? 'Draft — rodadas 1-5' : 'Escolha da peça';

  return (
    <div className="tela-handoff">
      <p className="tela-handoff__fase">{rotuloFase}</p>
      <h2>Passe o aparelho pra {nome}</h2>
      <button type="button" className="botao-primario" onClick={onConfirmar}>
        Sou {nome} — começar
      </button>
    </div>
  );
}
