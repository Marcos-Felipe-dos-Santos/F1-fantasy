/**
 * Tela de início (PR 1.7a: Single; PR 2.1b: seletor de modo Single/Local):
 * seed, dificuldade, modo de jogo (e nomes dos humanos no Local) e botão pra
 * começar o draft. Só monta a jogada — quem cria o estado é `useDraft`.
 */

import { useState, type FormEvent } from 'react';
import type { Dificuldade } from '../engine/types';
import { ID_HUMANO, seedEfetivaTexto, type HumanoConfig } from './fluxo-draft';
import type { Visibilidade } from './visibilidade';

/** Modo de jogo escolhido na tela de início (não é conceito da engine — só organiza esta tela). */
type ModoJogo = 'single' | 'local';

const MIN_HUMANOS_LOCAL = 2;
const MAX_HUMANOS_LOCAL = 4;

interface TelaInicioProps {
  onComecar: (
    seedTexto: string,
    dificuldade: Dificuldade,
    humanos: HumanoConfig[],
    visibilidade: Visibilidade,
  ) => void;
}

export function TelaInicio({ onComecar }: TelaInicioProps) {
  const [seedTexto, setSeedTexto] = useState('');
  // Seção "Usar seed específica" recolhida por default (PR 2.4): sem seed
  // digitada (recolhida ou campo vazio), cada partida sorteia uma seed nova
  // em vez de repetir sempre a mesma (seedFromString('')).
  const [seedEspecificaAberta, setSeedEspecificaAberta] = useState(false);
  const [dificuldade, setDificuldade] = useState<Dificuldade>('facil');
  const [modo, setModo] = useState<ModoJogo>('single');
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('craque');
  const [qtdHumanos, setQtdHumanos] = useState(2);
  const [nomes, setNomes] = useState<string[]>(['', '', '', '']);

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    // Decisão da seed extraída pra `seedEfetivaTexto` (pura, testada sem
    // DOM); aqui só se injeta a fonte de aleatoriedade permitida na UI
    // (`crypto.getRandomValues`, nunca `Math.random`).
    const seed = seedEfetivaTexto(
      seedEspecificaAberta,
      seedTexto,
      () => crypto.getRandomValues(new Uint32Array(1))[0],
    );
    if (modo === 'single') {
      onComecar(seed, dificuldade, [{ id: ID_HUMANO, nome: 'Você' }], visibilidade);
      return;
    }
    const humanos: HumanoConfig[] = Array.from({ length: qtdHumanos }, (_, i) => ({
      id: `humano-${i + 1}`,
      nome: nomes[i].trim() || `Jogador ${i + 1}`,
    }));
    onComecar(seed, dificuldade, humanos, visibilidade);
  }

  function handleNomeChange(indice: number, valor: string) {
    setNomes((atual) => atual.map((nome, i) => (i === indice ? valor : nome)));
  }

  return (
    <div className="tela-inicio">
      <h1>F1 Fantasy</h1>
      <p className="tela-inicio__subtitulo">Draft de equipe/ano + peça icônica</p>
      <form className="form-inicio" onSubmit={handleSubmit}>
        <details
          className="form-inicio__seed-especifica"
          open={seedEspecificaAberta}
          onToggle={(evento) => setSeedEspecificaAberta(evento.currentTarget.open)}
        >
          <summary>🎲 Usar seed específica</summary>
          <label className="form-inicio__campo">
            Seed
            <input
              type="text"
              value={seedTexto}
              onChange={(evento) => setSeedTexto(evento.target.value)}
              placeholder="ex.: senna1988 ou 42"
            />
          </label>
          <p className="form-inicio__seed-dica">
            Deixe em branco ou fechado pra sortear uma seed nova a cada partida. Preencha pra
            reproduzir uma partida específica.
          </p>
        </details>
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
        <label className="form-inicio__campo">
          Visibilidade
          <select
            value={visibilidade}
            onChange={(evento) => setVisibilidade(evento.target.value as Visibilidade)}
          >
            <option value="craque">Modo Craque 👁️ (notas visíveis)</option>
            <option value="cego">Modo Cego 🎲 (sem notas, sem dicas)</option>
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
