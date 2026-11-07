import type { Loadout } from '../engine/types';
import { dataset } from './dataset-app';

/** Inspeção após a corrida: apenas identidades e origens, sem revelar notas. */
export function DetalhesCarroResultado({ loadout, nome }: { loadout?: Loadout; nome: string }) {
  if (!loadout) return <>{nome}</>;
  const piloto = dataset.pilotosById.get(loadout.pilotoId);
  const chassi = dataset.chassisById.get(loadout.chassiId);
  const motor = dataset.motoresById.get(loadout.motorId);
  const estrategista = dataset.estrategistasById.get(loadout.estrategistaId);
  const pit = dataset.pitsById.get(loadout.pitId);
  const peca = dataset.pecasById.get(loadout.pecaId);
  const origem = (item: { equipe: string; ano: number } | undefined) => item ? `${item.equipe} ${item.ano}` : 'Não disponível';
  const itens = [
    ['Piloto', piloto ? `${piloto.nome} · ${origem(piloto)}` : 'Não disponível'],
    ['Chassi', origem(chassi)], ['Motor', origem(motor)],
    ['Estrategista', estrategista ? `${estrategista.nome} · ${origem(estrategista)}` : 'Não disponível'],
    ['Pit', origem(pit)], ['Peça icônica', peca?.nome ?? 'Não disponível'],
  ];
  return <details className="detalhes-carro">
    <summary>{nome}<small>Ver carro</small></summary>
    <dl>{itens.map(([rotulo, valor]) => <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>)}</dl>
  </details>;
}
