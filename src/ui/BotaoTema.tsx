/**
 * Botão de tema (PR 7.8). Cicla sistema -> escuro -> claro -> sistema e
 * persiste a escolha. Toda a lógica está em `tema.ts` (pura, testada); aqui
 * só há estado de React e o efeito no `<html>`.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  aplicarTema,
  lerPreferencia,
  type PreferenciaTema,
  proximaPreferencia,
  rotuloTema,
  salvarPreferencia,
} from './tema';

const ICONE: Record<PreferenciaTema, string> = {
  sistema: '◐',
  dark: '●',
  light: '○',
};

export function BotaoTema() {
  // Inicializa LENDO o armazenamento, não com um default: começar em
  // 'sistema' e corrigir num efeito faria o tema salvo piscar no primeiro
  // frame de quem escolheu o contrário do SO.
  const [pref, setPref] = useState<PreferenciaTema>(() =>
    typeof window === 'undefined' ? 'sistema' : lerPreferencia(window.localStorage),
  );

  useEffect(() => {
    aplicarTema(pref, document.documentElement);
  }, [pref]);

  const alternar = useCallback(() => {
    setPref((atual) => {
      const proxima = proximaPreferencia(atual);
      salvarPreferencia(proxima, window.localStorage);
      return proxima;
    });
  }, []);

  return (
    <button type="button" className="botao-tema" onClick={alternar} aria-label={rotuloTema(pref)} title={rotuloTema(pref)}>
      <span aria-hidden="true">{ICONE[pref]}</span>
    </button>
  );
}
