/**
 * PR 3.5.1 — seed por etapa e cursor no servidor. **O baseline vermelho.**
 *
 * 🔒 **VERMELHO DE COMPILAÇÃO NÃO CONTA COMO BASELINE VERMELHO** (regra travada
 * do dev). Um teste que falha porque `seedsEtapas` ainda não existe não prova
 * nada sobre comportamento. Quem carrega o baseline são as MUTAÇÕES listadas
 * abaixo — elas se aplicam sobre o código de produção PRONTO e foram VISTAS
 * vermelhas antes deste arquivo ficar verde:
 *
 * | M1 | `seedsEtapas` como `Uint32Array` no estado      | reidratação (a)         |
 * | M2 | reordenar `seedsEtapas` na forma persistida     | extração (b)            |
 * | M3 | `publicarSala` com spread menos segredos        | varredura de segredo    |
 * | M4 | `slice(0, etapaAtual + 2)`                      | `seedsAbertas.length`   |
 * | M5 | `seedsEtapas[k] = deriveSeed(seedMestre, …)`    | independência           |
 * | M6 | `seedCalendario = seedsEtapas[0]`               | 11º slot independente   |
 * | M7 | `estadoDasSeeds` → `sala.seedsEtapas ?? []`     | perda ≠ sala nova       |
 *
 * 🔑 **O mecanismo que este arquivo defende é `B-indep`** (D1, aprovado pelo
 * dev): N seeds INDEPENDENTES sorteadas no Durable Object, publicadas uma por
 * etapa quando aquela etapa abre. Derivar por índice compraria ZERO contra o
 * atacante da pendência 0(i) — recomposta a `seedMestre` pela `seedDraft`
 * pública desde o lobby, todas as etapas cairiam juntas.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { N_ETAPAS, calendarioSorteado, seedDaEtapa } from '../engine/campeonato';
import { deriveSeed } from '../engine/rng';
import type { Dificuldade } from '../engine/types';
import {
  criarSala,
  estadoDasSeeds,
  publicarSala,
  reduzirSala,
  relatorioDeSeeds,
} from './sala';
import {
  MAX_ETAPAS,
  N_ETAPAS_CURTA,
  SLOTS_SEEDS,
  VERSAO_ESTADO_SALA,
  type EstadoSala,
  type FaseDraftRede,
} from './tipos';
import type { ComandoSala } from './protocolo';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

const T0 = 2_000_000;
const SEED_MESTRE = 123_456_789;

/**
 * Seeds FIXAS e distintivas — nada de valores pequenos ou repetidos.
 *
 * 🔒 A varredura de segredo faz `JSON.stringify(publico).not.toContain(String(seed))`,
 * e isso é frágil com valores curtos: `7` casaria com qualquer `seq: 7` do
 * snapshot (vermelho falso) e um valor que já apareça noutro campo passaria
 * raspando (verde falso). Estes são de 9 dígitos, mutuamente distintos, e
 * nenhum deles é derivável da `SEED_MESTRE`.
 */
const SEEDS = {
  etapas: [
    811_000_001, 811_000_002, 811_000_003, 811_000_004, 811_000_005, 811_000_006, 811_000_007,
    811_000_008, 811_000_009, 811_000_010,
  ],
  calendario: 922_000_777,
};

let contadorToken = 0;
const reduzir = (estado: EstadoSala, comando: ComandoSala, remetenteId: string | null) =>
  reduzirSala(estado, comando, remetenteId, T0, `token-${(contadorToken += 1)}`);

function ok(estado: EstadoSala, comando: ComandoSala, remetenteId: string | null): EstadoSala {
  const r = reduzir(estado, comando, remetenteId);
  if (r.erro !== null) throw new Error(`comando ${comando.tipo} recusado: ${r.erro}`);
  return r.estado;
}

function salaVazia(dificuldade: Dificuldade = 'dificil'): EstadoSala {
  return criarSala('A3F9C2', SEED_MESTRE, dificuldade, T0, SEEDS);
}

/** Sala iniciada com `n` humanos — draft criado, fase 'sorteios'. */
function salaIniciada(n: number): EstadoSala {
  let sala = salaVazia();
  for (let i = 0; i < n; i += 1) sala = ok(sala, { tipo: 'entrar', nome: `Jogador ${i + 1}` }, null);
  for (const jogador of sala.jogadores) sala = ok(sala, { tipo: 'pronto', pronto: true }, jogador.id);
  return ok(sala, { tipo: 'iniciar' }, sala.anfitriaoId);
}

/** Mesma sala, com o draft forçado pra outra fase — só `fase` importa aqui. */
function comFaseDraft(sala: EstadoSala, fase: FaseDraftRede): EstadoSala {
  return { ...sala, draft: { ...sala.draft!, fase } };
}

/** Sala com o draft CONCLUÍDO: o estado em que o portão abre. */
const salaConcluida = (n = 3): EstadoSala => comFaseDraft(salaIniciada(n), 'concluido');

/**
 * O que o Durable Object realmente faz com o estado: `ctx.storage.put` +
 * `get`, que é serialização JSON. **É a reidratação, não uma imitação dela** —
 * qualquer coisa que não sobreviva a isto não sobrevive a um despejo.
 */
function reidratar(sala: EstadoSala): EstadoSala {
  return JSON.parse(JSON.stringify(sala)) as EstadoSala;
}

describe('conformidade com a engine (o que NÃO pode divergir em silêncio)', () => {
  it('N_ETAPAS_CURTA é o mesmo 5 de N_ETAPAS.curta', () => {
    // ⚠️ A constante é duplicada de propósito: importar de `campeonato.ts`
    // arrastaria `simularQuali`/`simularCorrida`/`resolverCarro` para o grafo
    // do Durable Object (os dois primeiros são import de RUNTIME lá), e a
    // cerca de lint não pegaria — ela casa especificador, não grafo
    // transitivo. Este teste é o que impede as duas de divergirem, no mesmo
    // padrão do `QTD_JOGADORES` (pendência 0(a)).
    expect(N_ETAPAS_CURTA).toBe(N_ETAPAS.curta);
  });

  it('sorteia MAX_ETAPAS slots + 1, e MAX_ETAPAS é N_ETAPAS.completa', () => {
    // Sortear sempre o máximo desacopla o sorteio do formato: restaurar o
    // seletor que o CORTE 3.5-F removeu não mexe no sorteio.
    expect(MAX_ETAPAS).toBe(N_ETAPAS.completa);
    expect(SLOTS_SEEDS).toBe(MAX_ETAPAS + 1);
    expect(N_ETAPAS_CURTA).toBeLessThanOrEqual(MAX_ETAPAS);
  });

  it('o calendário sorteado não repete pista', () => {
    const calendario = calendarioSorteado(dataset, SEEDS.calendario, 'curta');
    expect(calendario).toHaveLength(N_ETAPAS_CURTA);
    expect(new Set(calendario).size, `pista repetida em ${calendario.join(',')}`).toBe(
      N_ETAPAS_CURTA,
    );
    // Anti-vacuidade: a asserção acima só vale se o calendário for de pistas
    // de verdade, não de `undefined` repetido.
    for (const pistaId of calendario) {
      expect(dataset.pistas.some((p) => p.id === pistaId), `pista fantasma: ${pistaId}`).toBe(true);
    }
  });
});

describe('🔴 (a) AS SEEDS SOBREVIVEM À REIDRATAÇÃO DO DURABLE OBJECT', () => {
  /**
   * O requisito não-negociável do dev, e reincidência conhecida: reidratação
   * de storage já foi bloqueante de revisão no PR 3/4. Se as seeds não
   * sobreviverem, um despejo no meio do campeonato re-sorteia as etapas
   * futuras e o jogador corre uma corrida diferente da que atestou — quebra de
   * determinismo SILENCIOSA.
   *
   * 🔑 **Mata M1** (`seedsEtapas` como `Uint32Array`): um `Uint32Array` não
   * sobrevive a JSON, vira `{"0":…,"1":…}` e `Array.isArray` passa a ser
   * `false`.
   */
  it('seedsEtapas e seedCalendario atravessam o round-trip JSON idênticos', () => {
    const antes = salaConcluida();
    const depois = reidratar(antes);

    expect(Array.isArray(depois.seedsEtapas), 'seedsEtapas deixou de ser array').toBe(true);
    expect(depois.seedsEtapas).toEqual(SEEDS.etapas);
    expect(depois.seedCalendario).toBe(SEEDS.calendario);
    expect(depois.versaoSala).toBe(VERSAO_ESTADO_SALA);
  });

  it('a sala reidratada continua "ok" e publica exatamente as mesmas seeds', () => {
    const antes = salaConcluida();
    const depois = reidratar(antes);

    expect(estadoDasSeeds(depois).tipo).toBe('ok');
    expect(publicarSala(depois).seedsAbertas).toEqual(publicarSala(antes).seedsAbertas);
    expect(publicarSala(depois).seedCalendario).toBe(publicarSala(antes).seedCalendario);
  });

  it('anti-vacuidade: o round-trip REALMENTE destrói um Uint32Array', () => {
    // Sem isto, o teste acima passaria mesmo que `reidratar` não serializasse
    // nada. Aqui se prova que a serialização é a de verdade e que a forma
    // errada seria pega.
    const comTipado = { seeds: new Uint32Array([1, 2, 3]) };
    const voltou = JSON.parse(JSON.stringify(comTipado)) as { seeds: unknown };
    expect(Array.isArray(voltou.seeds)).toBe(false);
    expect(voltou.seeds).toEqual({ '0': 1, '1': 2, '2': 3 });
  });
});

describe('🔴 (b) AS SEEDS SÃO EXTRAÍVEIS PARA RELATÓRIO DE BUG (lado do operador)', () => {
  /**
   * Palavras do dev: *"hoje um bug de corrida se reproduz com uma seed; num
   * campeonato `B-indep` preciso das 11."* Sob seeds independentes nada é
   * reconstituível a partir da `seedMestre`, então sem via de extração o
   * determinismo vira promessa não verificável.
   *
   * 🔑 O teste parte do BLOB PERSISTIDO, não de um objeto em memória — asserir
   * sobre o formato de persistência é o que torna isto não-circular. Um
   * formatador cujo único chamador é o próprio teste não provaria nada.
   *
   * 🔑 **Mata M2** (reordenar `seedsEtapas` na forma persistida): a etapa k
   * deixa de reproduzir.
   */
  it('do blob persistido sai a seed de CADA etapa, e ela reproduz a etapa', () => {
    const persistido = reidratar(salaConcluida());
    const seeds = estadoDasSeeds(persistido);
    expect(seeds.tipo).toBe('ok');
    if (seeds.tipo !== 'ok') return;

    const calendario = calendarioSorteado(dataset, seeds.calendario, 'curta');

    for (let k = 0; k < N_ETAPAS_CURTA; k += 1) {
      // O que o operador computa a partir do relatório...
      const doOperador = seedDaEtapa(seeds.etapas[k], calendario[k]);
      // ...tem que ser o que o CLIENTE computaria com a seed publicada
      // daquela etapa. Recomposto de forma independente, sem reusar a
      // variável acima.
      const doCliente = seedDaEtapa(
        SEEDS.etapas[k],
        calendarioSorteado(dataset, SEEDS.calendario, 'curta')[k],
      );
      expect(doOperador, `etapa ${k} não reproduz`).toBe(doCliente);
    }
  });

  it('relatorioDeSeeds imprime as 11 seeds a partir do blob persistido', () => {
    const persistido = reidratar(salaConcluida());
    const relatorio = relatorioDeSeeds(persistido);

    expect(relatorio).toContain(`seedCalendario=${SEEDS.calendario}`);
    for (let k = 0; k < MAX_ETAPAS; k += 1) {
      expect(relatorio, `etapa ${k} fora do relatório`).toContain(`etapa[${k}]=${SEEDS.etapas[k]}`);
    }
  });

  it('o relatório distingue legado, corrompida e ok — não diz "ok" pra sala quebrada', () => {
    const legado = reidratar(salaConcluida());
    delete legado.versaoSala;
    delete legado.seedsEtapas;
    delete legado.seedCalendario;
    expect(relatorioDeSeeds(legado)).toContain('antes do 3.5.1');

    const quebrada = reidratar(salaConcluida());
    delete quebrada.seedsEtapas;
    expect(relatorioDeSeeds(quebrada)).toContain('SEEDS CORROMPIDAS');
  });

  it('🔒 a extração do operador NÃO aparece no fio', () => {
    // A contrapartida obrigatória de (b): a via existe, mas é do lado do
    // operador. Se o relatório vazasse no snapshot, a extração teria virado
    // exatamente o vazamento que `seedsEtapas` existe pra evitar.
    const sala = salaConcluida();
    const fio = JSON.stringify(publicarSala(sala));
    for (let k = N_ETAPAS_CURTA; k < MAX_ETAPAS; k += 1) {
      expect(fio, `a etapa futura ${k} vazou no fio`).not.toContain(String(SEEDS.etapas[k]));
    }
  });
});

describe('🔒 o snapshot não vaza segredo (varredura, não campo a campo)', () => {
  /**
   * Varredura de `JSON.stringify`, e não conferência campo a campo: campo a
   * campo só pega o que quem escreve o teste lembrou de listar, e o segredo
   * que vaza é justamente o que ninguém listou — foi assim que `tokens` quase
   * vazou no 3.2.1.
   *
   * 🔑 **Mata M3** (`publicarSala` com spread menos os segredos conhecidos).
   */
  const segredosDe = (sala: EstadoSala): { nome: string; valor: string }[] => [
    { nome: 'seedMestre', valor: String(sala.seedMestre) },
    ...Object.entries(sala.tokens).map(([id, t]) => ({ nome: `token de ${id}`, valor: t })),
    // As etapas FUTURAS: as abertas podem (e devem) aparecer.
    ...SEEDS.etapas.slice(1).map((s, i) => ({ nome: `seed da etapa ${i + 1}`, valor: String(s) })),
  ];

  it('nenhum segredo aparece no snapshot, com o draft em sorteios', () => {
    const sala = salaIniciada(3);
    const fio = JSON.stringify(publicarSala(sala));
    for (const { nome, valor } of segredosDe(sala)) {
      expect(fio, `vazou ${nome}`).not.toContain(valor);
    }
    // Antes de concluir, NEM a etapa 0 sai.
    expect(fio).not.toContain(String(SEEDS.etapas[0]));
    expect(fio).not.toContain(String(SEEDS.calendario));
  });

  it('nenhum segredo aparece no snapshot COM O DRAFT CONCLUÍDO', () => {
    // O estado que importa: é aqui que calendário e etapa 0 passam a sair, e
    // onde um spread descuidado levaria o resto junto.
    const sala = salaConcluida();
    const fio = JSON.stringify(publicarSala(sala));
    for (const { nome, valor } of segredosDe(sala)) {
      expect(fio, `vazou ${nome}`).not.toContain(valor);
    }
  });

  it('anti-vacuidade: a varredura PEGA um vazamento plantado', () => {
    // Sem este caso, a varredura passaria mesmo se `publicarSala` devolvesse
    // `{}` — e um teste que não pode falhar se lê como cobertura sem ser.
    const sala = salaConcluida();
    const comVazamento = {
      ...publicarSala(sala),
      // exatamente o que M3 (spread) faria entrar sem querer:
      seedsEtapas: sala.seedsEtapas,
      seedMestre: sala.seedMestre,
    };
    const fio = JSON.stringify(comVazamento);
    const pegos = segredosDe(sala).filter(({ valor }) => fio.includes(valor));
    expect(pegos.length, 'a varredura não pegaria um vazamento real').toBeGreaterThan(0);
    expect(fio).toContain(String(sala.seedMestre));
  });

  it('os valores de fixture são distinguíveis — a varredura não é frágil por acidente', () => {
    // Guarda contra vermelho/verde falso por substring curta: todas as seeds
    // têm 9 dígitos e são mutuamente distintas.
    const todos = [...SEEDS.etapas, SEEDS.calendario, SEED_MESTRE];
    expect(new Set(todos).size, 'valores de fixture coincidiram').toBe(todos.length);
    for (const v of todos) expect(String(v).length).toBeGreaterThanOrEqual(9);
  });
});

describe('🔒 seedsAbertas — só as abertas, nunca as futuras', () => {
  /** 🔑 **Mata M4** (`slice(0, etapaAtual + 2)`). */
  it('draft em sorteios ⇒ [] (mesmo portão de seedCorrida)', () => {
    const publico = publicarSala(salaIniciada(3));
    expect(publico.seedsAbertas).toEqual([]);
    expect(publico.seedCalendario).toBeNull();
    expect(publico.seedCorrida).toBeNull();
  });

  it('lobby (draft === null) ⇒ []', () => {
    const publico = publicarSala(salaVazia());
    expect(publico.seedsAbertas).toEqual([]);
    expect(publico.seedCalendario).toBeNull();
  });

  it('🔑 draft concluído com o cursor em 0 ⇒ EXATAMENTE UMA seed aberta', () => {
    const publico = publicarSala(salaConcluida());
    expect(publico.seedsAbertas).toHaveLength(1);
    expect(publico.seedsAbertas[0]).toBe(SEEDS.etapas[0]);
    expect(publico.etapaAtual).toBe(0);
    expect(publico.nEtapas).toBe(N_ETAPAS_CURTA);
  });

  it('o cursor NÃO avança neste PR — publicar só a etapa 0 é o escopo', () => {
    const sala = salaConcluida();
    expect(sala.etapaAtual).toBe(0);
    expect(publicarSala(sala).seedsAbertas).toEqual([SEEDS.etapas[0]]);
  });

  it('com o cursor adiantado à mão, abertas acompanham — e param em nEtapas', () => {
    // O 3.5.2 é quem move o cursor; aqui se prova que o RECORTE está certo
    // antes de existir quem o mova, e que ele satura em `N_ETAPAS_CURTA` em
    // vez de vazar as 10 sorteadas.
    const base = salaConcluida();
    expect(publicarSala({ ...base, etapaAtual: 2 }).seedsAbertas).toEqual(
      SEEDS.etapas.slice(0, 3),
    );
    const noFim = publicarSala({ ...base, etapaAtual: MAX_ETAPAS + 5 });
    expect(noFim.seedsAbertas).toHaveLength(N_ETAPAS_CURTA);
    expect(noFim.seedsAbertas).toEqual(SEEDS.etapas.slice(0, N_ETAPAS_CURTA));
  });

  it('🔑 conformidade: seedDaEtapa(seedsAbertas[0], calendário[0]) é o que o cliente computa', () => {
    const publico = publicarSala(salaConcluida());
    expect(publico.seedCalendario).not.toBeNull();

    // Recomposto de forma INDEPENDENTE: do snapshot público, como um cliente
    // faria, sem tocar em `SEEDS` nem no estado interno.
    const calendario = calendarioSorteado(dataset, publico.seedCalendario!, 'curta');
    const doCliente = seedDaEtapa(publico.seedsAbertas[0], calendario[0]);

    expect(doCliente).toBe(seedDaEtapa(SEEDS.etapas[0], calendario[0]));
    // E o rótulo é o do offline (`camp:<pistaId>`), não um esquema paralelo —
    // inventar um seria a classe de bug do 8.4.
    expect(doCliente).toBe(deriveSeed(SEEDS.etapas[0], `camp:${calendario[0]}`));
  });
});

describe('🔑 B-indep: as seeds são SORTEADAS, não derivadas', () => {
  /**
   * 🔑 **Mata M5** (derivar por índice) **e M6** (recoplar o 11º slot).
   *
   * Esta é a asserção que carrega a decisão D1. Derivar por índice compraria
   * zero contra a pendência 0(i): recomposta a `seedMestre`, todas as etapas
   * cairiam juntas. Com seeds independentes, saber a etapa 1 não diz nada
   * sobre a 2 — e a ordenação de fase deixa de importar.
   */
  const ROTULOS_PLAUSIVEIS = (k: number) => [
    `online:etapa:${k}`,
    `online:etapa${k}`,
    `etapa:${k}`,
    `camp:${k}`,
    'online:calendario',
    'online:campeonato',
  ];

  it('nenhuma seed de etapa é derivável da seedMestre por rótulo plausível', () => {
    const sala = salaConcluida();
    const seeds = estadoDasSeeds(sala);
    if (seeds.tipo !== 'ok') throw new Error('fixture quebrada');

    for (let k = 0; k < MAX_ETAPAS; k += 1) {
      for (const rotulo of ROTULOS_PLAUSIVEIS(k)) {
        expect(
          seeds.etapas[k],
          `a etapa ${k} bate com deriveSeed(seedMestre, '${rotulo}') — isso é derivação, não sorteio`,
        ).not.toBe(deriveSeed(sala.seedMestre, rotulo));
      }
    }
  });

  it('a seed do calendário não é derivável da seedMestre nem igual à etapa 0', () => {
    const sala = salaConcluida();
    for (const rotulo of ROTULOS_PLAUSIVEIS(0)) {
      expect(sala.seedCalendario).not.toBe(deriveSeed(sala.seedMestre, rotulo));
    }
    // 🔒 O 11º slot NÃO é `seedsEtapas[0]` reusado — decisão travada, contra
    // alguém "simplificar" o sorteio depois e recoplar os dois.
    expect(sala.seedCalendario).not.toBe(sala.seedsEtapas![0]);
  });

  it('as 11 seeds são mutuamente distintas', () => {
    const sala = salaConcluida();
    const todas = [...sala.seedsEtapas!, sala.seedCalendario!];
    expect(todas).toHaveLength(SLOTS_SEEDS);
    expect(new Set(todas).size, 'duas seeds coincidiram — sorteio recoplado?').toBe(SLOTS_SEEDS);
  });

  it('anti-vacuidade: o teste de derivação PEGA uma sala derivada', () => {
    // Sem isto, a asserção acima passaria com qualquer fixture — inclusive uma
    // em que ninguém sorteou nada. Aqui se constrói de propósito a sala que o
    // `B-indep` proíbe e se exige que a asserção caia.
    const derivada: EstadoSala = {
      ...salaConcluida(),
      seedsEtapas: Array.from({ length: MAX_ETAPAS }, (_, k) =>
        deriveSeed(SEED_MESTRE, `online:etapa:${k}`),
      ),
      seedCalendario: deriveSeed(SEED_MESTRE, 'online:calendario'),
    };
    const derivavel = derivada.seedsEtapas!.some((seed, k) =>
      ROTULOS_PLAUSIVEIS(k).some((r) => seed === deriveSeed(derivada.seedMestre, r)),
    );
    expect(derivavel, 'a asserção de independência não pegaria uma sala derivada').toBe(true);
  });
});

describe('🔴 M7 — seeds PERDIDAS não são sala nova (o discriminante)', () => {
  /**
   * O achado do dev sobre a leitura defensiva: `?? []` está certo para sala
   * criada antes deste PR, mas não distingue duas situações que precisam ser
   * distinguidas. Sala que TINHA seeds e as perdeu na reidratação, tratada
   * como sala nova, re-sortearia em silêncio — o requisito (a) furado pela
   * porta do conserto.
   *
   * 🔑 **Mata M7** (`estadoDasSeeds` → `sala.seedsEtapas ?? []`): com o `??`,
   * legado e corrompida colapsam e as asserções de distinção caem.
   */
  it('sala pós-3.5.1 é "ok"; sala sem versaoSala é "legado"', () => {
    expect(estadoDasSeeds(salaConcluida()).tipo).toBe('ok');

    const antiga = reidratar(salaConcluida());
    delete antiga.versaoSala;
    delete antiga.seedsEtapas;
    delete antiga.seedCalendario;
    expect(estadoDasSeeds(antiga).tipo).toBe('legado');
  });

  it('🔒 sala INICIADA pós-3.5.1 com as seeds apagadas é CORROMPIDA, não vazia', () => {
    const quebrada = reidratar(salaConcluida());
    expect(quebrada.versaoSala).toBe(VERSAO_ESTADO_SALA); // pré-condição
    delete quebrada.seedsEtapas;

    const estado = estadoDasSeeds(quebrada);
    expect(estado.tipo).toBe('corrompida');
    expect(estado.tipo === 'corrompida' && estado.motivo).toContain('pós-3.5.1');
  });

  it('corrompida e legado NÃO são a mesma coisa — é isso que o `??` colapsaria', () => {
    const legado = reidratar(salaConcluida());
    delete legado.versaoSala;
    delete legado.seedsEtapas;
    delete legado.seedCalendario;

    const corrompida = reidratar(salaConcluida());
    delete corrompida.seedsEtapas;

    expect(estadoDasSeeds(legado).tipo).not.toBe(estadoDasSeeds(corrompida).tipo);
  });

  it('as formas de corrupção que um JSON torto produz são todas pegas', () => {
    const casos: { nome: string; quebrar: (s: EstadoSala) => void }[] = [
      { nome: 'seedsEtapas ausente', quebrar: (s) => delete s.seedsEtapas },
      { nome: 'seedCalendario ausente', quebrar: (s) => delete s.seedCalendario },
      { nome: 'seedsEtapas curto', quebrar: (s) => void (s.seedsEtapas = [1, 2, 3]) },
      { nome: 'seedsEtapas longo', quebrar: (s) => void (s.seedsEtapas = [...SEEDS.etapas, 9]) },
      {
        // Exatamente o que M1 produz: `Uint32Array` que virou objeto indexado.
        nome: 'seedsEtapas virou objeto indexado',
        quebrar: (s) => void ((s as unknown as { seedsEtapas: unknown }).seedsEtapas = { '0': 1 }),
      },
      {
        nome: 'slot não-uint32',
        quebrar: (s) => void (s.seedsEtapas = [...SEEDS.etapas.slice(0, 9), -1]),
      },
      { nome: 'slot fracionário', quebrar: (s) => void (s.seedsEtapas = [...SEEDS.etapas.slice(0, 9), 1.5]) },
    ];

    for (const { nome, quebrar } of casos) {
      const sala = reidratar(salaConcluida());
      quebrar(sala);
      expect(estadoDasSeeds(sala).tipo, `passou batido: ${nome}`).toBe('corrompida');
    }
  });

  it('sala corrompida NÃO publica seed nenhuma — nem inventa uma', () => {
    const quebrada = reidratar(salaConcluida());
    delete quebrada.seedsEtapas;
    const publico = publicarSala(quebrada);
    expect(publico.seedsAbertas).toEqual([]);
    expect(publico.seedCalendario).toBeNull();
  });
});
