/** Referências históricas para lookup. DATA, DERIVADO e FIXTURE continuam
 * separados: a fixture tem notas congeladas diferentes do dataset vivo. */

export interface RefEquipeAno {
  readonly equipe: string;
  readonly ano: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//
// `scripts/balance.ts`, `scripts/alavancas.test.ts`, `scripts/balance.test.ts`.
// ═══════════════════════════════════════════════════════════════════════════

export const DATA_RED_BULL_2023: RefEquipeAno = { equipe: 'Red Bull', ano: 2023 };

export const DATA_WILLIAMS_2022: RefEquipeAno = { equipe: 'Williams', ano: 2022 };
export const DATA_ALFA_ROMEO_1951: RefEquipeAno = { equipe: 'Alfa Romeo', ano: 1951 };
export const DATA_RENAULT_2006: RefEquipeAno = { equipe: 'Renault', ano: 2006 };

// ═══════════════════════════════════════════════════════════════════════════
//
// `scripts/dataset-report.ts`, `scripts/derivar-notas.test.ts`. O derivado é a
// ENTRADA do pipeline e segue com nome REAL por desenho — ver
// `scripts/caminhos-dataset.ts`.
// ═══════════════════════════════════════════════════════════════════════════

export const DERIVADO_RED_BULL_2023: RefEquipeAno = { equipe: 'Red Bull', ano: 2023 };

export const DERIVADO_MINARDI_1986: RefEquipeAno = { equipe: 'Minardi', ano: 1986 };

// Spot-checks do `dataset-report.ts` — o caminho que degrada em SILÊNCIO.
export const DERIVADO_MCLAREN_1988: RefEquipeAno = { equipe: 'McLaren', ano: 1988 };
export const DERIVADO_FERRARI_2004: RefEquipeAno = { equipe: 'Ferrari', ano: 2004 };
export const DERIVADO_MINARDI_1995: RefEquipeAno = { equipe: 'Minardi', ano: 1995 };
export const DERIVADO_RED_BULL_2012: RefEquipeAno = { equipe: 'Red Bull', ano: 2012 };
export const DERIVADO_RED_BULL_2011: RefEquipeAno = { equipe: 'Red Bull', ano: 2011 };
export const DERIVADO_MERCEDES_2015: RefEquipeAno = { equipe: 'Mercedes', ano: 2015 };
export const DERIVADO_MCLAREN_2015: RefEquipeAno = { equipe: 'McLaren', ano: 2015 };

export const DERIVADO_SPOT_CHECKS_BUCKETS: readonly RefEquipeAno[] = [
  DERIVADO_RED_BULL_2011,
  DERIVADO_MERCEDES_2015,
  DERIVADO_MCLAREN_2015,
  DERIVADO_FERRARI_2004,
  DERIVADO_MCLAREN_1988,
];

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO `FIXTURE_*` — consumidores que leem `src/fixtures/dataset-semente/`.
//
// `src/engine/draft-test-fixtures.ts`, `src/engine/corrida.test.ts`.
// ═══════════════════════════════════════════════════════════════════════════

export const FIXTURE_RED_BULL_2023: RefEquipeAno = { equipe: 'Red Bull', ano: 2023 };

// Grid de 12 equipes distintas (`src/engine/corrida.test.ts:84-95`), para
// exercitar a pontuação FIA com mais de 10 carros.
export const FIXTURE_FERRARI_2023: RefEquipeAno = { equipe: 'Ferrari', ano: 2023 };
export const FIXTURE_MERCEDES_2023: RefEquipeAno = { equipe: 'Mercedes', ano: 2023 };
export const FIXTURE_MCLAREN_2023: RefEquipeAno = { equipe: 'McLaren', ano: 2023 };
export const FIXTURE_ASTON_MARTIN_2023: RefEquipeAno = { equipe: 'Aston Martin', ano: 2023 };
export const FIXTURE_WILLIAMS_2023: RefEquipeAno = { equipe: 'Williams', ano: 2023 };
export const FIXTURE_FERRARI_2004: RefEquipeAno = { equipe: 'Ferrari', ano: 2004 };
export const FIXTURE_WILLIAMS_2004: RefEquipeAno = { equipe: 'Williams', ano: 2004 };
export const FIXTURE_MCLAREN_2004: RefEquipeAno = { equipe: 'McLaren', ano: 2004 };
export const FIXTURE_RENAULT_2004: RefEquipeAno = { equipe: 'Renault', ano: 2004 };
export const FIXTURE_SAUBER_2004: RefEquipeAno = { equipe: 'Sauber', ano: 2004 };
export const FIXTURE_MINARDI_2004: RefEquipeAno = { equipe: 'Minardi', ano: 2004 };

export const FIXTURE_GRID_12_EQUIPES_DISTINTAS: readonly RefEquipeAno[] = [
  FIXTURE_RED_BULL_2023,
  FIXTURE_FERRARI_2023,
  FIXTURE_MERCEDES_2023,
  FIXTURE_MCLAREN_2023,
  FIXTURE_ASTON_MARTIN_2023,
  FIXTURE_WILLIAMS_2023,
  FIXTURE_FERRARI_2004,
  FIXTURE_WILLIAMS_2004,
  FIXTURE_MCLAREN_2004,
  FIXTURE_RENAULT_2004,
  FIXTURE_SAUBER_2004,
  FIXTURE_MINARDI_2004,
];
