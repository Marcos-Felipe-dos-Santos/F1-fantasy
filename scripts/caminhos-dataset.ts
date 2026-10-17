/** Caminhos únicos: o derivado real é publicado sem remapeamento de nomes. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

export const RAIZ = join(AQUI, '..');

export const DERIVED_DIR = join(AQUI, 'derived');

export const FATOS_AGREGADOS = join(DERIVED_DIR, 'fatos-agregados.json');

export const EQUIPE_ANOS_DERIVADO = join(DERIVED_DIR, 'equipe-anos.derivado.json');

export const DATA_DIR = join(RAIZ, 'src', 'data');

export const PUBLICADO_EQUIPE_ANOS = join(DATA_DIR, 'equipe-anos.json');

export const FIXTURE_DIR = join(RAIZ, 'src', 'fixtures', 'dataset-semente');

export const FIXTURE_EQUIPE_ANOS = join(FIXTURE_DIR, 'equipe-anos.json');

/** Apenas proveniência e migração reversa; não participa da publicação atual. */
export const TABELA_NOMES = join(AQUI, 'nomes-ficticios.json');
