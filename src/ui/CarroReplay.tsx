/**
 * Carro do replay em SVG (PR 2a). O desenho mora uma vez só em `<defs>` e cada
 * carro é um `<use>`: são 22 elementos por frame, não 176. Cor e contorno vêm por
 * herança do `<g>` de fora, que é o que separa bot de humano (`estilos.css`).
 */

import { memo } from 'react';
import { CORPO_DO_CARRO, RAIO_HALO, RODAS_DO_CARRO, asasDoCarro } from './carro-replay';

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

export function CarroNaPista({ transform, classes, contorno, halo, titulo }: CarroNaPistaProps) {
  return (
    <g className={classes} transform={transform} strokeWidth={contorno}>
      {halo && <circle className="tracado-svg__halo" r={RAIO_HALO} />}
      <use href="#carro-c" />
      <title>{titulo}</title>
    </g>
  );
}
