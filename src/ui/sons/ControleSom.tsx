/**
 * Mudo e volume (PR 3b), salvos no aparelho. A lógica está em `preferencia-som.ts`; aqui só há
 * estado de React e o efeito no mestre de `audio.ts`. Sem Web Audio, o controle aparece desabilitado
 * e diz por quê, em vez de sumir.
 */

import { useEffect, useState } from 'react';
import { storageDoNavegador } from '../storage-app';
import { motorDeAudio } from './audio';
import {
  ganhoMestre,
  lerPreferenciaSom,
  salvarPreferenciaSom,
  type PreferenciaSom,
} from './preferencia-som';

export function ControleSom() {
  // Inicializa LENDO o armazenamento, como `BotaoTema`: corrigir num efeito tocaria um quadro no
  // volume errado.
  const [pref, setPref] = useState<PreferenciaSom>(() => lerPreferenciaSom(storageDoNavegador()));
  const disponivel = motorDeAudio() !== null;

  useEffect(() => {
    motorDeAudio()?.definirVolume(ganhoMestre(pref));
  }, [pref]);

  const mudar = (proxima: PreferenciaSom) => {
    salvarPreferenciaSom(proxima, storageDoNavegador());
    setPref(proxima);
  };

  const rotulo = !disponivel
    ? 'Som indisponível neste aparelho'
    : pref.mudo
      ? 'Som: mudo'
      : 'Som: ligado';
  return (
    <div className="controle-som" role="group" aria-label="Som">
      <button
        type="button"
        className="botao-velocidade controle-som__botao"
        aria-pressed={disponivel && !pref.mudo}
        aria-label={rotulo}
        title={rotulo}
        disabled={!disponivel}
        onClick={() => mudar({ ...pref, mudo: !pref.mudo })}
      >
        <span aria-hidden="true">{pref.mudo || !disponivel ? '🔇' : '🔊'}</span> Som
      </button>
      <input
        type="range"
        className="controle-som__volume"
        min={0}
        max={100}
        step={5}
        value={Math.round(pref.volume * 100)}
        aria-label="Volume"
        aria-valuetext={`${Math.round(pref.volume * 100)}%`}
        disabled={!disponivel || pref.mudo}
        onChange={(e) => mudar({ ...pref, volume: Number(e.currentTarget.value) / 100 })}
      />
    </div>
  );
}
