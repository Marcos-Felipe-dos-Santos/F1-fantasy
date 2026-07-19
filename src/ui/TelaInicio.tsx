/**
 * Tela de início do modo Single (PR 1.7a): seed, dificuldade e botão pra
 * começar o draft. Só monta a jogada — quem cria o estado é `useDraft`.
 */

import { useState, type FormEvent } from 'react';
import type { Dificuldade } from '../engine/types';

interface TelaInicioProps {
  onComecar: (seedTexto: string, dificuldade: Dificuldade) => void;
}

export function TelaInicio({ onComecar }: TelaInicioProps) {
  const [seedTexto, setSeedTexto] = useState('');
  const [dificuldade, setDificuldade] = useState<Dificuldade>('facil');

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    onComecar(seedTexto, dificuldade);
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
        <button type="submit" className="botao-primario">
          Começar draft
        </button>
      </form>
    </div>
  );
}
