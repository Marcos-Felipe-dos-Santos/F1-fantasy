/**
 * Buckets de circuito (PR 4.6, trilha "Dataset histórico 1950-2025",
 * `PROGRESS.md` seção "Próximos"). Tabela EXPLÍCITA `circuitId → bucket` —
 * decisão de CURADORIA do arquiteto (não fórmula, não inferida de dado bruto)
 * — que existe pra diferenciar AERO/MEC/MOTOR por equipe/ano em
 * `derivar-notas.ts`: sem isso, os pesos de pista por bucket do GDD §9 não
 * têm efeito real de balanceamento (as 3 notas do carro são idênticas hoje).
 *
 * Mesmo princípio anti-GDD §14.1 de `status-map.ts`: nenhuma categorização
 * "no olho" sem auditoria — todo circuitId fora da tabela cai no fallback
 * `'neutro'` e é coletado (nunca silenciosamente perdido) por quem chama
 * `lookupBucket`.
 *
 * Os 77 circuitIds abaixo são TODOS os observados no cache real
 * (`scripts/cache/jolpica/`) na sessão em que este arquivo foi escrito —
 * conferido programaticamente (não é lista "de memória"). Critério de cada
 * bucket:
 *
 * - `potencia`: reta(s) longa(s) dominam o traçado — carro forte em
 *   MOTOR (`NotasMotor.motor`, "Potência (reta)") tem vantagem desproporcional
 *   ali. Âncoras do dev: Monza, Spa.
 * - `travado`: curvas lentas/90°, pouca reta — carro forte em MEC
 *   (`NotasChassi.mec`, "Grip mecânico (curva lenta)") tem vantagem. Âncoras
 *   do dev: Mônaco, Hungaroring.
 * - `aero`: curvas rápidas/médias em sequência dominam — carro forte em AERO
 *   (`NotasChassi.aero`, "Downforce (curva rápida e média)") tem vantagem.
 *   Âncoras do dev: Silverstone, Suzuka.
 * - `neutro`: sem viés claro pra nenhum dos 3 (traçado equilibrado, dado
 *   insuficiente pra decidir, OU era mista do MESMO circuitId com identidades
 *   de traçado contraditórias entre si — ver notas específicas abaixo). Não
 *   gera ajuste de bucket em `derivar-notas.ts` (delta 0 por definição).
 *
 * Notas de era mista (o MESMO `circuitId` cobre traçados fisicamente
 * diferentes ao longo da história — a Jolpica não versiona o traçado):
 * - `nurburgring`: Nordschleife (1951-1976, ~20km, dominado por curvas
 *   rápidas de floresta — perfil `aero`) vs GP-Strecke (1984+, traçado curto
 *   moderno, perfil mais `travado`/técnico). As duas identidades de traçado
 *   se cancelam — não dá pra escolher UM bucket honesto pro `circuitId`
 *   inteiro sem inventar peso por década (fora de escopo deste PR) ⇒ `neutro`.
 * - `hockenheimring`: bucket `potencia` pela ERA DOMINANTE no dataset —
 *   traçado longo com retas duplas de floresta (Ostkurve/Motodrom) de 1970 a
 *   2001 (31 das 37 temporadas do circuitId no dataset real, contadas
 *   programaticamente); a reconfiguração pós-2002 (traçado curto, mais
 *   equilibrado) é MINORIA de temporadas — não justifica mudar o bucket do
 *   `circuitId` inteiro por 6/37 dos casos.
 */

export type BucketCircuito = 'potencia' | 'travado' | 'aero' | 'neutro';

/** Reta(s) longa(s) dominam — vantagem de MOTOR (`NotasMotor.motor`). */
const POTENCIA: readonly string[] = [
  'monza',
  'spa',
  'villeneuve',
  'hockenheimring',
  'red_bull_ring',
  'rodriguez',
  'bahrain',
  'kyalami',
  'indianapolis',
  'reims',
  'jacarepagua',
  'baku',
  'fuji',
  'vegas',
  'pedralbes',
  'pescara',
  'ain-diab',
  'avus',
];

/** Curvas lentas/90° dominam — vantagem de MEC (`NotasChassi.mec`). */
const TRAVADO: readonly string[] = [
  'monaco',
  'hungaroring',
  'galvez',
  'marina_bay',
  'adelaide',
  'jarama',
  'long_beach',
  'detroit',
  'jerez',
  'valencia',
  'phoenix',
  'las_vegas',
  'okayama',
  'lemans',
  'dallas',
  'boavista',
];

/** Curvas rápidas/médias em sequência dominam — vantagem de AERO (`NotasChassi.aero`). */
const AERO: readonly string[] = [
  'silverstone',
  'suzuka',
  'zandvoort',
  'catalunya',
  'imola',
  'watkins_glen',
  'brands_hatch',
  'estoril',
  'americas',
  'istanbul',
  'mosport',
  'dijon',
  'bremgarten',
  'essarts',
  'jeddah',
  'charade',
  'montjuic',
  'losail',
  'donington',
  'mugello',
  'portimao',
  'tremblant',
  'monsanto',
];

/** Sem viés claro (traçado equilibrado ou era mista contraditória) — não gera ajuste. */
const NEUTRO: readonly string[] = [
  'interlagos',
  'nurburgring',
  'albert_park',
  'sepang',
  'ricard',
  'magny_cours',
  'shanghai',
  'yas_marina',
  'zolder',
  'sochi',
  'anderstorp',
  'aintree',
  'yeongam',
  'miami',
  'george',
  'buddh',
  'nivelles',
  'sebring',
  'riverside',
  'zeltweg',
];

function construirTabela(): Record<string, BucketCircuito> {
  const tabela: Record<string, BucketCircuito> = {};
  const listas: Array<[BucketCircuito, readonly string[]]> = [
    ['potencia', POTENCIA],
    ['travado', TRAVADO],
    ['aero', AERO],
    ['neutro', NEUTRO],
  ];
  for (const [bucket, ids] of listas) {
    for (const id of ids) {
      tabela[id] = bucket;
    }
  }
  return tabela;
}

/** Tabela EXPLÍCITA `circuitId → bucket` (curadoria — ver cabeçalho do módulo). */
export const BUCKET_POR_CIRCUITO: Readonly<Record<string, BucketCircuito>> = construirTabela();

/**
 * Bucket de `circuitId`. Desconhecido ⇒ `'neutro'` (fallback documentado) e
 * `circuitId` é adicionado a `naoMapeados` — auditoria explícita, mesmo
 * padrão de `statusEhConhecido`/`statusesNaoMapeados` em `status-map.ts` /
 * `agregar-fatos.ts`: nenhum circuito cai no fallback silenciosamente.
 */
export function lookupBucket(circuitId: string, naoMapeados: Set<string>): BucketCircuito {
  const bucket = BUCKET_POR_CIRCUITO[circuitId];
  if (bucket === undefined) {
    naoMapeados.add(circuitId);
    return 'neutro';
  }
  return bucket;
}
