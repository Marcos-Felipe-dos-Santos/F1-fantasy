/**
 * Tipos base da engine (PR 0.3).
 *
 * Módulo folha: zero imports. Só `interface`/`type`/uniões literais — sem
 * classes, sem enums, sem Zod, sem funções. Fonte da verdade dos atributos é
 * o F1_Fantasy_GDD.md (v1.0), seções §6 (notas), §7 (peças/raridade),
 * §9 (pistas) e §10 (corrida).
 *
 * Excluído de propósito deste PR (fica pra PRs futuros):
 * - Incidentes/eventos de corrida (rolagem de risco técnico, safety car etc.) → PR 1.5.
 * - Bots (§12) → PR 1.7.
 * - Rede/sala (PartyKit, fase 3) → src/net/, fase 3.
 * - Temporada/campeonato (agregação de pontos entre corridas).
 * - Spec detalhado de motor (curva de potência, deploy de ERS etc.) além das notas base.
 * - Modo Cego (§5, visibilidade de notas).
 */

/** Nota normalizada por época, escala 0-99 (§6). Validação numérica fica pro loader de dados (PR 1.1). */
export type Nota = number;

/** Notas de um piloto (§6, seção "Piloto"). */
export interface NotasPiloto {
  /** Ritmo de corrida. */
  rit: Nota;
  /** Ritmo de volta única (classificação). */
  quali: Nota;
  /** Consistência — chance de erro/rodada. */
  cons: Nota;
  /** Ultrapassagem (ataque). */
  ult: Nota;
  /** Defesa de posição. */
  def: Nota;
  /** Performance na chuva. */
  chu: Nota;
  /** Gestão de pneu / degradação. */
  pneu: Nota;
  /** Largada / reação na luz. */
  larg: Nota;
  /** Sangue-frio sob pressão. */
  sf: Nota;
}

/** Um piloto, ligado a uma equipe/ano específicos (§3, §6). */
export interface Piloto {
  id: string;
  nome: string;
  equipe: string;
  ano: number;
  notas: NotasPiloto;
}

/** Notas de um carro/equipe por ano (§6, seção "Carro/Equipe"). */
export interface NotasCarro {
  /** Downforce (curva rápida e média). */
  aero: Nota;
  /** Grip mecânico (curva lenta). */
  mec: Nota;
  /** Potência (reta). */
  motor: Nota;
  /** Peso / agilidade. */
  ppeso: Nota;
  /** Confiabilidade (chance de quebra). */
  conf: Nota;
  /** Frenagem. */
  freio: Nota;
}

/** Um carro, ligado a uma equipe/ano específicos (§3, §6). */
export interface Carro {
  id: string;
  equipe: string;
  ano: number;
  notas: NotasCarro;
}

/**
 * Um motor. Separado do Carro porque o draft sorteia piloto e motor
 * independentemente (§3). Potência/confiabilidade próprias do motor (§6).
 */
export interface Motor {
  id: string;
  equipe: string;
  ano: number;
  /** Potência do motor. */
  potencia: Nota;
  /** Confiabilidade do motor. */
  conf: Nota;
}

/** Um estrategista, de escolha livre no draft (§3, §6). */
export interface Estrategista {
  id: string;
  arquetipo: string;
  notas: {
    /** Qualidade das decisões (undercut/overcut, chamada de chuva). */
    call: Nota;
    /** Frieza sob safety car / pressão. */
    sangf: Nota;
  };
}

/**
 * Uma equipe de pit stop, de escolha livre no draft (§3, §6). PIT_TEMPO e
 * PIT_ERRO pertencem à equipe de pit, não ao estrategista.
 */
export interface EquipePit {
  id: string;
  nome: string;
  notas: {
    /** Velocidade da parada. */
    pitTempo: Nota;
    /** Chance de erro (pneu solto, etc.). */
    pitErro: Nota;
  };
}

/** Escala de raridade de peças icônicas (§7). */
export type Raridade = 'comum' | 'raro' | 'epico' | 'lendario' | 'proibido';

/** Atributo do carro ou do piloto que uma peça pode turbinar (§6, §7). */
export type AtributoAlvo = keyof NotasPiloto | keyof NotasCarro;

/**
 * Peça icônica (§7). `atributosAlvo` é array porque há peças de 2 atributos
 * (ex.: suspensão ativa Williams FW15 → AERO+MEC; DAS Mercedes → QUALI+PNEU;
 * controle de tração escondido Benetton 1994 → LARG+MEC). `bonus`/`risco`
 * numéricos explícitos nos dados — o balance-harness ajusta valores, não
 * tipos (§7-§8).
 */
export interface Peca {
  id: string;
  nome: string;
  categoria: string;
  raridade: Raridade;
  atributosAlvo: AtributoAlvo[];
  bonus: number;
  risco: number;
}

/** Dificuldade de ultrapassagem de uma pista (§9). */
export type Ultrapassagem = 'facil' | 'media' | 'dificil';

/** Uma pista (§9). */
export interface Pista {
  id: string;
  nome: string;
  pesos: {
    aero: number;
    mec: number;
    motor: number;
  };
  ultrapassagem: Ultrapassagem;
  /** Chance de chuva, 0-1. */
  chanceChuva: number;
  /** Número de voltas da corrida (10-15, §9). */
  voltas: number;
}

/**
 * Loadout de um jogador: referências por id às peças escolhidas no draft
 * (§3). Resolução id→objeto é helper de PR futuro.
 *
 * Regra de derivação (§3): o carro/chassi vem junto do sorteio do piloto —
 * mesmo ano+equipe. O motor é o único outro componente com sorteio
 * independente. `carroId` existe separado por conveniência de lookup, mas o
 * draft (Fase 1) deve derivá-lo do sorteio do piloto, nunca sortear à parte.
 */
export interface Loadout {
  jogadorId: string;
  pilotoId: string;
  carroId: string;
  motorId: string;
  estrategistaId: string;
  pitId: string;
  pecaId: string;
}

/** Resultado da classificação: grid ordenado do pole pro último (§10). */
export interface ResultadoQuali {
  grid: {
    jogadorId: string;
    tempo: number;
  }[];
}

/**
 * Resultado de uma corrida (§10): pontuação FIA por posição e volta mais
 * rápida do grid inteiro (mesmo que cravada por quem terminou fora do pódio).
 */
export interface ResultadoCorrida {
  seed: number;
  classificacao: {
    jogadorId: string;
    posicao: number;
    pontos: number;
    tempoTotal: number;
  }[];
  voltaMaisRapida: {
    jogadorId: string;
    tempo: number;
  };
}
