/** Publica o derivado real, sem recalcular notas ou alterar a ordem. */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EQUIPE_ANOS_DERIVADO, PUBLICADO_EQUIPE_ANOS } from './caminhos-dataset.ts';
import {
  serializarDerivado,
  verificarColisaoDeIds,
  type EquipeAnoDerivado,
} from './derivar-notas.ts';

export function main(): void {
  const derivado = JSON.parse(readFileSync(EQUIPE_ANOS_DERIVADO, 'utf8')) as EquipeAnoDerivado[];
  if (derivado.length !== 771) throw new Error('Publicação exige os 771 equipe/anos do derivado.');
  verificarColisaoDeIds(derivado);
  const tmp = `${PUBLICADO_EQUIPE_ANOS}.tmp`;
  mkdirSync(dirname(PUBLICADO_EQUIPE_ANOS), { recursive: true });
  writeFileSync(tmp, serializarDerivado(derivado));
  renameSync(tmp, PUBLICADO_EQUIPE_ANOS);
  console.log(`Publicado: ${derivado.length} equipe/anos com nomes originais.`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
