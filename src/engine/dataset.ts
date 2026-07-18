/**
 * Loader puro do dataset da engine (PR 1.1).
 *
 * Este módulo **não faz I/O**: recebe os objetos já carregados a partir dos
 * JSONs de `src/data/` (import ou fetch é responsabilidade de quem chama —
 * tipicamente um teste ou a camada de bootstrap da UI). `criarDataset`
 * valida a forma bruta (`unknown`) e devolve um `Dataset` indexado, lançando
 * `Error` com mensagem descritiva (registro + campo) em qualquer
 * inconsistência.
 *
 * Convenção fixada nos dados: **toda nota é qualidade** (99 = melhor),
 * incluindo CONS e PIT_ERRO — nota alta de CONS = piloto mais consistente
 * (comete menos erros); nota alta de PIT_ERRO = equipe de pit comete menos
 * erros na parada. A conversão de nota para probabilidade de evento (erro,
 * quebra, investigação etc.) é responsabilidade da fórmula de corrida
 * (PRs futuros), nunca do dado bruto nem deste loader.
 *
 * Validação manual, sem dependências novas (sem Zod).
 */

import type {
  AtributoAlvo,
  Chassi,
  EquipeAno,
  EquipePit,
  Estrategista,
  Motor,
  NotasChassi,
  NotasMotor,
  NotasPiloto,
  Peca,
  Piloto,
  Pista,
  Raridade,
  Ultrapassagem,
} from './types';

/** Chaves válidas de `AtributoAlvo` (união de NotasPiloto | NotasChassi | NotasMotor, §6/§7). */
const ATRIBUTOS_VALIDOS: ReadonlySet<string> = new Set([
  'rit',
  'quali',
  'cons',
  'ult',
  'def',
  'chu',
  'pneu',
  'larg',
  'sf',
  'aero',
  'mec',
  'ppeso',
  'conf',
  'freio',
  'motor',
  'confMotor',
]);

const RARIDADES_VALIDAS: ReadonlySet<string> = new Set([
  'comum',
  'raro',
  'epico',
  'lendario',
  'proibido',
]);

const ULTRAPASSAGENS_VALIDAS: ReadonlySet<string> = new Set(['facil', 'media', 'dificil']);

/** Dataset indexado, pronto pra alimentar o draft e a simulação. */
export interface Dataset {
  pilotos: Piloto[];
  chassis: Chassi[];
  motores: Motor[];
  estrategistas: Estrategista[];
  pits: EquipePit[];
  pecas: Peca[];
  pistas: Pista[];
  equipeAnos: EquipeAno[];
  pilotosById: Map<string, Piloto>;
  chassisById: Map<string, Chassi>;
  motoresById: Map<string, Motor>;
  estrategistasById: Map<string, Estrategista>;
  pitsById: Map<string, EquipePit>;
  pecasById: Map<string, Peca>;
  pistasById: Map<string, Pista>;
}

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function comoRegistro(valor: unknown, contexto: string): Record<string, unknown> {
  assert(
    typeof valor === 'object' && valor !== null && !Array.isArray(valor),
    `${contexto}: esperado objeto, recebeu ${JSON.stringify(valor)}`,
  );
  return valor as Record<string, unknown>;
}

function comoArray(valor: unknown, contexto: string): unknown[] {
  assert(Array.isArray(valor), `${contexto}: esperado array, recebeu ${JSON.stringify(valor)}`);
  return valor;
}

function obrigatorio(obj: Record<string, unknown>, campo: string, contexto: string): unknown {
  assert(campo in obj, `${contexto}: campo obrigatório "${campo}" ausente`);
  return obj[campo];
}

function lerString(obj: Record<string, unknown>, campo: string, contexto: string): string {
  const v = obrigatorio(obj, campo, contexto);
  assert(
    typeof v === 'string' && v.length > 0,
    `${contexto}: campo "${campo}" deve ser string não vazia (recebeu ${JSON.stringify(v)})`,
  );
  return v;
}

function lerNumero(obj: Record<string, unknown>, campo: string, contexto: string): number {
  const v = obrigatorio(obj, campo, contexto);
  assert(
    typeof v === 'number' && Number.isFinite(v),
    `${contexto}: campo "${campo}" deve ser número finito (recebeu ${JSON.stringify(v)})`,
  );
  return v;
}

/** Nota 0-99 (§6). Toda nota do dataset segue essa escala, incluindo CONS e PIT_ERRO. */
function lerNota(obj: Record<string, unknown>, campo: string, contexto: string): number {
  const v = lerNumero(obj, campo, contexto);
  assert(
    v >= 0 && v <= 99,
    `${contexto}: nota "${campo}" fora da escala 0-99 (recebeu ${v})`,
  );
  return v;
}

function registrarId(idsVistos: Set<string>, id: string, contexto: string): void {
  assert(!idsVistos.has(id), `${contexto}: id duplicado "${id}"`);
  idsVistos.add(id);
}

function lerNotasPiloto(obj: Record<string, unknown>, contexto: string): NotasPiloto {
  return {
    rit: lerNota(obj, 'rit', contexto),
    quali: lerNota(obj, 'quali', contexto),
    cons: lerNota(obj, 'cons', contexto),
    ult: lerNota(obj, 'ult', contexto),
    def: lerNota(obj, 'def', contexto),
    chu: lerNota(obj, 'chu', contexto),
    pneu: lerNota(obj, 'pneu', contexto),
    larg: lerNota(obj, 'larg', contexto),
    sf: lerNota(obj, 'sf', contexto),
  };
}

function lerNotasChassi(obj: Record<string, unknown>, contexto: string): NotasChassi {
  return {
    aero: lerNota(obj, 'aero', contexto),
    mec: lerNota(obj, 'mec', contexto),
    ppeso: lerNota(obj, 'ppeso', contexto),
    conf: lerNota(obj, 'conf', contexto),
    freio: lerNota(obj, 'freio', contexto),
  };
}

function lerNotasMotor(obj: Record<string, unknown>, contexto: string): NotasMotor {
  return {
    motor: lerNota(obj, 'motor', contexto),
    confMotor: lerNota(obj, 'confMotor', contexto),
  };
}

function lerPiloto(
  raw: unknown,
  equipe: string,
  ano: number,
  contexto: string,
  idsVistos: Set<string>,
): Piloto {
  const obj = comoRegistro(raw, contexto);
  const id = lerString(obj, 'id', contexto);
  registrarId(idsVistos, id, contexto);
  const nome = lerString(obj, 'nome', contexto);
  const notasObj = comoRegistro(obrigatorio(obj, 'notas', contexto), `${contexto}.notas`);
  const notas = lerNotasPiloto(notasObj, `${contexto}.notas`);
  return { id, nome, equipe, ano, notas };
}

function lerChassi(
  raw: unknown,
  equipe: string,
  ano: number,
  contexto: string,
  idsVistos: Set<string>,
): Chassi {
  const obj = comoRegistro(raw, contexto);
  const id = lerString(obj, 'id', contexto);
  registrarId(idsVistos, id, contexto);
  const notasObj = comoRegistro(obrigatorio(obj, 'notas', contexto), `${contexto}.notas`);
  const notas = lerNotasChassi(notasObj, `${contexto}.notas`);
  return { id, equipe, ano, notas };
}

function lerMotor(
  raw: unknown,
  equipe: string,
  ano: number,
  contexto: string,
  idsVistos: Set<string>,
): Motor {
  const obj = comoRegistro(raw, contexto);
  const id = lerString(obj, 'id', contexto);
  registrarId(idsVistos, id, contexto);
  const notasObj = comoRegistro(obrigatorio(obj, 'notas', contexto), `${contexto}.notas`);
  const notas = lerNotasMotor(notasObj, `${contexto}.notas`);
  return { id, equipe, ano, notas };
}

function lerEstrategista(
  raw: unknown,
  equipe: string,
  ano: number,
  contexto: string,
  idsVistos: Set<string>,
): Estrategista {
  const obj = comoRegistro(raw, contexto);
  const id = lerString(obj, 'id', contexto);
  registrarId(idsVistos, id, contexto);
  const nome = lerString(obj, 'nome', contexto);
  const notasObj = comoRegistro(obrigatorio(obj, 'notas', contexto), `${contexto}.notas`);
  const notas = {
    call: lerNota(notasObj, 'call', `${contexto}.notas`),
    sangf: lerNota(notasObj, 'sangf', `${contexto}.notas`),
  };
  return { id, nome, equipe, ano, notas };
}

function lerPit(
  raw: unknown,
  equipe: string,
  ano: number,
  contexto: string,
  idsVistos: Set<string>,
): EquipePit {
  const obj = comoRegistro(raw, contexto);
  const id = lerString(obj, 'id', contexto);
  registrarId(idsVistos, id, contexto);
  const notasObj = comoRegistro(obrigatorio(obj, 'notas', contexto), `${contexto}.notas`);
  const notas = {
    pitTempo: lerNota(notasObj, 'pitTempo', `${contexto}.notas`),
    pitErro: lerNota(notasObj, 'pitErro', `${contexto}.notas`),
  };
  return { id, equipe, ano, notas };
}

function lerEquipeAno(
  raw: unknown,
  idx: number,
  idsVistos: Set<string>,
  equipesAnosVistos: Set<string>,
): EquipeAno {
  const contextoBase = `equipeAnos[${idx}]`;
  const obj = comoRegistro(raw, contextoBase);
  const equipe = lerString(obj, 'equipe', contextoBase);
  const ano = lerNumero(obj, 'ano', contextoBase);
  assert(
    Number.isInteger(ano),
    `${contextoBase}: campo "ano" deve ser um inteiro (recebeu ${ano})`,
  );
  const chave = `${equipe}::${ano}`;
  assert(
    !equipesAnosVistos.has(chave),
    `${contextoBase}: equipe+ano duplicado ("${equipe}" ${ano})`,
  );
  equipesAnosVistos.add(chave);

  const contexto = `${contextoBase} (${equipe} ${ano})`;

  const pilotosRaw = comoArray(obrigatorio(obj, 'pilotos', contexto), `${contexto}.pilotos`);
  assert(
    pilotosRaw.length === 2,
    `${contexto}: precisa de exatamente 2 pilotos, recebeu ${pilotosRaw.length}`,
  );
  const pilotos: [Piloto, Piloto] = [
    lerPiloto(pilotosRaw[0], equipe, ano, `${contexto}.pilotos[0]`, idsVistos),
    lerPiloto(pilotosRaw[1], equipe, ano, `${contexto}.pilotos[1]`, idsVistos),
  ];

  const chassi = lerChassi(
    obrigatorio(obj, 'chassi', contexto),
    equipe,
    ano,
    `${contexto}.chassi`,
    idsVistos,
  );
  const motor = lerMotor(
    obrigatorio(obj, 'motor', contexto),
    equipe,
    ano,
    `${contexto}.motor`,
    idsVistos,
  );
  const estrategista = lerEstrategista(
    obrigatorio(obj, 'estrategista', contexto),
    equipe,
    ano,
    `${contexto}.estrategista`,
    idsVistos,
  );
  const pit = lerPit(
    obrigatorio(obj, 'pit', contexto),
    equipe,
    ano,
    `${contexto}.pit`,
    idsVistos,
  );

  return { equipe, ano, pilotos, chassi, motor, estrategista, pit };
}

function lerPeca(raw: unknown, idx: number, idsVistos: Set<string>): Peca {
  const contextoBase = `pecas[${idx}]`;
  const obj = comoRegistro(raw, contextoBase);
  const id = lerString(obj, 'id', contextoBase);
  registrarId(idsVistos, id, contextoBase);
  const contexto = `${contextoBase} (${id})`;
  const nome = lerString(obj, 'nome', contexto);
  const categoria = lerString(obj, 'categoria', contexto);
  const raridade = lerString(obj, 'raridade', contexto);
  assert(RARIDADES_VALIDAS.has(raridade), `${contexto}: raridade inválida "${raridade}"`);

  const atributosAlvoRaw = comoArray(
    obrigatorio(obj, 'atributosAlvo', contexto),
    `${contexto}.atributosAlvo`,
  );
  assert(atributosAlvoRaw.length > 0, `${contexto}: atributosAlvo não pode ser vazio`);
  const atributosAlvo = atributosAlvoRaw.map((a, i) => {
    assert(typeof a === 'string', `${contexto}.atributosAlvo[${i}]: deve ser string`);
    assert(
      ATRIBUTOS_VALIDOS.has(a),
      `${contexto}.atributosAlvo[${i}]: atributo alvo inválido "${a}"`,
    );
    return a as AtributoAlvo;
  });

  const bonus = lerNumero(obj, 'bonus', contexto);
  assert(bonus > 0, `${contexto}: bonus deve ser > 0 (recebeu ${bonus})`);
  const risco = lerNumero(obj, 'risco', contexto);
  assert(risco >= 0, `${contexto}: risco deve ser >= 0 (recebeu ${risco})`);

  return { id, nome, categoria, raridade: raridade as Raridade, atributosAlvo, bonus, risco };
}

function lerPista(raw: unknown, idx: number, idsVistos: Set<string>): Pista {
  const contextoBase = `pistas[${idx}]`;
  const obj = comoRegistro(raw, contextoBase);
  const id = lerString(obj, 'id', contextoBase);
  registrarId(idsVistos, id, contextoBase);
  const contexto = `${contextoBase} (${id})`;
  const nome = lerString(obj, 'nome', contexto);

  const pesosObj = comoRegistro(obrigatorio(obj, 'pesos', contexto), `${contexto}.pesos`);
  const aero = lerNumero(pesosObj, 'aero', `${contexto}.pesos`);
  const mec = lerNumero(pesosObj, 'mec', `${contexto}.pesos`);
  const motor = lerNumero(pesosObj, 'motor', `${contexto}.pesos`);
  assert(aero > 0, `${contexto}.pesos.aero: deve ser > 0 (recebeu ${aero})`);
  assert(mec > 0, `${contexto}.pesos.mec: deve ser > 0 (recebeu ${mec})`);
  assert(motor > 0, `${contexto}.pesos.motor: deve ser > 0 (recebeu ${motor})`);
  const somaPesos = aero + mec + motor;
  assert(
    Math.abs(somaPesos - 1) < 1e-9,
    `${contexto}.pesos: aero+mec+motor deve somar 1.0 (recebeu ${somaPesos})`,
  );

  const ultrapassagem = lerString(obj, 'ultrapassagem', contexto);
  assert(
    ULTRAPASSAGENS_VALIDAS.has(ultrapassagem),
    `${contexto}: ultrapassagem inválida "${ultrapassagem}"`,
  );

  const chanceChuva = lerNumero(obj, 'chanceChuva', contexto);
  assert(
    chanceChuva >= 0 && chanceChuva <= 1,
    `${contexto}: chanceChuva deve estar em [0,1] (recebeu ${chanceChuva})`,
  );

  const voltas = lerNumero(obj, 'voltas', contexto);
  assert(
    Number.isInteger(voltas) && voltas >= 10 && voltas <= 15,
    `${contexto}: voltas deve ser inteiro entre 10 e 15 (recebeu ${voltas})`,
  );

  const tempoBaseMs = lerNumero(obj, 'tempoBaseMs', contexto);
  assert(tempoBaseMs > 0, `${contexto}: tempoBaseMs deve ser > 0 (recebeu ${tempoBaseMs})`);

  const desgaste = lerNota(obj, 'desgaste', contexto);

  return {
    id,
    nome,
    pesos: { aero, mec, motor },
    ultrapassagem: ultrapassagem as Ultrapassagem,
    chanceChuva,
    voltas,
    tempoBaseMs,
    desgaste,
  };
}

/**
 * Valida e indexa o dataset bruto (3 JSONs de `src/data/`). Lança `Error`
 * com mensagem descritiva (registro + campo) na primeira inconsistência
 * encontrada. Puro: não faz I/O, não lê arquivos — recebe os objetos já
 * carregados por quem chama.
 */
export function criarDataset(
  equipeAnosRaw: unknown,
  pecasRaw: unknown,
  pistasRaw: unknown,
): Dataset {
  const idsVistos = new Set<string>();
  const equipesAnosVistos = new Set<string>();

  const equipeAnos = comoArray(equipeAnosRaw, 'equipeAnos').map((raw, idx) =>
    lerEquipeAno(raw, idx, idsVistos, equipesAnosVistos),
  );

  const pecas = comoArray(pecasRaw, 'pecas').map((raw, idx) => lerPeca(raw, idx, idsVistos));

  const pistas = comoArray(pistasRaw, 'pistas').map((raw, idx) => lerPista(raw, idx, idsVistos));

  const pilotos: Piloto[] = [];
  const chassis: Chassi[] = [];
  const motores: Motor[] = [];
  const estrategistas: Estrategista[] = [];
  const pits: EquipePit[] = [];

  for (const ea of equipeAnos) {
    pilotos.push(ea.pilotos[0], ea.pilotos[1]);
    chassis.push(ea.chassi);
    motores.push(ea.motor);
    estrategistas.push(ea.estrategista);
    pits.push(ea.pit);
  }

  return {
    pilotos,
    chassis,
    motores,
    estrategistas,
    pits,
    pecas,
    pistas,
    equipeAnos,
    pilotosById: new Map(pilotos.map((p) => [p.id, p])),
    chassisById: new Map(chassis.map((c) => [c.id, c])),
    motoresById: new Map(motores.map((m) => [m.id, m])),
    estrategistasById: new Map(estrategistas.map((e) => [e.id, e])),
    pitsById: new Map(pits.map((p) => [p.id, p])),
    pecasById: new Map(pecas.map((p) => [p.id, p])),
    pistasById: new Map(pistas.map((p) => [p.id, p])),
  };
}
