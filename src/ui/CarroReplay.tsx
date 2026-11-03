/**
 * Carro do replay em SVG (PR 2a). O desenho mora uma vez só em `<defs>` e cada
 * carro é um `<use>`: são 22 elementos por frame, não 176. Cor e contorno vêm por
 * herança do `<g>` de fora, que é o que separa bot de humano (`estilos.css`).
 */

import { memo } from 'react';
import {
  CORPO_DO_CARRO,
  CRESCIMENTO_EFEITO,
  NUVENS_DO_EFEITO,
  RAIO_HALO,
  RODAS_DO_CARRO,
  SPRAY_POR_NIVEL,
  asasDoCarro,
  type NivelSpray,
} from './carro-replay';
import type { EfeitoNoReplay } from './incidentes-replay';

export const DefsDoCarro = memo(function DefsDoCarro({ estreita }: { estreita: boolean }) {
  const { dianteira, traseira } = asasDoCarro(estreita);
  return (
    <defs>
      <g id="carro-c">
        {RODAS_DO_CARRO.map((roda) => (
          <rect key={`${roda.x}${roda.y}`} className="carro-c__roda" rx={1} {...roda} />
        ))}
        <rect className="carro-c__asa" x={dianteira.x} y={dianteira.y} width={dianteira.width} height={dianteira.height} rx={1} />
        <rect className="carro-c__asa" x={traseira.x} y={traseira.y} width={traseira.width} height={traseira.height} rx={1} />
        <path d={CORPO_DO_CARRO} />
        <ellipse className="carro-c__cockpit" cx={-1} cy={0} rx={3.4} ry={2} />
      </g>
      <linearGradient id="spray-gradiente" x1="1" x2="0" y1="0" y2="0">
        <stop offset="0" stopColor="var(--carro-halo)" />
        <stop offset="1" stopColor="var(--carro-halo)" stopOpacity="0" />
      </linearGradient>
      {Object.entries(SPRAY_POR_NIVEL).map(([nivel, { comprimento, meiaLargura, opacidade }]) => (
        <path
          key={nivel}
          id={`spray-${nivel}`}
          d={`M-13 -6 L${-13 - comprimento} ${-meiaLargura} L${-13 - comprimento} ${meiaLargura} L-13 6 Z`}
          fill="url(#spray-gradiente)"
          fillOpacity={opacidade}
        />
      ))}
    </defs>
  );
});

interface CarroNaPistaProps {
  transform: string;
  classes: string;
  contorno: number;
  halo: boolean;
  titulo: string;
}

export function SprayDoCarro({ transform, nivel }: { transform: string; nivel: Exclude<NivelSpray, 0> }) {
  return <use className="tracado-svg__spray" href={`#spray-${nivel}`} transform={transform} />;
}

/** Três nuvens que crescem e somem: a idade vem do tempo do replay, sem animação de CSS. */
export function EfeitoDeIncidente({ tipo, ponto, rumo, idade }: Omit<EfeitoNoReplay, 'chave'>) {
  const cresce = 1 + idade * CRESCIMENTO_EFEITO;
  return (
    <g
      className={`tracado-svg__efeito tracado-svg__efeito--${tipo}`}
      transform={`translate(${ponto.x.toFixed(2)} ${ponto.y.toFixed(2)}) rotate(${rumo.toFixed(1)})`}
      opacity={(1 - idade).toFixed(2)}
    >
      {NUVENS_DO_EFEITO.map(({ x, y, r }) => (
        <circle key={`${x}${y}`} cx={(x * cresce).toFixed(1)} cy={(y * cresce).toFixed(1)} r={(r * cresce).toFixed(1)} />
      ))}
    </g>
  );
}

export function CarroNaPista({ transform, classes, contorno, halo, titulo }: CarroNaPistaProps) {
  return (
    <g className={classes} transform={transform} strokeWidth={contorno}>
      {halo && <circle className="tracado-svg__halo" r={RAIO_HALO} />}
      <use href="#carro-c" />
      <title>{titulo}</title>
    </g>
  );
}
