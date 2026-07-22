/**
 * Tabela EXPLÍCITA de mapeamento `status` (campo `Results[].status` do
 * envelope Ergast/Jolpica) → categoria agregada usada pelo PR 4.2
 * (`agregar-fatos.ts`). Faz parte do princípio anti-GDD §14.1: nenhuma
 * categorização "no olho" — a tabela é o único lugar onde essa decisão é
 * tomada, e é auditável (commitada, revisável em diff).
 *
 * A separação `mecanica-chassi` vs `mecanica-motor` é uma CONVENÇÃO DO
 * PROJETO (a Ergast não distingue isso formalmente) — critério adotado:
 * motor = motor/combustível/elétrica/arrefecimento do powertrain;
 * chassi = transmissão/suspensão/freios/direção/pneus/estrutura do carro.
 * `outro` cobre abandonos não-mecânicos (piloto, disciplinares, etc.) e é
 * também o fallback de qualquer status desconhecido — nunca falha
 * silenciosamente: todo status que cai em `outro` por não constar na tabela
 * é reportado por quem chama `mapearStatus` via `statusEhConhecido`, pra que
 * o agregador colete `statusesNaoMapeados` (auditoria explícita).
 *
 * "Finished" e qualquer "+N Lap"/"+N Laps" (voltas perdidas mas terminou a
 * prova) contam como `terminou` — tratados por regex, não por tabela, pois
 * o N varia.
 *
 * `NAO_LARGOU` (eras antigas, sobretudo 1950s-60s) é um eixo DIFERENTE de
 * `CategoriaStatus`: são linhas de `Results` cujo piloto NUNCA largou a
 * corrida (não classificou, não pré-classificou, ou retirou o carro antes da
 * largada). `agregar-fatos.ts` exclui essas linhas de TUDO — não contam como
 * largada, não entram no corte de escopo, na escolha de titulares, nem em
 * nenhuma contagem/média (não largou ⇒ fora de numerador e denominador).
 * `Disqualified` e `Excluded` FICAM DE FORA deste set de propósito: DSQ e
 * exclusão são punições pós-largada — o piloto largou e correu, só perdeu o
 * resultado depois. Essas continuam contando como largada normal (categoria
 * `outro`).
 */

export type CategoriaStatus = 'terminou' | 'acidente-erro' | 'mecanica-chassi' | 'mecanica-motor' | 'outro';

const REGEX_VOLTAS_PERDIDAS = /^\+\d+ Laps?$/;

/** Acidente/erro do próprio piloto (contato, saída de pista por erro). */
const ACIDENTE_ERRO = new Set<string>(['Accident', 'Collision', 'Collision damage', 'Spun off']);

/** Falha do motor/powertrain (convenção do projeto — ver cabeçalho). */
const MECANICA_MOTOR = new Set<string>([
  'Engine',
  'Turbo',
  'Overheating',
  'Fuel system',
  'Fuel pressure',
  'Fuel pump',
  'Fuel leak',
  'Fuel',
  'Oil leak',
  'Oil pressure',
  'Oil pump',
  'Water leak',
  'Water pressure',
  'Water pump',
  'Radiator',
  'Exhaust',
  'Ignition',
  'Alternator',
  'Battery',
  'Electrical',
  'ERS',
  'Power Unit',
  'Supercharger',
  'Magneto',
  'Distributor',
]);

/** Falha mecânica do chassi/transmissão/estrutura (convenção do projeto — ver cabeçalho). */
const MECANICA_CHASSI = new Set<string>([
  'Gearbox',
  'Transmission',
  'Clutch',
  'Driveshaft',
  'Halfshaft',
  'Suspension',
  'Brakes',
  'Steering',
  'Wheel',
  'Wheel nut',
  'Wheel bearing',
  'Wheel rim',
  'Tyre',
  'Puncture',
  'Hydraulics',
  'Chassis',
  'Differential',
  'Axle',
  'Throttle',
  'Pedal',
  'Vibrations',
  'Handling',
  'Fuel tank',
  'Fuel rig',
  'Brake duct',
]);

/** Abandono não-mecânico (piloto, disciplinar, técnico de largada, etc.). Também é o fallback. */
const OUTRO = new Set<string>([
  'Disqualified',
  'Retired',
  'Not classified',
  'Excluded',
  'Physical',
  'Illness',
  'Injury',
  'Driver Seat',
  'Safety',
  'Safety concerns',
  'Spectator',
  'Debris',
  'Fatal accident',
  // 'Damage' é deliberadamente neutralizado em 'outro': o status cru não
  // distingue se o dano veio de acidente (culpa do piloto) ou de falha
  // mecânica (culpa do carro) — categorizar em qualquer um dos dois seria
  // adivinhação. Fica em 'outro' e NÃO penaliza a nota do construtor (CONS).
  'Damage',
]);

/**
 * Linhas de `Results` cujo piloto NÃO largou a corrida — ver cabeçalho do
 * módulo. `agregar-fatos.ts` exclui essas linhas de toda contagem/média.
 */
export const NAO_LARGOU = new Set<string>(['Did not qualify', 'Did not prequalify', 'Withdrew', 'Did not start']);

/** true se `status` consta explicitamente em alguma categoria da tabela (não cai no fallback silencioso). */
export function statusEhConhecido(status: string): boolean {
  if (status === 'Finished') return true;
  if (REGEX_VOLTAS_PERDIDAS.test(status)) return true;
  return (
    NAO_LARGOU.has(status) ||
    ACIDENTE_ERRO.has(status) ||
    MECANICA_MOTOR.has(status) ||
    MECANICA_CHASSI.has(status) ||
    OUTRO.has(status)
  );
}

/** true se `status` representa uma largada real (fora de `NAO_LARGOU`). */
export function statusEhLargada(status: string): boolean {
  return !NAO_LARGOU.has(status);
}

/** Mapeia um `status` cru pra categoria agregada. Desconhecido ⇒ `'outro'` (fallback documentado). */
export function mapearStatus(status: string): CategoriaStatus {
  if (status === 'Finished') return 'terminou';
  if (REGEX_VOLTAS_PERDIDAS.test(status)) return 'terminou';
  if (ACIDENTE_ERRO.has(status)) return 'acidente-erro';
  if (MECANICA_MOTOR.has(status)) return 'mecanica-motor';
  if (MECANICA_CHASSI.has(status)) return 'mecanica-chassi';
  return 'outro';
}
