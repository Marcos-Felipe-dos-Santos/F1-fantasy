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

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  return criarSala('A3F9C2', SEED_MESTRE, dificuldade, T0, SEEDS, N_ETAPAS_CURTA);
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

  it('🔒 o que o relatório mostra a MAIS que o fio são as etapas ainda fechadas', () => {
    // ⚠️ Este teste já se chamou "a extração do operador NÃO aparece no fio",
    // e o nome MENTIA (aviso A4 da revisão): parte do relatório — a
    // `seedCalendario` e a etapa 0 — aparece no fio de propósito depois que o
    // draft conclui. O nome afirmava um bloqueio total que não existe, que é o
    // mesmo defeito de rótulo que o PR 4/4 corrigiu na tela.
    //
    // O que É verdade, e o que se confere aqui: tudo o que o relatório tem e o
    // fio não tem são as etapas ainda FECHADAS. E o corpo agora parte do
    // relatório de verdade, em vez de reimplementar a lista à mão.
    const sala = salaConcluida();
    const relatorio = relatorioDeSeeds(sala);
    const fio = JSON.stringify(publicarSala(sala));

    const publicas = new Set([String(SEEDS.etapas[0]), String(SEEDS.calendario)]);
    const noRelatorio = [...relatorio.matchAll(/=(\d{6,})/g)].map((m) => m[1]);
    expect(noRelatorio.length, 'o relatório não listou seed nenhuma').toBeGreaterThan(0);

    for (const valor of noRelatorio) {
      if (publicas.has(valor)) {
        expect(fio, `${valor} é pública e deveria estar no fio`).toContain(valor);
      } else {
        expect(fio, `${valor} está no relatório e VAZOU no fio`).not.toContain(valor);
      }
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
    expect(fio).toContain(String(sala.seedMestre));
    // 🔒 Exige que a varredura pegue especificamente uma SEED DE ETAPA (aviso
    // A3 da revisão). Com só `pegos.length > 0`, uma mutação que apagasse as
    // entradas de etapa de `segredosDe` continuaria passando aqui — pelo
    // `seedMestre` — e o teste principal pararia de checar seed EM SILÊNCIO.
    // Anti-vacuidade que não distingue qual asserção sobrou é ela própria vaga.
    expect(
      pegos.map((p) => p.nome).filter((n) => n.startsWith('seed da etapa')),
      'a varredura não cobre mais as seeds de etapa',
    ).not.toEqual([]);
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

  it('o cursor avança desde o 3.5.2 — na etapa 0 sai só a etapa 0', () => {
    const sala = salaConcluida();
    expect(sala.etapaAtual).toBe(0);
    expect(publicarSala(sala).seedsAbertas).toEqual([SEEDS.etapas[0]]);
  });

  it('com o cursor adiantado, abertas acompanham — e param em nEtapas', () => {
    // O RECORTE: cursor k ⇒ as k+1 primeiras seeds, nunca as futuras, e nunca
    // mais que `nEtapas` das 10 sorteadas.
    const base = salaConcluida();
    expect(publicarSala({ ...base, etapaAtual: 2 }).seedsAbertas).toEqual(
      SEEDS.etapas.slice(0, 3),
    );
    // 🔒 A ÚLTIMA etapa é o teto legal do cursor desde o 3.5.2, e é aqui que
    // se prova que o recorte satura nela em vez de vazar as 10.
    const noFim = publicarSala({ ...base, etapaAtual: N_ETAPAS_CURTA - 1 });
    expect(noFim.seedsAbertas).toHaveLength(N_ETAPAS_CURTA);
    expect(noFim.seedsAbertas).toEqual(SEEDS.etapas.slice(0, N_ETAPAS_CURTA));
  });

  it('🔒 cursor VÁLIDO: a invariante dos três campos publicados vale', () => {
    // Aviso A1 da revisão do 3.5.1: `seedsAbertas` saturava mas `etapaAtual`
    // ia cru, e o teste ABENÇOAVA a inconsistência (olhava as seeds e não o
    // cursor). Um snapshot com `etapaAtual: 15`, `nEtapas: 5` e 5 seeds faria
    // o cliente do 3.5.3 indexar `calendario[15]` e pegar `undefined`.
    const base = salaConcluida();
    for (let cursor = 0; cursor < N_ETAPAS_CURTA; cursor += 1) {
      const publico = publicarSala({ ...base, etapaAtual: cursor });
      expect(publico.etapaAtual, `cursor ${cursor} saiu fora da faixa`).toBe(cursor);
      expect(publico.etapaAtual, `cursor ${cursor} passou de nEtapas`).toBeLessThan(
        publico.nEtapas,
      );
      expect(publico.seedsAbertas, `invariante quebrada no cursor ${cursor}`).toHaveLength(
        Math.min(publico.etapaAtual + 1, publico.nEtapas),
      );
    }
  });

  it('🟠 PENDÊNCIA 0(t): cursor INVÁLIDO ⇒ o snapshot SE CONTRADIZ (registrado, não consertado)', () => {
    // 🔴 Este teste NÃO abençoa o comportamento — ele o TRAVA para que a
    // pendência 0(t) não possa mudar de forma sem alguém perceber. Ver
    // `ESTADO.md` §Pendências 0(t).
    //
    // O que mudou no 3.5.2: `cursorPublicavel` CLAMPA o cursor, mas
    // `seedsAbertasDe` passa por `estadoDasSeeds`, que agora reprova cursor
    // fora de faixa e devolve `corrompida` ⇒ `[]`. Os dois leitores do mesmo
    // snapshot passaram a responder a autoridades diferentes, e a invariante
    // `seedsAbertas.length === min(etapaAtual + 1, nEtapas)` **quebra**.
    //
    // 🔑 A invariante deixou de ser LOCAL: ela só vale porque a casca recusa a
    // sala `corrompida` ANTES de publicá-la. Nenhuma sala de produção chega
    // aqui — o servidor nunca grava cursor fora de faixa, e por isso os
    // valores abaixo precisam ser forjados à mão.
    const base = salaConcluida();
    for (const cursor of [N_ETAPAS_CURTA, MAX_ETAPAS + 5, -3]) {
      const publico = publicarSala({ ...base, etapaAtual: cursor });

      // O clamp continua fazendo a parte dele: o cursor publicado é legal.
      expect(publico.etapaAtual, `cursor ${cursor} vazou cru`).toBeGreaterThanOrEqual(0);
      expect(publico.etapaAtual, `cursor ${cursor} passou de nEtapas`).toBeLessThan(
        publico.nEtapas,
      );
      // E o vazamento é para MENOS, nunca para mais: zero seed publicada.
      expect(publico.seedsAbertas, `cursor ${cursor} vazou seed de sala corrompida`).toEqual([]);
      expect(estadoDasSeeds({ ...base, etapaAtual: cursor }).tipo).toBe('corrompida');
    }
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

describe('🔴 CERCA DO SÍTIO QUE REALMENTE SORTEIA (`party/sala.ts`)', () => {
  /**
   * 🔴 **BLOQUEANTE DA REVISÃO, e o achado mais importante do PR.** Todo o
   * bloco `B-indep` acima exercita `criarSala(..., SEEDS, N_ETAPAS_CURTA)` com uma FIXTURE
   * LITERAL. Provar que `811_000_001 !== deriveSeed(123_456_789, …)` é
   * aritmética sobre constantes do próprio teste — **não diz nada sobre
   * produção.** Quem sorteia de verdade é `party/sala.ts`, e `party/` tem
   * cobertura automatizada ZERO: nada o importa, `cerca-lint.test.ts` roda o
   * ESLint sobre arquivos sintéticos, e `contrato-corrida-online.test.ts`
   * exclui `party/` da varredura de propósito.
   *
   * **Medido, não deduzido:** as mutações M5 (derivar por índice) e M6
   * (recoplar o 11º slot) aplicadas DENTRO de `party/sala.ts` deixaram a suíte
   * inteira **verde — 1509/63**. A tabela de mutações do cabeçalho declarava
   * cobertura que não existia onde importa. É a família "o teste afirmava o
   * que não conferia", agora na camada que ninguém testa.
   *
   * A cerca é TEXTUAL, no idioma que o projeto já usa (`namespaces-seed.test.ts`,
   * `contrato-ausente.test.ts`): não dá pra instanciar um Durable Object aqui,
   * mas dá pra exigir que o sorteio esteja escrito do jeito certo.
   *
   * ## 🔒 A MATRIZ DE COBERTURA (PR B do spike, 2026-08-19) — cada linha MEDIDA
   *
   * Desde o PR B existe cobertura COMPORTAMENTAL do sítio real, em
   * `party/seeds.test.ts`, rodando dentro do `workerd`
   * (`npm run test:party` — config à parte, fora do `npm test`). Isto NÃO torna
   * esta cerca redundante, e a matriz é o registro de por quê:
   *
   * | Mutação | esta cerca | comportamental | serve de baseline? |
   * |---|---|---|---|
   * | **M5** `seedsEtapas[k] = deriveSeed(…)` | SIM | **NÃO, nunca** | — |
   * | **M6** `seedCalendario = seedsEtapas[0]` | SIM | SIM | não: a cerca cai junto |
   * | **MR** `const todas = slots` (sem `Array.from`) | SIM | SIM | **não**: cerca cai + TS2740 |
   * | **MA** `todas[MAX_ETAPAS] = todas[0]` | **NÃO** | SIM | ✅ sorteio |
   * | **MC** `carregar()` não lê o storage | **NÃO** | SIM | ✅ reidratação |
   *
   * 🔒 **A CERCA TEXTUAL PERMANECE, E PERMANECE POR CAUSA DE M5.** Seeds
   * derivadas por índice também são distintas entre si e entre salas: nenhuma
   * asserção comportamental pega M5, hoje nem nunca. E não dá para fixar a
   * `seedMestre` e comparar salas, porque `criar()` só roda com o storage
   * vazio. **Quem apagar esta cerca citando "agora tem cobertura de verdade"
   * reabre o buraco** — é o risco R3 do plano do spike, escrito aqui para que o
   * próximo leitor não precise deduzi-lo.
   *
   * ⚠️ **MR era baseline no plano aprovado e foi DISQUALIFICADO por medição**
   * (2026-08-19), por dois motivos independentes: ele derruba a exigência
   * `const todas = Array.from(slots)` mais abaixo — logo as duas cercas ficariam
   * vermelhas juntas, que é exatamente por que M5/M6 já tinham sido recusadas
   * como baseline — e `Uint32Array` não é atribuível a `number[]`, o que dá
   * **TS2740**, vermelho de compilação, que não conta.
   */
  const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

  /**
   * A fonte da casca SEM COMENTÁRIOS.
   *
   * ⚠️ Necessário, não estético: `party/sala.ts:232` explica num comentário por
   * que o token NÃO usa `deriveSeed(seedMestre, …)`. Um cheque cego por
   * substring reprova a casca correta por causa da prosa que documenta a
   * decisão certa — foi o que aconteceu na primeira versão desta cerca, e quem
   * pegou foi a asserção anti-vacuidade que exige que a casca REAL passe.
   */
  const semComentarios = (fonte: string): string =>
    fonte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

  const fonteDaCasca = (): string =>
    semComentarios(readFileSync(join(RAIZ, 'party', 'sala.ts'), 'utf8'));

  /**
   * As três propriedades que fazem o sorteio ser sorteio. Cada uma é a negação
   * exata de uma mutação: (1) e (2) matam M5, (3) mata M6.
   *
   * ⚠️ **PREDICADO, não regex de negação.** A primeira versão desta cerca usava
   * `/^(?!.*\bderiveSeed\b)[\s\S]*$/` para dizer "não contém `deriveSeed`", e
   * ela era **falso-negativo**: sem a flag `m`, o `.*` do lookahead cobre só a
   * PRIMEIRA linha, então a cerca passava com `deriveSeed` na linha 2. Medido,
   * não suposto — e é a repetição literal do "regex furado na cerca" que a
   * Fase 3 já pagou uma vez. Negação se escreve com `includes`, não com
   * lookahead.
   */
  const EXIGENCIAS: { nome: string; checa: (fonte: string) => boolean; mata: string }[] = [
    {
      nome: 'sorteia SLOTS_SEEDS slots com crypto.getRandomValues',
      checa: (f) => /new Uint32Array\(SLOTS_SEEDS\)[\s\S]{0,200}?crypto\.getRandomValues\(/.test(f),
      mata: 'M5 — derivar por índice em vez de sortear',
    },
    {
      nome: 'a casca NÃO deriva seed nenhuma',
      // `deriveSeed` na casca só pode significar uma coisa: alguém trocou o
      // sorteio por derivação, e o `B-indep` morreu em silêncio.
      checa: (f) => !f.includes('deriveSeed('),
      mata: 'M5 — derivar por índice em vez de sortear',
    },
    {
      nome: 'o calendário vem do 11º slot, não de etapas[0]',
      checa: (f) => /calendario:\s*todas\[MAX_ETAPAS\]/.test(f),
      mata: 'M6 — recoplar o 11º slot em seedsEtapas[0]',
    },
  ];

  it.each(EXIGENCIAS)('party/sala.ts $nome (mata $mata)', ({ checa }) => {
    expect(checa(fonteDaCasca())).toBe(true);
  });

  it('as etapas saem do MESMO sorteio, fatiado — não de um segundo sorteio', () => {
    // Se as etapas viessem de um `getRandomValues` e o calendário de outro, o
    // 11º slot deixaria de ser "o 11º slot" e a decisão travada perderia
    // sentido, mesmo continuando independente por acaso.
    expect(fonteDaCasca()).toMatch(/etapas:\s*todas\.slice\(0, MAX_ETAPAS\)/);
  });

  it('🔒 anti-vacuidade: a cerca REPROVA cada mutação, aplicada ao texto', () => {
    // Sem isto, os `toMatch` acima passariam por acidente de regex — que é
    // exatamente como a cerca do 3.2 furou (regex falso-negativo continuava
    // verde com a sabotagem aplicada). Aqui cada mutação é aplicada ao TEXTO e
    // se exige que a exigência correspondente caia.
    const original = fonteDaCasca();
    const reprovadas = (fonte: string): string[] =>
      EXIGENCIAS.filter(({ checa }) => !checa(fonte)).map(({ nome }) => nome);

    expect(reprovadas(original), 'a casca de verdade já reprova — cerca sem sentido').toEqual([]);

    // A remoção de comentários não pode virar buraco: `deriveSeed(` dentro de
    // um comentário é prosa e deve passar, mas em CÓDIGO tem que reprovar.
    expect(reprovadas(semComentarios('// deriveSeed(x, y)\nconst a = 1;'))).not.toContain(
      'a casca NÃO deriva seed nenhuma',
    );
    expect(reprovadas(semComentarios('const a = deriveSeed(x, y);'))).toContain(
      'a casca NÃO deriva seed nenhuma',
    );

    // M5 escrita como ela seria de fato: o sorteio continua no arquivo (código
    // morto), e só o consumo muda pra derivação. É o caso mais difícil, e o que
    // a versão com regex de negação deixava passar.
    const comM5 = original.replace(
      'etapas: todas.slice(0, MAX_ETAPAS),',
      'etapas: mapa((k) => deriveSeed(semente[0], k)),',
    );
    expect(comM5, 'a mutação de teste não mudou nada').not.toBe(original);
    expect(reprovadas(comM5), 'a cerca não pegaria M5 no sítio real').toContain(
      'a casca NÃO deriva seed nenhuma',
    );

    const comM6 = original.replace('calendario: todas[MAX_ETAPAS],', 'calendario: todas[0],');
    expect(comM6).not.toBe(original);
    expect(reprovadas(comM6), 'a cerca não pegaria M6 no sítio real').toContain(
      'o calendário vem do 11º slot, não de etapas[0]',
    );
  });

  it('a casca converte pra number[] antes de guardar (Array.from na fronteira)', () => {
    // O par textual de M1: sem `Array.from`, o `Uint32Array` chega ao estado e
    // a sala é RECUSADA na reidratação.
    //
    // 🔑 Esta nota dizia "não sobrevive ao JSON do storage" e estava errada em
    // dois níveis. JSON nunca esteve no caminho (`ctx.storage.put` grava
    // V8-serializado — pendência 0(p)); e **medido no workerd real pelo PR B**
    // (`party/seeds.test.ts`, R4), o `Uint32Array` SOBREVIVE ao round-trip como
    // `Uint32Array`. O desfecho real é outro e é pior de diagnosticar: ele volta
    // íntegro, `estadoDasSeeds` reprova no `Array.isArray`, e a sala vira
    // `corrompida` — recusando todo mundo. **`Array.from` é necessário, e agora
    // isso está medido, não argumentado.**
    expect(fonteDaCasca()).toMatch(/const todas = Array\.from\(slots\)/);
  });
});

describe('🔴 C1 (revisão do 3.5.2) — `nEtapas` é campo PERSISTIDO e entra no discriminante', () => {
  /**
   * 🔴 **BLOQUEANTE C1 DA REVISÃO, e ele era real — medido, não deduzido.**
   *
   * O 3.5.2 acrescentou `nEtapas` ao estado persistido e o deixou de fora do
   * discriminante, lido por um `??` com default 1. Medido numa sonda antes do
   * conserto: sala de 5 etapas que perde o campo na reidratação faz a PRIMEIRA
   * barreira gravar `concluidaEm` (contra `concluidaEm: null` + cursor 1 no
   * controle) — **campeonato de 5 etapas encerrado na etapa 1, em silêncio**;
   * e, se o cursor já tinha andado, `cursorIntegro(3, 1)` reprova e a sala vira
   * `corrompida`, recusando todo mundo.
   *
   * 🔑 **É exatamente a tese que o 3.5.1 travou** ("campo que some na
   * reidratação é CORRUPÇÃO, não default"), furada pela porta do conserto: os
   * três campos anteriores (`seedsEtapas`, `seedCalendario`, `etapaAtual`) já
   * estavam no discriminante, e o quarto — o que decide quando o campeonato
   * ACABA — entrou por fora.
   *
   * ⚠️ **O bump de `VERSAO_ESTADO_SALA` não é cerimônia: sem ele o conserto é
   * impossível.** Com a versão parada em 1, "sala 3.5.1 que legitimamente não
   * tem `nEtapas`" e "sala 3.5.2 que o perdeu" são o MESMO objeto, e nenhuma
   * guarda consegue separá-las. É a colisão que `versaoSala` foi criada para
   * impedir — e o comentário de `servidor-sala.ts` que afirmava "o formato não
   * mudou, só o significado do cursor" era falso: o formato ganhou um campo.
   */
  it('🔴 BASELINE: sala v2 que PERDE `nEtapas` é CORROMPIDA, não sala de 1 etapa', () => {
    const quebrada = reidratar(salaConcluida());
    // Pré-condições asseridas, não supostas.
    expect(quebrada.versaoSala, 'a sala nasce na versão corrente').toBe(VERSAO_ESTADO_SALA);
    expect(quebrada.nEtapas, 'e o campo novo está lá').toBe(N_ETAPAS_CURTA);
    delete quebrada.nEtapas;

    const estado = estadoDasSeeds(quebrada);
    expect(estado.tipo).toBe('corrompida');
    expect(estado.tipo === 'corrompida' && estado.motivo).toContain('nEtapas');
  });

  it('🔴 BASELINE: o BUMP existe — o formato mudou, a versão tem de acompanhar', () => {
    // Sem isto, o teste acima passaria com a versão parada em 1 e a distinção
    // v1-legítima × v2-corrompida seria impossível de escrever.
    expect(VERSAO_ESTADO_SALA).toBeGreaterThanOrEqual(2);
  });

  it('🔒 sala 3.5.1 LEGÍTIMA (v1, sem `nEtapas`) NÃO vira corrompida por isso', () => {
    // O outro lado da guarda, e é ele que impede o conserto de matar toda sala
    // em andamento no momento do deploy. Uma sala v1 é campeonato de 1 etapa
    // por definição — é o que o código do 3.5.1 fazia.
    const v1 = reidratar(salaConcluida());
    delete v1.nEtapas;
    v1.versaoSala = 1;

    expect(estadoDasSeeds(v1).tipo).toBe('ok');
    expect(publicarSala(v1).nEtapas, 'v1 é campeonato de UMA etapa').toBe(1);
  });

  it('🔒 valor FORA DE FORMA em sala v2 é corrupção igual à ausência', () => {
    for (const ruim of [0, -1, 1.5, '5', null, Number.NaN]) {
      const quebrada = reidratar(salaConcluida());
      (quebrada as unknown as { nEtapas: unknown }).nEtapas = ruim;
      expect(estadoDasSeeds(quebrada).tipo, `nEtapas=${String(ruim)} passou`).toBe('corrompida');
    }
  });

  /**
   * 🔴 **Aviso 3 da SEGUNDA passada da revisão.** `criarSala` limita `nEtapas` a
   * `[1, seeds.etapas.length]` (A4), mas o **caminho de LEITURA** não limitava
   * nada: um `nEtapas: 999` vindo do storage passava no discriminante, e
   * `aoReceber` usa `nEtapasDaSala(sala) - 1` como teto de `atestadoValido` ⇒
   * **999 baldes por escopo no estado persistido do Durable Object**.
   *
   * 🔑 Isso derrubava a propriedade que o próprio PR declara no docblock de
   * `EstadoServidor.atestados` ("o teto do número de baldes é
   * `escopos × nEtapas`") — **guarda de escrita sem guarda de leitura não é
   * teto, é convenção**, e o estado persistido não vem só de `criarSala`.
   */
  it('🔒 TETO DE LEITURA: `nEtapas` acima do número de seeds é corrupção', () => {
    for (const alto of [MAX_ETAPAS + 1, 999, 2 ** 40]) {
      const quebrada = reidratar(salaConcluida());
      quebrada.nEtapas = alto;
      expect(estadoDasSeeds(quebrada).tipo, `nEtapas=${alto} passou`).toBe('corrompida');
    }
  });

  it('🛡️ ANTI-VACUIDADE do teto: `nEtapas === MAX_ETAPAS` continua legítimo', () => {
    // Sem isto, o teto poderia ter sido escrito com `<` no lugar de `<=` e
    // reprovaria o campeonato completo, que é formato válido.
    const noLimite = reidratar(salaConcluida());
    noLimite.nEtapas = MAX_ETAPAS;
    expect(estadoDasSeeds(noLimite).tipo).toBe('ok');
  });

  /**
   * 🔴 **Aviso A4 da revisão do 3.5.2, promovido a conserto por decisão do dev.**
   *
   * `criarSala` já falhava alto na cardinalidade das SEEDS (aviso A5 da revisão
   * do 3.5.1) e pelo mesmo motivo: melhor estourar no deploy do que parir sala
   * morta em produção, porque o `POST /criar-sala` já respondeu 200 com o
   * código. `nEtapas` entrava CRU ao lado dessa guarda.
   *
   * O caso que dói é `nEtapas > seeds.etapas.length`: a sala nasce válida pelo
   * discriminante, joga normalmente até a etapa 9 e então pede uma seed que não
   * existe. E `nEtapas: 0` produzia estado e leitura em desacordo — o campo
   * dizia 0, `nEtapasDaSala` devolvia 1.
   */
  it('🔴 BASELINE (A4): `criarSala` recusa `nEtapas` fora de forma ou maior que as seeds', () => {
    for (const ruim of [0, -1, 1.5, MAX_ETAPAS + 1, Number.NaN]) {
      expect(
        () => criarSala('A3F9C2', SEED_MESTRE, 'dificil', T0, SEEDS, ruim),
        `nEtapas=${String(ruim)} não estourou`,
      ).toThrow(/nEtapas/);
    }
  });

  it('🔒 anti-vacuidade (A4): os valores LEGÍTIMOS continuam passando', () => {
    // Sem isto, a guarda acima passaria com um `throw` incondicional.
    for (const bom of [1, N_ETAPAS_CURTA, MAX_ETAPAS]) {
      const sala = criarSala('A3F9C2', SEED_MESTRE, 'dificil', T0, SEEDS, bom);
      expect(sala.nEtapas, `nEtapas=${bom} foi recusado`).toBe(bom);
    }
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
        // ⚠️ O caso continua VÁLIDO (é uma forma torta que `estadoDasSeeds`
        // tem de reprovar), mas a legenda antiga — "exatamente o que M1
        // produz" — foi refutada: medido no workerd pelo PR B, um
        // `Uint32Array` volta do storage como `Uint32Array`, não como objeto
        // indexado. Quem reproduz M1 de verdade é `party/seeds.test.ts`.
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
