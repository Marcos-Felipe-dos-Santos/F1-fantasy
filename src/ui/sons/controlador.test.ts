import { describe, expect, it } from 'vitest';
import { atribuirPerfis } from '../../engine/bots';
import { criarDataset } from '../../engine/dataset';
import { criarDraft, resolverBots } from '../../engine/draft';
import type { Jogador } from '../../engine/types';
import equipeAnosReal from '../../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../../fixtures/dataset-semente/pecas.json';
import pistasReal from '../../fixtures/dataset-semente/pistas.json';
import { replayDaCorrida } from '../fim-da-corrida';
import { escalaReplay, MS_REPLAY_POR_VOLTA, prepararCorrida } from '../fluxo-corrida';
import {
  DURACAO_PROBLEMA_MS,
  GANHO_CATEGORIA,
  GANHO_LENTA,
  GANHO_MOTOR,
  GANHO_SEM_FOCO,
  FATOR_OUTROS_NAO_PASSAGEM,
  PERTO_U,
  TETO_VOZES,
  type EventoSom,
} from './agenda';
import { CATALOGO_SONS } from './catalogo';
import {
  ANTECEDENCIA_S,
  ControladorDeSom,
  corridaDoSom,
  FADE_EVENTO_S,
  FADE_TORCIDA_S,
  GANHO_CHUVA,
  GANHO_PELOTAO,
  SEM_SOM,
  velocidadeDeReferencia,
  type CarroDoSom,
  type CorridaDoSom,
  type SaidaDeAudio,
  type TocarSom,
} from './controlador';

// ------------------------------------------------------------ saída falsa

interface Tocado extends TocarSom {
  h: number;
  ajustes: { ganho?: number; taxa?: number }[];
  parado?: number;
}

function saidaFalsa() {
  let agora = 10;
  let proximo = 1;
  const tocados: Tocado[] = [];
  /** `ativa`: o contexto rodando; `semBuffer`: arquivos ainda decodificando (tocar devolve SEM_SOM). */
  const estado = { ativa: true, semBuffer: false };
  const saida: SaidaDeAudio = {
    agoraS: () => agora,
    ativa: () => estado.ativa,
    tocar(p) {
      if (estado.semBuffer) return SEM_SOM;
      const t: Tocado = { ...p, h: proximo++, ajustes: [] };
      tocados.push(t);
      return t.h;
    },
    ajustar(h, alvo) {
      tocados.find((t) => t.h === h)?.ajustes.push(alvo);
    },
    parar(h, fadeS) {
      const t = tocados.find((x) => x.h === h);
      if (t) t.parado = fadeS;
    },
  };
  return {
    saida,
    estado,
    tocados,
    avancar: (s: number) => void (agora += s),
    agora: () => agora,
    de: (arquivo: string) => tocados.filter((t) => t.som.arquivo === arquivo),
  };
}

const ESCALA = 20; // ms simulados por ms real
const carro = (id: string, x: number, y = 0, extra: Partial<CarroDoSom> = {}): CarroDoSom => ({
  id,
  ponto: { x, y },
  naPista: true,
  parado: false,
  abandonou: false,
  ...extra,
});

function corrida(eventos: EventoSom[], extra: Partial<CorridaDoSom> = {}): CorridaDoSom {
  return {
    eventos,
    chuva: false,
    humanos: ['eu'],
    jogadorLocalId: undefined,
    velRef: 100,
    ...extra,
  };
}

/** Um quadro de 16 ms reais, com o relógio do áudio andando junto. */
function rodar(
  f: ReturnType<typeof saidaFalsa>,
  c: ControladorDeSom,
  tSim: number,
  carros: CarroDoSom[] = [carro('eu', tSim / 100)],
  deltaRealMs = 16,
) {
  c.quadro({ tSim, deltaRealMs, velocidade: 'media', escala: ESCALA, carros });
}

const LARGADA: EventoSom = { cat: 'largada', carro: null, t: 0 };

// ------------------------------------------------------------ relógio e janela

describe('ControladorDeSom: relógio, antecedência e saltos', () => {
  it('a primeira chamada parte de SIM_ANTES_DA_LARGADA: a largada em 0 soa', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(f.saida, corrida([LARGADA]));
    rodar(f, c, 0, undefined, 0);
    expect(f.de(CATALOGO_SONS.largada.media.arquivo)).toHaveLength(1);
  });

  it('agenda 150 ms à frente, no relógio do áudio, e não repete o que já agendou', () => {
    const f = saidaFalsa();
    const perto: EventoSom = { cat: 'derrapagem', carro: 'eu', t: 120 * ESCALA };
    const longe: EventoSom = { cat: 'abandono', carro: 'eu', t: 400 * ESCALA };
    const c = new ControladorDeSom(f.saida, corrida([perto, longe]));
    rodar(f, c, 0, undefined, 0);
    const d = f.de(CATALOGO_SONS.derrapagem.arquivo);
    expect(d).toHaveLength(1);
    // O pico do arquivo cai no instante do evento.
    expect(d[0].inicioS).toBeCloseTo(f.agora() + 0.12 - CATALOGO_SONS.derrapagem.picoEmS!, 6);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(0);
    expect(ANTECEDENCIA_S).toBe(0.15);
    f.avancar(0.016);
    rodar(f, c, 16 * ESCALA);
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)).toHaveLength(1);
    for (let ms = 32; ms <= 320; ms += 16) {
      f.avancar(0.016);
      rodar(f, c, ms * ESCALA);
    }
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(1);
  });

  it('trocar de rápida para lenta no meio da janela não toca de novo o que já agendou (revisão do 3b)', () => {
    const f = saidaFalsa();
    const rapida = 40;
    const lenta = 10;
    // Dentro da janela de 150 ms da rápida (6000 ms sim), fora da janela da lenta (1500 ms sim).
    const ev: EventoSom = { cat: 'derrapagem', carro: 'eu', t: 4000 };
    const c = new ControladorDeSom(f.saida, corrida([ev]));
    c.quadro({
      tSim: 0,
      deltaRealMs: 0,
      velocidade: 'rapida',
      escala: rapida,
      carros: [carro('eu', 0)],
    });
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)).toHaveLength(1);
    for (let ms = 16, t = 0; ms <= 600; ms += 16) {
      t += 16 * lenta;
      f.avancar(0.016);
      c.quadro({
        tSim: t,
        deltaRealMs: 16,
        velocidade: 'lenta',
        escala: lenta,
        carros: [carro('eu', t / 100)],
      });
    }
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)).toHaveLength(1);
  });

  it('contexto suspenso (sem toque ainda): nada se acumula; ao retomar, só o que vem depois soa (revisão do 3b)', () => {
    const f = saidaFalsa();
    f.estado.ativa = false;
    const c = new ControladorDeSom(
      f.saida,
      corrida([
        LARGADA,
        { cat: 'abandono', carro: 'eu', t: 100 * ESCALA },
        { cat: 'derrapagem', carro: 'eu', t: 400 * ESCALA },
      ]),
    );
    rodar(f, c, 0, undefined, 0);
    // Relógio do áudio parado (suspenso), o replay andando.
    for (let ms = 16; ms <= 200; ms += 16) rodar(f, c, ms * ESCALA);
    expect(f.de(CATALOGO_SONS.largada.media.arquivo)).toHaveLength(0);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(0);
    f.estado.ativa = true;
    for (let ms = 216; ms <= 400; ms += 16) {
      f.avancar(0.016);
      rodar(f, c, ms * ESCALA);
    }
    expect(f.de(CATALOGO_SONS.largada.media.arquivo)).toHaveLength(0);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(0);
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)).toHaveLength(1);
  });

  it('salto de relógio REAL (aba voltando): o que foi atravessado não soa', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'abandono', carro: 'eu', t: 1000 * ESCALA }]),
    );
    rodar(f, c, 0, undefined, 0);
    // O relógio de `useCorrida` anda delta × escala também no salto: só a regra do delta REAL o pega.
    rodar(f, c, 2000 * ESCALA, undefined, 2000);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(0);
  });

  it('salto do tempo SIMULADO com quadro curto (Acelerar, busca): não soa', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'abandono', carro: 'eu', t: 1000 * ESCALA }]),
    );
    rodar(f, c, 0, undefined, 0);
    rodar(f, c, 2000 * ESCALA, undefined, 16);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(0);
  });

  it('primeira chamada já no meio da corrida: nada do passado soa', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([LARGADA, { cat: 'abandono', carro: 'eu', t: 500 }]),
    );
    rodar(f, c, 60000, undefined, 0);
    expect(f.de(CATALOGO_SONS.largada.media.arquivo)).toHaveLength(0);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(0);
  });

  it('encerrar cala TUDO, inclusive o que ainda vai começar, e o controlador para', () => {
    const f = saidaFalsa();
    const futuro: EventoSom = { cat: 'abandono', carro: 'eu', t: 140 * ESCALA };
    const depois: EventoSom = { cat: 'derrapagem', carro: 'eu', t: 300 * ESCALA };
    const c = new ControladorDeSom(f.saida, corrida([LARGADA, futuro, depois], { chuva: true }));
    rodar(f, c, 0, undefined, 0);
    expect(f.tocados.length).toBeGreaterThanOrEqual(6); // pelotão, chuva, motor, lenta, largada, abandono
    expect(f.tocados.find((t) => t.som === CATALOGO_SONS.abandono)!.inicioS).toBeGreaterThan(
      f.agora(),
    );
    c.encerrar();
    expect(f.tocados.every((t) => t.parado !== undefined)).toBe(true);
    const antes = f.tocados.length;
    for (let ms = 16; ms <= 400; ms += 16) {
      f.avancar(0.016);
      rodar(f, c, ms * ESCALA);
    }
    c.encerrar();
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)).toHaveLength(0);
    expect(f.tocados.length).toBe(antes);
  });
});

// ------------------------------------------------------------ categorias

describe('ControladorDeSom: o que cada categoria toca', () => {
  it('problema técnico: o arquivo do abandono, ganho 0,6, encerrado com fade em 500 ms', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'problema', carro: 'eu', t: 50 * ESCALA }]),
    );
    rodar(f, c, 0, undefined, 0);
    const [p] = f.de(CATALOGO_SONS.abandono.arquivo);
    expect(p.ganho).toBeCloseTo(GANHO_CATEGORIA.problema, 9);
    expect(p.ganho).toBe(0.6);
    expect(p.fim!.emS - p.inicioS).toBeCloseTo(DURACAO_PROBLEMA_MS / 1000, 9);
    expect(p.fim!.fadeS).toBe(FADE_EVENTO_S);
    expect(p.laco).toBeFalsy();
  });

  it('erro de pilotagem: a derrapagem', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'derrapagem', carro: 'eu', t: 50 * ESCALA }]),
    );
    rodar(f, c, 0, undefined, 0);
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)).toHaveLength(1);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(0);
  });

  it('pistola: em laço pelo tempo da parada (chegada à partida), na escala do replay', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'pistola', carro: 'eu', t: 50 * ESCALA, fim: 50 * ESCALA + 60000 }]),
    );
    rodar(f, c, 0, undefined, 0);
    const [p] = f.de(CATALOGO_SONS.pistola.arquivo);
    expect(p.laco).toBe(true);
    expect(p.fim!.emS - p.inicioS).toBeCloseTo(60000 / ESCALA / 1000, 6);
  });

  it('torcida: da bandeirada ao fim, limitada ao arquivo, e sai com fade', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'torcida', carro: null, t: 50 * ESCALA, fim: 50 * ESCALA + 4000 * ESCALA }]),
    );
    rodar(f, c, 0, undefined, 0);
    const [t] = f.de(CATALOGO_SONS.torcida.arquivo);
    expect(t.fim!.emS - t.inicioS).toBeCloseTo(4, 6);
    expect(t.ganho).toBeCloseTo(GANHO_CATEGORIA.torcida, 9);
    expect(t.fim!.fadeS).toBe(FADE_TORCIDA_S);
  });

  it('outro carro: atenuado pela distância ao humano MAIS PRÓXIMO, com o × 0,8', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'derrapagem', carro: 'bot', t: 50 * ESCALA }], { humanos: ['a', 'b'] }),
    );
    // 300 u de b (o mais próximo) e 1300 de a: abaixo do teto de 0,7.
    rodar(f, c, 0, [carro('a', 0), carro('b', 1000), carro('bot', 1300)], 0);
    const [d] = f.de(CATALOGO_SONS.derrapagem.arquivo);
    expect(d.ganho).toBeCloseTo((1 - 300 / 500) * FATOR_OUTROS_NAO_PASSAGEM, 9);
  });

  it('o humano no box não é referência: sem humano em pista, o volume médio fixo', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'derrapagem', carro: 'bot', t: 50 * ESCALA }]),
    );
    rodar(f, c, 0, [carro('eu', 0, 0, { naPista: false }), carro('bot', 10)], 0);
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)[0].ganho).toBeCloseTo(GANHO_SEM_FOCO, 9);
  });

  it('evento do humano não é agrupado em 250 ms; o de outro carro é', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([
        { cat: 'derrapagem', carro: 'eu', t: 20 * ESCALA },
        { cat: 'derrapagem', carro: 'eu', t: 120 * ESCALA },
        { cat: 'abandono', carro: 'b1', t: 20 * ESCALA },
        { cat: 'abandono', carro: 'b2', t: 120 * ESCALA },
      ]),
    );
    rodar(f, c, 0, [carro('eu', 0), carro('b1', 1000), carro('b2', 1000)], 0);
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)).toHaveLength(2);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(1);
  });

  it('sem humano em pista (espectador): o volume médio fixo', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([{ cat: 'derrapagem', carro: 'bot', t: 50 * ESCALA }], {
        humanos: ['a'],
        jogadorLocalId: null,
      }),
    );
    rodar(f, c, 0, [carro('a', 0), carro('bot', 10)], 0);
    expect(f.de(CATALOGO_SONS.derrapagem.arquivo)[0].ganho).toBeCloseTo(GANHO_SEM_FOCO, 9);
  });

  it('roubo de voz: a mais fraca é parada na saída de áudio', () => {
    const f = saidaFalsa();
    const bots = Array.from({ length: TETO_VOZES }, (_, i) => `b${i}`);
    // Espaçadas além dos 250 ms do agrupamento, e todas ainda tocando quando o abandono chega.
    const ev: EventoSom[] = bots.map((b, i) => ({
      cat: 'pistola',
      carro: b,
      t: (10 + i * 260) * ESCALA,
      fim: 60000 * ESCALA,
    }));
    ev.push({ cat: 'abandono', carro: 'eu', t: (10 + TETO_VOZES * 260) * ESCALA });
    const c = new ControladorDeSom(f.saida, corrida(ev, { humanos: ['eu'] }));
    const carros = [carro('eu', 0), ...bots.map((b) => carro(b, 1000))];
    for (let ms = 0; ms <= 10 + TETO_VOZES * 260 + 16; ms += 16) {
      rodar(f, c, ms * ESCALA, carros, ms === 0 ? 0 : 16);
      f.avancar(0.016);
    }
    const pistolas = f.de(CATALOGO_SONS.pistola.arquivo);
    expect(pistolas).toHaveLength(TETO_VOZES);
    expect(f.de(CATALOGO_SONS.abandono.arquivo)).toHaveLength(1);
    expect(pistolas.filter((p) => p.parado !== undefined)).toHaveLength(1);
    expect(c.estatisticas().roubadas).toBe(1);
  });
});

// ------------------------------------------------------------ ambiente e motor

describe('ControladorDeSom: ambiente e motor', () => {
  it('pelotão sempre; chuva só com chuva; ambos entram com fade', () => {
    const seco = saidaFalsa();
    new ControladorDeSom(seco.saida, corrida([])).quadro({
      tSim: 0,
      deltaRealMs: 0,
      velocidade: 'media',
      escala: ESCALA,
      carros: [],
    });
    expect(seco.de(CATALOGO_SONS.pelotao.arquivo)).toHaveLength(1);
    expect(seco.de(CATALOGO_SONS.chuva.arquivo)).toHaveLength(0);
    const p = seco.de(CATALOGO_SONS.pelotao.arquivo)[0];
    expect(p.laco).toBe(true);
    expect(p.ganho).toBe(0);
    expect(p.ajustes[0].ganho).toBe(GANHO_PELOTAO);

    const molhado = saidaFalsa();
    new ControladorDeSom(molhado.saida, corrida([], { chuva: true })).quadro({
      tSim: 0,
      deltaRealMs: 0,
      velocidade: 'media',
      escala: ESCALA,
      carros: [],
    });
    expect(molhado.de(CATALOGO_SONS.chuva.arquivo)[0].ajustes[0].ganho).toBe(GANHO_CHUVA);
  });

  it('arquivos ainda decodificando no 1º quadro: os laços entram quando chegarem (revisão do 3b)', () => {
    const f = saidaFalsa();
    f.estado.semBuffer = true;
    const c = new ControladorDeSom(f.saida, corrida([], { chuva: true }));
    rodar(f, c, 0, undefined, 0);
    rodar(f, c, 320);
    expect(f.tocados).toHaveLength(0);
    f.estado.semBuffer = false;
    rodar(f, c, 640);
    for (const som of [
      CATALOGO_SONS.pelotao,
      CATALOGO_SONS.chuva,
      CATALOGO_SONS.motor,
      CATALOGO_SONS.lenta,
    ]) {
      expect(f.de(som.arquivo)).toHaveLength(1);
    }
    rodar(f, c, 960);
    expect(f.de(CATALOGO_SONS.pelotao.arquivo)).toHaveLength(1);
    expect(f.de(CATALOGO_SONS.motor.arquivo)[0].ajustes.length).toBeGreaterThan(0);
  });

  it('2+ humanos ou espectador: nenhum motor em destaque', () => {
    for (const extra of [
      { humanos: ['a', 'b'] },
      { humanos: ['a'], jogadorLocalId: null },
    ] as Partial<CorridaDoSom>[]) {
      const f = saidaFalsa();
      new ControladorDeSom(f.saida, corrida([], extra)).quadro({
        tSim: 0,
        deltaRealMs: 0,
        velocidade: 'media',
        escala: ESCALA,
        carros: [],
      });
      expect(f.de(CATALOGO_SONS.motor.arquivo)).toHaveLength(0);
      expect(f.de(CATALOGO_SONS.lenta.arquivo)).toHaveLength(0);
    }
  });

  it('andando: motor; parado (pit na vaga): marcha lenta; abandonado: silêncio', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(f.saida, corrida([], { velRef: 100 }));
    rodar(f, c, 0, [carro('eu', 0)], 0);
    rodar(f, c, 1000, [carro('eu', 50)]); // 50 u em 1 s simulado
    const motor = f.de(CATALOGO_SONS.motor.arquivo)[0];
    const lenta = f.de(CATALOGO_SONS.lenta.arquivo)[0];
    expect(motor.ajustes.at(-1)).toEqual({ ganho: GANHO_MOTOR, taxa: 0.6 + 0.5 * 0.5 });
    expect(lenta.ajustes.at(-1)!.ganho).toBe(0);
    rodar(f, c, 1320, [carro('eu', 50, 0, { naPista: false })]);
    expect(motor.ajustes.at(-1)!.ganho).toBe(0);
    expect(lenta.ajustes.at(-1)!.ganho).toBe(GANHO_LENTA);
    rodar(f, c, 1640, [carro('eu', 50, 0, { abandonou: true, parado: true })]);
    expect(motor.ajustes.at(-1)!.ganho).toBe(0);
    expect(lenta.ajustes.at(-1)!.ganho).toBe(0);
  });
});

// ------------------------------------------------------------ passagens

describe('ControladorDeSom: passagens', () => {
  const entrando = (
    f: ReturnType<typeof saidaFalsa>,
    c: ControladorDeSom,
    eu: Partial<CarroDoSom>,
    chuva = false,
  ) => {
    rodar(f, c, 0, [carro('eu', 0, 0, eu), carro('bot', PERTO_U * 3)], 0);
    rodar(f, c, 320, [carro('eu', 0, 0, eu), carro('bot', PERTO_U - 5)]);
    return {
      passagem: f.de(CATALOGO_SONS.passagem.media.arquivo),
      spray: f.de(CATALOGO_SONS.spray.media.arquivo),
      chuva,
    };
  };

  it('humano ativo: a passagem soa; seco, sem spray', () => {
    const f = saidaFalsa();
    const { passagem, spray } = entrando(f, new ControladorDeSom(f.saida, corrida([])), {});
    expect(passagem).toHaveLength(1);
    expect(spray).toHaveLength(0);
  });

  it('na chuva: o spray vai junto, como camada da passagem', () => {
    const f = saidaFalsa();
    const { passagem, spray } = entrando(
      f,
      new ControladorDeSom(f.saida, corrida([], { chuva: true })),
      {},
    );
    expect(passagem).toHaveLength(1);
    expect(spray).toHaveLength(1);
    expect(spray[0].ganho).toBeCloseTo(
      (passagem[0].ganho / GANHO_CATEGORIA.passagem) * GANHO_CATEGORIA.spray,
      9,
    );
  });

  it.each([
    ['no box', { naPista: false }],
    ['parado', { parado: true }],
    ['abandonado', { abandonou: true, parado: true }],
  ])('foco inativo %s: nenhuma passagem', (_nome, eu) => {
    const f = saidaFalsa();
    expect(entrando(f, new ControladorDeSom(f.saida, corrida([])), eu).passagem).toHaveLength(0);
  });

  it('as referências são os prioritários: no online, o local; o outro humano não', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(
      f.saida,
      corrida([], { humanos: ['eu', 'outro'], jogadorLocalId: 'eu' }),
    );
    rodar(f, c, 0, [carro('eu', 0), carro('outro', 1000), carro('bot', 1000 + PERTO_U * 3)], 0);
    rodar(f, c, 320, [carro('eu', 0), carro('outro', 1000), carro('bot', 1000 + PERTO_U - 5)]);
    expect(f.de(CATALOGO_SONS.passagem.media.arquivo)).toHaveLength(0);
  });

  it('2 humanos no aparelho: passagem perto de QUALQUER um', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(f.saida, corrida([], { humanos: ['a', 'b'] }));
    rodar(f, c, 0, [carro('a', 0), carro('b', 1000), carro('bot', 1000 + PERTO_U * 3)], 0);
    rodar(f, c, 320, [carro('a', 0), carro('b', 1000), carro('bot', 1000 + PERTO_U - 5)]);
    expect(f.de(CATALOGO_SONS.passagem.media.arquivo)).toHaveLength(1);
  });

  it('espectador: nenhuma passagem', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(f.saida, corrida([], { humanos: ['eu'], jogadorLocalId: null }));
    expect(entrando(f, c, {}).passagem).toHaveLength(0);
  });

  it('na retomada do contexto, o carro que já estava perto não vira passagem (revisão do 3b)', () => {
    const f = saidaFalsa();
    f.estado.ativa = false;
    const c = new ControladorDeSom(f.saida, corrida([]));
    rodar(f, c, 0, [carro('eu', 0), carro('bot', PERTO_U * 3)], 0);
    rodar(f, c, 320, [carro('eu', 0), carro('bot', PERTO_U - 5)]);
    f.estado.ativa = true;
    f.avancar(0.016);
    rodar(f, c, 640, [carro('eu', 0), carro('bot', PERTO_U - 10)]);
    expect(f.de(CATALOGO_SONS.passagem.media.arquivo)).toHaveLength(0);
  });

  it('num salto do relógio REAL (aba voltando), a passagem atravessada não soa', () => {
    // O relógio anda delta × escala: só a regra do delta real separa isto de um quadro normal.
    const f = saidaFalsa();
    const c = new ControladorDeSom(f.saida, corrida([]));
    rodar(f, c, 0, [carro('eu', 0), carro('bot', PERTO_U * 3)], 0);
    rodar(f, c, 2000 * ESCALA, [carro('eu', 0), carro('bot', PERTO_U - 5)], 2000);
    expect(f.de(CATALOGO_SONS.passagem.media.arquivo)).toHaveLength(0);
  });

  it('num salto, a passagem atravessada não soa', () => {
    const f = saidaFalsa();
    const c = new ControladorDeSom(f.saida, corrida([]));
    rodar(f, c, 0, [carro('eu', 0), carro('bot', PERTO_U * 3)], 0);
    rodar(f, c, 90000, [carro('eu', 0), carro('bot', PERTO_U - 5)]);
    expect(f.de(CATALOGO_SONS.passagem.media.arquivo)).toHaveLength(0);
  });
});

// ------------------------------------------------------------ corrida real

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

function corridaReal(seed: number, pistaId: string) {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const estado = resolverBots(
    criarDraft(dataset, atribuirPerfis(base, seed, 'dificil'), seed),
    dataset,
  );
  return prepararCorrida(dataset, estado, pistaId, seed);
}

describe('corridaDoSom e velRef sobre o replay inteiro', () => {
  const { resultado, pista } = corridaReal(3, 'pista-monza');
  const replay = replayDaCorrida(resultado, pista);
  const foco = resultado.classificacao[3].jogadorId;

  it('velRef é a maior velocidade do foco NA PISTA na corrida inteira, calculada uma vez', () => {
    const v = velocidadeDeReferencia(resultado, pista, foco);
    expect(v).toBeGreaterThan(0);
    expect(velocidadeDeReferencia(resultado, pista, foco)).toBe(v);
    const c = corridaDoSom(resultado, pista, [foco], undefined);
    expect(c.velRef).toBe(v);
    // Maior que a da largada: não é o máximo corrente do começo.
    const h = resultado.historicoVoltas[foco];
    const st = resultado.classificacao[3].status;
    const a = replay.posicao(foco, h, st, 0, false).ponto;
    const b = replay.posicao(foco, h, st, 250, false).ponto;
    expect(v).toBeGreaterThan(Math.hypot(b.x - a.x, b.y - a.y) / 0.25);
  });

  it('sem foco, velRef 0; os eventos são os da agenda', () => {
    const c = corridaDoSom(resultado, pista, ['j01', 'j02'], undefined);
    expect(c.velRef).toBe(0);
    expect(c.eventos[0]).toEqual(LARGADA);
    expect(c.eventos.some((e) => e.cat === 'torcida')).toBe(true);
  });

  it('a corrida inteira, quadro a quadro: a largada uma vez, toda pistola do foco, nada depois de encerrar', () => {
    const f = saidaFalsa();
    const c = corridaDoSom(resultado, pista, [foco], undefined);
    const ctl = new ControladorDeSom(f.saida, c);
    const escala = escalaReplay(
      resultado.classificacao[0].tempoTotal,
      pista.voltas,
      MS_REPLAY_POR_VOLTA.rapida,
    );
    const ids = resultado.classificacao.map((x) => x.jogadorId);
    for (let t = 0, primeiro = true; t <= replay.fim; t += 16 * escala, primeiro = false) {
      const carros = ids.map((id, i) => {
        const pos = replay.posicao(
          id,
          resultado.historicoVoltas[id],
          resultado.classificacao[i].status,
          t,
          false,
        );
        return {
          id,
          ponto: pos.ponto,
          naPista: pos.fracaoNaPista !== null,
          parado: replay.parado(id, t),
          abandonou: replay.abandonou(id, t),
        };
      });
      ctl.quadro({ tSim: t, deltaRealMs: primeiro ? 0 : 16, velocidade: 'rapida', escala, carros });
      f.avancar(0.016);
    }
    ctl.encerrar();
    expect(f.de(CATALOGO_SONS.largada.rapida.arquivo)).toHaveLength(1);
    expect(f.de(CATALOGO_SONS.pistola.arquivo).length).toBeGreaterThanOrEqual(
      replay.paradas(foco).length,
    );
    expect(f.de(CATALOGO_SONS.torcida.arquivo)).toHaveLength(1);
    expect(f.de(CATALOGO_SONS.passagem.rapida.arquivo).length).toBeGreaterThan(0);
    expect(f.tocados.every((t) => t.parado !== undefined || t.fim !== undefined || !t.laco)).toBe(
      true,
    );
    const e = ctl.estatisticas();
    expect(e.tocadas).toBeGreaterThan(0);
  });
});
