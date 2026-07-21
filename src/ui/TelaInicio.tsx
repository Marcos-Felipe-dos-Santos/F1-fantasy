/**
 * Tela de início (PR 1.7a: Single; PR 2.1b: seletor de modo Single/Local):
 * seed, dificuldade, modo de jogo (e nomes dos humanos no Local) e botão pra
 * começar o draft. Só monta a jogada — quem cria o estado é `useDraft`.
 */

import { useState, type FormEvent } from 'react';
import type { Dificuldade } from '../engine/types';
import { ID_HUMANO, type HumanoConfig } from './fluxo-draft';

/** Modo de jogo escolhido na tela de início (não é conceito da engine — só organiza esta tela). */
type ModoJogo = 'single' | 'local';

const MIN_HUMANOS_LOCAL = 2;
const MAX_HUMANOS_LOCAL = 4;

interface TelaInicioProps {
  onComecar: (seedTexto: string, dificuldade: Dificuldade, humanos: HumanoConfig[]) => void;
}

export function TelaInicio({ onComecar }: TelaInicioProps) {
  const [seedTexto, setSeedTexto] = useState('');
  const [dificuldade, setDificuldade] = useState<Dificuldade>('facil');
  const [modo, setModo] = useState<ModoJogo>('single');
  const [qtdHumanos, setQtdHumanos] = useState(2);
  const [nomes, setNomes] = useState<string[]>(['', '', '', '']);

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    if (modo === 'single') {
      onComecar(seedTexto, dificuldade, [{ id: ID_HUMANO, nome: 'Você' }]);
      return;
    }
    const humanos: HumanoConfig[] = Array.from({ length: qtdHumanos }, (_, i) => ({
      id: `humano-${i + 1}`,
      nome: nomes[i].trim() || `Jogador ${i + 1}`,
    }));
    onComecar(seedTexto, dificuldade, humanos);
  }

  function handleNomeChange(indice: number, valor: string) {
    setNomes((atual) => atual.map((nome, i) => (i === indice ? valor : nome)));
  }

  return (
    <div className="tela-inicio">
      <h1>F1 Fantasy</h1>
      <p className="tela-inicio__subtitulo">
        Draft de equipe/ano + peça icônica — Modo Craque (notas visíveis)
      </p>
      <form className="form-inicio" onSubmit={handleSubmit}>
        <label className="form-inicio__campo">
          Seed
          <input
            type="text"
            value={seedTexto}
            onChange={(evento) => setSeedTexto(evento.target.value)}
            placeholder="ex.: senna1988 ou 42"
          />
        </label>
        <label className="form-inicio__campo">
          Dificuldade
          <select
            value={dificuldade}
            onChange={(evento) => setDificuldade(evento.target.value as Dificuldade)}
          >
            <option value="facil">Fácil</option>
            <option value="dificil">Difícil</option>
          </select>
        </label>
        <label className="form-inicio__campo">
          Modo
          <select value={modo} onChange={(evento) => setModo(evento.target.value as ModoJogo)}>
            <option value="single">Single (você + 21 bots)</option>
            <option value="local">Local (2-4 jogadores + bots)</option>
          </select>
        </label>

        {modo === 'local' && (
          <fieldset className="form-inicio__local">
            <label className="form-inicio__campo">
              Número de jogadores
              <select
                value={qtdHumanos}
                onChange={(evento) => setQtdHumanos(Number(evento.target.value))}
              >
                {Array.from(
                  { length: MAX_HUMANOS_LOCAL - MIN_HUMANOS_LOCAL + 1 },
                  (_, i) => MIN_HUMANOS_LOCAL + i,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            {Array.from({ length: qtdHumanos }, (_, i) => (
              <label className="form-inicio__campo" key={i}>
                {`Nome do jogador ${i + 1}`}
                <input
                  type="text"
                  value={nomes[i]}
                  onChange={(evento) => handleNomeChange(i, evento.target.value)}
                  placeholder={`Jogador ${i + 1}`}
                />
              </label>
            ))}
          </fieldset>
        )}

        <button type="submit" className="botao-primario">
          Começar draft
        </button>
      </form>
    </div>
  );
}
