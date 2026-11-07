import { describe, expect, it } from 'vitest';
import { arquivosDoCatalogo, criarMotorDeAudio, type AmbienteDeAudio } from './audio';
import { CATALOGO_SONS } from './catalogo';

// ------------------------------------------------------------ Web Audio falso

class ParamFalso {
  value: number;
  chamadas: string[] = [];
  constructor(v: number) {
    this.value = v;
  }
  setTargetAtTime(v: number, t: number) {
    this.chamadas.push(`alvo ${v} @${t}`);
    this.value = v;
  }
  setValueAtTime(v: number, t: number) {
    this.chamadas.push(`valor ${v} @${t}`);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.chamadas.push(`rampa ${v} @${t}`);
  }
  cancelScheduledValues(t: number) {
    this.chamadas.push(`cancela @${t}`);
  }
}

class NoFalso {
  ligadoA: NoFalso | null = null;
  desligado = false;
  connect(n: NoFalso) {
    this.ligadoA = n;
    return n;
  }
  disconnect() {
    this.desligado = true;
    this.ligadoA = null;
  }
}

class GanhoFalso extends NoFalso {
  gain = new ParamFalso(1);
}

class FonteFalsa extends NoFalso {
  buffer: unknown = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate = new ParamFalso(1);
  inicio: number | null = null;
  fim: number | null = null;
  onended: (() => void) | null = null;
  start(t: number) {
    this.inicio = t;
  }
  stop(t: number) {
    this.fim = t;
  }
}

function ambiente(opcoes: { falhar?: string[]; estado?: 'running' | 'suspended' } = {}) {
  const fontes: FonteFalsa[] = [];
  const buscados: string[] = [];
  const ouvintes = new Map<string, (() => void)[]>();
  const doc = {
    hidden: false,
    addEventListener: (tipo: string, f: () => void) =>
      ouvintes.set(tipo, [...(ouvintes.get(tipo) ?? []), f]),
    removeEventListener: (tipo: string, f: () => void) =>
      ouvintes.set(
        tipo,
        (ouvintes.get(tipo) ?? []).filter((x) => x !== f),
      ),
  };
  const ctxs: ContextoFalso[] = [];
  class ContextoFalso {
    currentTime = 5;
    sampleRate = 48000;
    state = opcoes.estado ?? 'suspended';
    destination = new NoFalso();
    retomadas = 0;
    suspensoes = 0;
    mestre: GanhoFalso | null = null;
    constructor() {
      ctxs.push(this);
    }
    createGain() {
      const g = new GanhoFalso();
      this.mestre ??= g;
      return g;
    }
    compressor: (NoFalso & { threshold: ParamFalso; ratio: ParamFalso }) | null = null;
    createDynamicsCompressor() {
      this.compressor = Object.assign(new NoFalso(), {
        threshold: new ParamFalso(0),
        ratio: new ParamFalso(0),
      });
      return this.compressor;
    }
    createBufferSource() {
      const f = new FonteFalsa();
      fontes.push(f);
      return f;
    }
    decodeAudioData(ab: ArrayBuffer) {
      const nome = new TextDecoder().decode(ab);
      if (opcoes.falhar?.includes(nome)) return Promise.reject(new Error('EncodingError: formato'));
      return Promise.resolve({ duration: 1, nome });
    }
    resume() {
      this.retomadas++;
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() {
      this.suspensoes++;
      this.state = 'suspended';
      return Promise.resolve();
    }
  }
  const amb: AmbienteDeAudio = {
    Contexto: ContextoFalso as unknown as AmbienteDeAudio['Contexto'],
    documento: doc as unknown as AmbienteDeAudio['documento'],
    buscar: (url) => {
      buscados.push(url);
      return Promise.resolve(
        new TextEncoder().encode(url.replace(/^\//, '')).buffer as ArrayBuffer,
      );
    },
  };
  const disparar = (tipo: string) => (ouvintes.get(tipo) ?? []).forEach((f) => f());
  return { amb, fontes, buscados, ctx: () => ctxs[0], doc, disparar, ouvintes };
}

describe('audio.ts: a única parte que fala com o Web Audio', () => {
  it('sem Web Audio no aparelho: não faz nada (null), sem lançar', () => {
    const { amb } = ambiente();
    expect(criarMotorDeAudio({ ...amb, Contexto: undefined })).toBeNull();
  });

  it('os 17 arquivos do catálogo, cada um uma vez, por fetch de /sons/ (connect-src self)', async () => {
    expect(arquivosDoCatalogo()).toHaveLength(17);
    expect(new Set(arquivosDoCatalogo()).size).toBe(17);
    const e = ambiente();
    const m = criarMotorDeAudio(e.amb)!;
    const s = await m.carregar();
    await m.carregar();
    expect(e.buscados).toHaveLength(17);
    expect(e.buscados.every((u) => /^\/sons\/[a-z-]+\.ogg$/.test(u))).toBe(true);
    expect(s).toMatchObject({ decodificados: 17, total: 17, falhas: [], taxaHz: 48000 });
  });

  it('falha de decodificação é contada e nomeada, e as outras seguem', async () => {
    const e = ambiente({ falhar: ['sons/motor.ogg'] });
    const s = await criarMotorDeAudio(e.amb)!.carregar();
    expect(s.decodificados).toBe(16);
    expect(s.falhas).toEqual([{ arquivo: 'sons/motor.ogg', erro: 'EncodingError: formato' }]);
  });

  it('mestre (volume) e compressor do preview aprovado: limiar -10, razão 4', () => {
    const e = ambiente();
    const m = criarMotorDeAudio(e.amb)!;
    const ctx = e.ctx();
    expect(ctx.mestre!.ligadoA).toBe(ctx.compressor);
    expect(ctx.compressor!.ligadoA).toBe(ctx.destination);
    expect(ctx.compressor!.threshold.value).toBe(-10);
    expect(ctx.compressor!.ratio.value).toBe(4);
    m.definirVolume(0.3);
    expect(e.ctx().mestre!.gain.value).toBe(0.3);
    m.definirVolume(0);
    expect(e.ctx().mestre!.gain.value).toBe(0);
  });

  it('tocar: laço do catálogo, taxa, e fim com fade; sem buffer, não toca e não lança', async () => {
    const e = ambiente();
    const m = criarMotorDeAudio(e.amb)!;
    expect(() => m.saida.tocar({ som: CATALOGO_SONS.motor, inicioS: 6, ganho: 0.5 })).not.toThrow();
    expect(e.fontes).toHaveLength(0);
    await m.carregar();
    m.saida.tocar({
      som: CATALOGO_SONS.pistola,
      inicioS: 6,
      ganho: 0.9,
      laco: true,
      taxa: 1.1,
      fim: { emS: 7, fadeS: 0.015 },
    });
    const [f] = e.fontes;
    expect(f).toMatchObject({ loop: true, loopStart: 0.12, loopEnd: 0.57, inicio: 6 });
    expect(f.playbackRate.value).toBe(1.1);
    expect(m.status().tocadas).toBe(1);
    const g = f.ligadoA as GanhoFalso;
    expect(g.gain.value).toBe(0.9);
    expect(g.gain.chamadas).toEqual(['valor 0.9 @7', 'rampa 0 @7.015']);
    expect(f.fim).toBeCloseTo(7.015 + 0.01, 9);
    expect(g.ligadoA).toBe(e.ctx().mestre);
  });

  it('parar o que ainda não começou: desliga na hora (não soa na tela de resultado)', async () => {
    const e = ambiente();
    const m = criarMotorDeAudio(e.amb)!;
    await m.carregar();
    const futuro = m.saida.tocar({ som: CATALOGO_SONS.abandono, inicioS: 5.1, ganho: 1 });
    const ja = m.saida.tocar({ som: CATALOGO_SONS.pelotao, inicioS: 4, ganho: 0.2, laco: true });
    m.saida.parar(futuro, 0.03);
    m.saida.parar(ja, 0.03);
    expect((e.fontes[0].ligadoA as GanhoFalso | null)?.gain).toBeUndefined();
    expect(e.fontes[0].desligado).toBe(true);
    expect(e.fontes[1].desligado).toBe(false);
    expect(e.fontes[1].fim).toBeCloseTo(5 + 0.03 * 4, 9);
    expect(() => m.saida.parar(futuro, 0.03)).not.toThrow();
    expect(() => m.saida.parar(-1, 0.03)).not.toThrow();
  });

  it('ajustar: alvo com constante de tempo, no relógio do áudio', async () => {
    const e = ambiente();
    const m = criarMotorDeAudio(e.amb)!;
    await m.carregar();
    const h = m.saida.tocar({ som: CATALOGO_SONS.motor, inicioS: 5, ganho: 0, laco: true });
    m.saida.ajustar(h, { ganho: 0.55, taxa: 0.8 }, 0.08);
    expect((e.fontes[0].ligadoA as GanhoFalso).gain.chamadas).toEqual(['alvo 0.55 @5']);
    expect(e.fontes[0].playbackRate.chamadas).toEqual(['alvo 0.8 @5']);
  });

  it('primeiro toque retoma o contexto; aba oculta suspende e volta só se já tocava', async () => {
    const e = ambiente();
    criarMotorDeAudio(e.amb);
    const ctx = e.ctx();
    e.doc.hidden = true;
    e.disparar('visibilitychange');
    e.doc.hidden = false;
    e.disparar('visibilitychange');
    expect(ctx.retomadas).toBe(0); // nunca desbloqueado: não é a aba voltando que liga o som
    e.disparar('pointerdown');
    await new Promise((r) => setTimeout(r, 0)); // `resume()` é assíncrono
    expect(ctx.retomadas).toBe(1);
    expect(ctx.state).toBe('running');
    // Os gestos seguem ouvidos: no iOS uma ligação suspende o contexto sem trocar de aba (revisão do 3b).
    ctx.state = 'suspended';
    e.disparar('pointerdown');
    await new Promise((r) => setTimeout(r, 0));
    expect(ctx.state).toBe('running');
    ctx.retomadas = 1;
    e.doc.hidden = true;
    e.disparar('visibilitychange');
    expect(ctx.suspensoes).toBe(1);
    e.doc.hidden = false;
    e.disparar('visibilitychange');
    expect(ctx.retomadas).toBe(2);
  });

  it('parar um laço que ainda não começou chama stop: senão ele vive até o fim da página (revisão do 3b)', async () => {
    const e = ambiente();
    const m = criarMotorDeAudio(e.amb)!;
    await m.carregar();
    const h = m.saida.tocar({ som: CATALOGO_SONS.pelotao, inicioS: 5.005, ganho: 0, laco: true });
    m.saida.parar(h, 0.03);
    expect(e.fontes[0].loop).toBe(true);
    expect(e.fontes[0].fim).not.toBeNull();
    expect(e.fontes[0].desligado).toBe(true);
  });

  it('o mestre nasce no volume salvo (sem um quadro alto quando está mudo) e ativa() segue o contexto', () => {
    const e = ambiente();
    const m = criarMotorDeAudio({ ...e.amb, ganhoInicial: 0 })!;
    expect(e.ctx().mestre!.gain.value).toBe(0);
    expect(m.saida.ativa()).toBe(false);
    e.ctx().state = 'running';
    expect(m.saida.ativa()).toBe(true);
  });

  it('status antes de carregar', () => {
    const e = ambiente({ estado: 'running' });
    expect(criarMotorDeAudio(e.amb)!.status()).toMatchObject({
      decodificados: 0,
      total: 17,
      contexto: 'running',
      tocadas: 0,
    });
  });
});
