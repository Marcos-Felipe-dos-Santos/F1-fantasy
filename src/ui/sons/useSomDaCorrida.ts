/**
 * O som da corrida na tela (PR 3b): casca fina de React sobre `ControladorDeSom` (o que toca) e
 * `audio.ts` (o Web Audio). Nenhuma regra mora aqui.
 *
 * Vive em `TelaCorrida`, chamado antes do retorno da fase 'grid', e recebe as posições que a tela já
 * calcula: calcular de novo dobraria o custo por quadro que o PR mede. A limpeza cala os sons,
 * deixando só a torcida concluir o fade quando o último carro já chegou. O callback devolvido
 * interrompe tudo antes do "Acelerar", inclusive na espera final.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Pista, ResultadoCorrida } from '../../engine/types';
import type { VelocidadeReplay } from '../fluxo-corrida';
import { motorDeAudio } from './audio';
import { ControladorDeSom, corridaDoSom, type CarroDoSom } from './controlador';

export interface EntradaDoSom {
  resultado: ResultadoCorrida;
  pista: Pista;
  /** Ids dos humanos da corrida. */
  humanos: readonly string[];
  /** Convenção de `TelaCorrida`: `undefined` no Single, `null` para o espectador online. */
  jogadorLocalId: string | null | undefined;
  fase: 'grid' | 'replay';
  tempoSimMs: number;
  velocidade: VelocidadeReplay;
  escala: number;
  carros: readonly CarroDoSom[];
}

export function useSomDaCorrida({
  resultado,
  pista,
  humanos,
  jogadorLocalId,
  fase,
  tempoSimMs,
  velocidade,
  escala,
  carros,
}: EntradaDoSom): () => void {
  // A lista de humanos chega nova a cada render; o que importa é o conteúdo.
  const chaveHumanos = humanos.join('\u0000');
  // `velRef` (o replay inteiro) é calculado aqui, uma vez, ainda no grid.
  const corrida = useMemo(
    () =>
      corridaDoSom(
        resultado,
        pista,
        chaveHumanos === '' ? [] : chaveHumanos.split('\u0000'),
        jogadorLocalId,
      ),
    [resultado, pista, chaveHumanos, jogadorLocalId],
  );
  const controlador = useRef<ControladorDeSom | null>(null);
  const ultimoQuadro = useRef<number | null>(null);

  // Decodifica já no grid, para a largada não esperar o arquivo.
  useEffect(() => {
    void motorDeAudio()?.carregar();
  }, []);

  useEffect(() => {
    if (fase !== 'replay') return;
    const motor = motorDeAudio();
    if (motor === null) return;
    const c = new ControladorDeSom(motor.saida, corrida);
    controlador.current = c;
    ultimoQuadro.current = null;
    return () => {
      c.encerrar(true);
      if (controlador.current === c) controlador.current = null;
    };
  }, [fase, corrida]);

  // Um quadro do som por render do replay (o relógio de `useCorrida` renderiza a cada quadro).
  useEffect(() => {
    const c = controlador.current;
    if (c === null) return;
    const agora = performance.now();
    const deltaRealMs = ultimoQuadro.current === null ? 0 : agora - ultimoQuadro.current;
    ultimoQuadro.current = agora;
    c.quadro({ tSim: tempoSimMs, deltaRealMs, velocidade, escala, carros });
  });
  return () => controlador.current?.encerrar();
}
