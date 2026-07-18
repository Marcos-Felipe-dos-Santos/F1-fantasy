/**
 * Tipos base da engine (PR 0.3; tipos de draft/bots acrescentados no PR 1.2).
 *
 * Módulo folha: zero imports. Só `interface`/`type`/uniões literais — sem
 * classes, sem enums, sem Zod, sem funções. Fonte da verdade dos atributos é
 * o F1_Fantasy_GDD.md (v1.1), seções §3 (draft), §6 (notas), §7 (peças/raridade),
 * §9 (pistas), §10 (corrida) e §12 (bots).
 *
 * Excluído de propósito deste PR (fica pra PRs futuros):
 * - Incidentes/eventos de corrida (rolagem de risco técnico, safety car etc.) → PR 1.5.
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

/** Notas de um chassi por equipe/ano (§6, seção "Chassi"). */
export interface NotasChassi {
  /** Downforce (curva rápida e média). */
  aero: Nota;
  /** Grip mecânico (curva lenta). */
  mec: Nota;
  /** Peso / agilidade. */
  ppeso: Nota;
  /** Confiabilidade do chassi (chance de quebra mecânica). */
  conf: Nota;
  /** Frenagem. */
  freio: Nota;
}

/** Um chassi, ligado a uma equipe/ano específicos (§3, §6). */
export interface Chassi {
  id: string;
  equipe: string;
  ano: number;
  notas: NotasChassi;
}

/** Notas de um motor por equipe/ano (§6, seção "Motor"). */
export interface NotasMotor {
  /** Potência (reta). */
  motor: Nota;
  /** Confiabilidade do motor (chance de quebra de motor). */
  confMotor: Nota;
}

/** Um motor, ligado a uma equipe/ano específicos (§3, §6). */
export interface Motor {
  id: string;
  equipe: string;
  ano: number;
  notas: NotasMotor;
}

/**
 * Um estrategista, ligado a uma equipe/ano específicos — sorteado como os
 * demais componentes, não escolha livre (§3, §6).
 */
export interface Estrategista {
  id: string;
  nome: string;
  equipe: string;
  ano: number;
  notas: {
    /** Qualidade das decisões (undercut/overcut, chamada de chuva). */
    call: Nota;
    /** Frieza sob safety car / pressão. */
    sangf: Nota;
  };
}

/**
 * Uma equipe de pit stop, ligada a uma equipe/ano específicos — sorteada como
 * os demais componentes (§3, §6). PIT_TEMPO e PIT_ERRO pertencem à equipe de
 * pit, não ao estrategista.
 */
export interface EquipePit {
  id: string;
  equipe: string;
  ano: number;
  notas: {
    /** Velocidade da parada. */
    pitTempo: Nota;
    /** Chance de erro (pneu solto, etc.). */
    pitErro: Nota;
  };
}

/** Escala de raridade de peças icônicas (§7). */
export type Raridade = 'comum' | 'raro' | 'epico' | 'lendario' | 'proibido';

/** Atributo do piloto, chassi ou motor que uma peça pode turbinar (§6, §7). */
export type AtributoAlvo = keyof NotasPiloto | keyof NotasChassi | keyof NotasMotor;

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
  /** Tempo-base de volta em milissegundos — âncora da fórmula de tempo (§10). */
  tempoBaseMs: number;
  /**
   * Desgaste de pneu da pista, escala 0-99 (§9). Define o quão rápido os
   * pneus degradam ali e, por consequência, quantas paradas a pista
   * naturalmente exige (1 obrigatória em todas; desgaste alto força extras).
   *
   * Atenção: aqui `Nota` é só reuso da faixa numérica 0-99, **não** da
   * convenção "99 = melhor" das demais notas (§6). Desgaste alto é pior
   * pro pneu — força mais paradas, não é uma qualidade a maximizar.
   */
  desgaste: Nota;
}

/**
 * Forma canônica de um sorteio de equipe/ano do draft (§3): revela os 5
 * componentes de uma vez (piloto — 2 titulares —, chassi, motor,
 * estrategista, pit). O jogador escolhe 1 componente que ainda falte; o
 * dataset (PR 1.1) agrupa os registros nessa forma pra alimentar o sorteio.
 */
export interface EquipeAno {
  equipe: string;
  ano: number;
  /** Os 2 titulares da equipe naquele ano — o jogador escolhe 1 ao pegar "piloto" (§3). */
  pilotos: [Piloto, Piloto];
  chassi: Chassi;
  motor: Motor;
  estrategista: Estrategista;
  pit: EquipePit;
}

/**
 * Loadout de um jogador: referências por id às peças escolhidas no draft
 * (§3). Resolução id→objeto é helper de PR futuro.
 *
 * Estrutura do draft (§3, v1.1): **5 sorteios de equipe/ano**, todos no mesmo
 * ciclo — cada sorteio revela tudo daquela equipe/ano (piloto, chassi, motor,
 * estrategista, pit) e o jogador pega **1 componente que ainda falta**; na
 * rodada 5 pega o último que sobrou, sem escolha. Os 5 componentes podem vir
 * de 5 eras diferentes. Rodada 6: **1 peça icônica** (pool compartilhado,
 * 2 cópias por peça).
 */
export interface Loadout {
  jogadorId: string;
  pilotoId: string;
  chassiId: string;
  motorId: string;
  estrategistaId: string;
  pitId: string;
  pecaId: string;
}

/** Perfil de decisão de um bot no draft (§12). */
export type PerfilBot = 'passeio' | 'praGanhar';

/** Um jogador da partida — humano ou bot. Bot exige `perfilBot` definido antes de entrar no draft (§12). */
export interface Jogador {
  id: string;
  tipo: 'humano' | 'bot';
  perfilBot?: PerfilBot;
}

/** Dificuldade da partida — controla a proporção de bots "pra ganhar" (§12). */
export type Dificuldade = 'facil' | 'dificil';

/** Os 5 componentes preenchíveis em cada sorteio de equipe/ano (§3). */
export type SlotComponente = 'piloto' | 'chassi' | 'motor' | 'estrategista' | 'pit';

/**
 * Jogada de um jogador no draft (§3). `componente` cobre chassi/motor/
 * estrategista/pit — o id é resolvido automaticamente pela equipe/ano da
 * rodada corrente (só há 1 por slot); `piloto` exige escolher qual dos 2
 * titulares; `peca` só é válida na rodada 6.
 */
export type EscolhaDraft =
  | { tipo: 'componente'; slot: Exclude<SlotComponente, 'piloto'> }
  | { tipo: 'piloto'; pilotoId: string }
  | { tipo: 'peca'; pecaId: string };

/** Referência leve a um sorteio de equipe/ano (§3) — o suficiente pra localizar o registro completo no dataset. */
export interface EquipeAnoRef {
  equipe: string;
  ano: number;
}

/** Fase corrente do draft (§3): 5 sorteios de equipe/ano, depois a peça icônica (rodada 6), depois concluído. */
export type FaseDraft = 'sorteios' | 'peca' | 'concluido';

/** Progresso de um jogador nas rodadas 1-5 (§3): rodada atual (1-5; 6 = sorteios completos) e slots já preenchidos. */
export interface ProgressoJogador {
  rodada: number;
  slots: Partial<Pick<Loadout, 'pilotoId' | 'chassiId' | 'motorId' | 'estrategistaId' | 'pitId'>>;
}

/**
 * Estado do draft (§3), totalmente serializável (JSON puro — sem closures,
 * sem instância de `Rng` armazenada). Toda aleatoriedade é derivada na hora,
 * a partir de `seed` + rótulo do sub-stream (ver `rng.ts`). Não guarda o
 * `Dataset` — funções que precisam resolver ids consultam o dataset à parte.
 */
export interface DraftState {
  seed: number;
  fase: FaseDraft;
  jogadores: Jogador[];
  /** Os 5 sorteios de equipe/ano de cada jogador, pré-computados em `criarDraft` (individual por jogador, §3). */
  sorteios: Record<string, EquipeAnoRef[]>;
  progresso: Record<string, ProgressoJogador>;
  /** Ordem de escolha da rodada 6, embaralhada por seed (§3). */
  ordemPeca: string[];
  /** Índice em `ordemPeca` de quem escolhe peça agora. */
  indicePeca: number;
  /** As 5 peças reveladas ao jogador da vez na rodada 6, ou `null` fora do turno dele/antes de revelar. */
  pecasReveladas: string[] | null;
  /** Cópias restantes por id de peça (2 por peça, §7). */
  copiasRestantes: Record<string, number>;
  /** Loadouts finais dos jogadores que já concluíram a rodada 6. */
  loadouts: Record<string, Loadout>;
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
