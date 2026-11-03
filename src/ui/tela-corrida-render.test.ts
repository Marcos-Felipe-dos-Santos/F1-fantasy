/**
 * Elo testado entre os dados do replay e o que a TELA desenha (PR 2a). Mesmo
 * padrão de `pista-camadas-render.test.ts`: `renderToStaticMarkup`, sem jsdom,
 * com `createElement` em vez de JSX.
 */

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDraft, resolverBots } from '../engine/draft';
import type { DraftState, Jogador } from '../engine/types';
import { EfeitoDeIncidente } from './CarroReplay';
import { dataset } from './dataset-app';
import { diferencasParaLider, formatarDiferenca } from './diferenca-lider';
import { replayDaCorrida } from './fim-da-corrida';
import { classificacaoAoVivo, pontoNoTracado, prepararCorrida } from './fluxo-corrida';
import { efeitosNoInstante } from './incidentes-replay';
import { nomeJogador, rotulosDosPilotos } from './loadout-view';
import { linhaDoTempoDoPit } from './pit-replay';
import { tracadoSuavizado } from './suavizacao';
import { TelaCorrida } from './TelaCorrida';

const tela_ = vi.hoisted(() => ({ estreita: false, reduzido: false }));
vi.mock('./useTelaEstreita', () => ({ useTelaEstreita: () => tela_.estreita }));
vi.mock('./useMovimentoReduzido', () => ({ useMovimentoReduzido: () => tela_.reduzido }));

beforeEach(() => {
  tela_.estreita = false;
  tela_.reduzido = false;
});

function estadoComHumano(): DraftState {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const estado = resolverBots(criarDraft(dataset, atribuirPerfis(base, 42, 'dificil'), 42), dataset);
  return {
    ...estado,
    jogadores: estado.jogadores.map((j, i) => (i === 0 ? { ...j, tipo: 'humano' as const, nome: 'Você' } : j)),
  };
}

const estado = estadoComHumano();

const rotulos = rotulosDosPilotos(estado.loadouts, dataset);

/** Mesmo nome que o painel escreve: o piloto; o humano segue com o nome dele (PR 2d). */
const nomeNoPainel = (id: string) => {
  const jogador = estado.jogadores.find((j) => j.id === id)!;
  return jogador.tipo === 'humano' ? nomeJogador(jogador) : rotulos.get(id)!;
};

function corridaCom(chuva: boolean, pistaId = 'pista-spa') {
  for (let seed = 1; seed < 200; seed++) {
    const corrida = prepararCorrida(dataset, estado, pistaId, seed);
    if (corrida.resultado.chuva === chuva) return corrida;
  }
  throw new Error('sem seed com esse clima');
}

function tela(corrida: ReturnType<typeof corridaCom>, tempoSimMs: number, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(TelaCorrida, {
      state: estado,
      pista: corrida.pista,
      grid: corrida.grid,
      resultado: corrida.resultado,
      fase: 'replay',
      tempoSimMs,
      onLargar: () => undefined,
      onAcelerar: () => undefined,
      velocidade: 'media',
      onVelocidade: () => undefined,
      ...extra,
    }),
  );
}

describe('painel: diferença para o líder', () => {
  it('toda linha traz a coluna, com o líder identificado', () => {
    const corrida = corridaCom(false);
    const html = tela(corrida, corrida.resultado.classificacao[0].tempoTotal / 2);
    const celulas = [...html.matchAll(/classificacao-ao-vivo__diferenca">([^<]*)</g)].map((m) => m[1]);
    expect(celulas.length).toBe(22);
    expect(celulas[0]).toBe('Líder');
    expect(celulas.slice(1).filter((c) => /^\+\d+,\ds$|^\+\d+ V$/.test(c)).length).toBeGreaterThan(15);
  });

  it('o número da tela vem da linha do pit, a mesma que ordena o painel', () => {
    const corrida = corridaCom(false);
    const { pista, grid, resultado } = corrida;
    const linha = linhaDoTempoDoPit(resultado, pista);
    const ordemGrid = grid.grid.map((g) => g.jogadorId);
    const textos = (t: number, comPit: boolean) => {
      const ordem = classificacaoAoVivo(resultado, ordemGrid, t, pista.voltas, linha);
      return diferencasParaLider(resultado, ordem, t, pista.voltas, comPit ? linha : undefined).map(formatarDiferenca);
    };
    // Um instante em que o líder está parado: é onde as duas contas divergem.
    const paradas = Object.keys(resultado.voltasDePit).flatMap((j) => linha.paradas(j));
    const t = paradas.map((p) => (p.chegada + p.partida) / 2).find((x) => textos(x, true).join() !== textos(x, false).join());
    expect(t).toBeDefined();
    const celulas = [...tela(corrida, t!).matchAll(/classificacao-ao-vivo__diferenca">([^<]*)</g)].map((m) => m[1]);
    expect(celulas).toEqual(textos(t!, true));
  });
});

describe('chuva e asfalto molhado', () => {
  const chuva = corridaCom(true);
  const seco = corridaCom(false);
  const meio = (c: typeof chuva) => c.resultado.classificacao[0].tempoTotal / 2;
  const camadasDeChuva = (html: string) => html.match(/class="chuva-replay__camada/g)?.length ?? 0;
  const reflexos = (html: string) => html.match(/tracado-svg__reflexo/g)?.length ?? 0;

  it('corrida com chuva: chuva caindo, asfalto molhado e reflexos', () => {
    const html = tela(chuva, meio(chuva));
    expect(camadasDeChuva(html)).toBe(2);
    expect(html).toMatch(/<svg class="tracado-svg tracado-svg--molhado"/);
    expect(reflexos(html)).toBe(2);
  });

  it('corrida seca: nada disso', () => {
    const html = tela(seco, meio(seco));
    expect(camadasDeChuva(html)).toBe(0);
    expect(html).not.toContain('tracado-svg--molhado');
    expect(reflexos(html)).toBe(0);
  });

  it('movimento reduzido: tira a chuva e o spray, e fica o asfalto molhado, que é estático', () => {
    tela_.reduzido = true;
    const html = tela(chuva, meio(chuva));
    expect(camadasDeChuva(html)).toBe(0);
    expect(html).not.toContain('href="#spray-');
    expect(html).toContain('tracado-svg--molhado');
    expect(reflexos(html)).toBe(2);
  });

  it('os reflexos ficam sobre a pista e sob os carros', () => {
    const html = tela(chuva, meio(chuva));
    expect(html.indexOf('tracado-svg__reflexo')).toBeGreaterThan(html.indexOf('tracado-svg__camada'));
    expect(html.lastIndexOf('tracado-svg__reflexo')).toBeLessThan(html.indexOf('<g class="tracado-svg__carro'));
  });

  it('a chuva cai fora do SVG, para o quadro não repintar a pista', () => {
    const html = tela(chuva, meio(chuva));
    expect(html.indexOf('chuva-replay')).toBeGreaterThan(html.indexOf('</svg>'));
  });
});

describe('spray', () => {
  const chuva = corridaCom(true);
  const seco = corridaCom(false);
  const meio = chuva.resultado.classificacao[0].tempoTotal / 2;
  const sprays = (html: string) => [...html.matchAll(/<use class="tracado-svg__spray" href="#spray-(\d)"/g)].map((m) => Number(m[1]));

  it('um por carro na pista, com intensidade 1 a 3, só na chuva', () => {
    const niveis = sprays(tela(chuva, meio));
    expect(niveis.length).toBeGreaterThan(15);
    expect(niveis.every((n) => n >= 1 && n <= 3)).toBe(true);
    expect(sprays(tela(seco, seco.resultado.classificacao[0].tempoTotal / 2)).length).toBe(0);
  });

  it('todo spray vem antes do carro: nenhum cobre carro', () => {
    const html = tela(chuva, meio);
    expect(html.lastIndexOf('tracado-svg__spray')).toBeLessThan(html.indexOf('<g class="tracado-svg__carro'));
  });

  it('o spray tem o transform do carro dele', () => {
    const html = tela(chuva, meio);
    const primeiro = /<use class="tracado-svg__spray" href="#spray-\d" transform="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`<g class="tracado-svg__carro" transform="${primeiro}"`);
  });

  it('carro parado na vaga e carro que já chegou não soltam spray', () => {
    const linha = linhaDoTempoDoPit(chuva.resultado, chuva.pista);
    const fim = Math.max(...chuva.resultado.classificacao.map((c) => c.tempoTotal));
    expect(sprays(tela(chuva, fim + 1000)).length).toBe(0);
    const j = Object.keys(chuva.resultado.voltasDePit).find((x) => linha.paradas(x).length > 0)!;
    const p = linha.paradas(j)[0];
    const t = (p.chegada + p.partida) / 2;
    const ativos = chuva.resultado.classificacao.filter(
      (c) => linha.posicao(c.jogadorId, chuva.resultado.historicoVoltas[c.jogadorId], c.status, t, false).fracaoNaPista !== null,
    );
    expect(ativos.length).toBeLessThan(22);
    expect(sprays(tela(chuva, t)).length).toBeLessThanOrEqual(ativos.length);
  });

  it('Suzuka: spray sob a ponte fica antes do tabuleiro, com o carro', () => {
    const suzuka = corridaCom(true, 'pista-suzuka');
    const linha = linhaDoTempoDoPit(suzuka.resultado, suzuka.pista);
    const fim = suzuka.resultado.classificacao[0].tempoTotal;
    const id = suzuka.resultado.classificacao[1].jogadorId;
    const h = suzuka.resultado.historicoVoltas[id];
    let t = 0;
    while (t < fim && !linha.posicao(id, h, 'terminou', t, false).sob) t += 50;
    expect(t).toBeLessThan(fim);
    const html = tela(suzuka, t);
    expect(html.indexOf('tracado-svg__spray')).toBeLessThan(html.indexOf('<mask'));
  });
});

describe('carros', () => {
  const carrosEm = (html: string) => [...html.matchAll(/<g class="tracado-svg__carro[^"]*"[^>]*>/g)].map((m) => m[0]);
  const corrida = corridaCom(false);
  const meio = corrida.resultado.classificacao[0].tempoTotal / 2;

  it('22 carros, cada um com transform de posição e rumo, e nada de bolinha', () => {
    const html = tela(corrida, meio);
    const carros = carrosEm(html);
    expect(carros.length).toBe(22);
    for (const c of carros) expect(c).toMatch(/transform="translate\([-\d.]+ [-\d.]+\) rotate\([-\d.]+\) scale\([\d.]+\)"/);
    expect(html).not.toMatch(/<circle[^>]*tracado-svg__carro/);
    expect(html.match(/<use href="#carro-c"/g)?.length).toBe(22);
    expect(html.match(/<title>/g)?.length).toBe(22);
  });

  it('o rumo desenhado é o da linha do tempo do pit', () => {
    const { pista, resultado } = corrida;
    const linha = linhaDoTempoDoPit(resultado, pista);
    const humano = 'j01';
    const item = resultado.classificacao.find((c) => c.jogadorId === humano)!;
    const { rumo } = linha.posicao(humano, resultado.historicoVoltas[humano], item.status, meio, false);
    const carro = carrosEm(tela(corrida, meio)).find((c) => c.includes('--humano'))!;
    expect(carro).toContain(`rotate(${rumo.toFixed(1)})`);
  });

  it('tela larga: C completo e escala de desktop; estreita: C proporcional e escala de celular', () => {
    const asaDe = (html: string) => /<g id="carro-c">.*?class="carro-c__asa" x="[-\d.]+" y="[-\d.]+" width="([\d.]+)"/.exec(html)?.[1];
    const larga = tela(corrida, meio);
    expect(asaDe(larga)).toBe('3');
    expect(carrosEm(larga).find((c) => c.includes('--humano'))).toContain('scale(1.2)');
    expect(carrosEm(larga).find((c) => !c.includes('--humano'))).toContain('scale(0.86)');
    tela_.estreita = true;
    const estreita = tela(corrida, meio);
    expect(asaDe(estreita)).toBe('4.1');
    expect(carrosEm(estreita).find((c) => c.includes('--humano'))).toContain('scale(1.48)');
    expect(carrosEm(estreita).find((c) => !c.includes('--humano'))).toContain('scale(1.05)');
  });

  it('o humano é desenhado por último, para o pelotão não o cobrir', () => {
    const carros = carrosEm(tela(corrida, meio));
    expect(carros.at(-1)).toContain('--humano');
  });

  it('halo: no Single, o humano; no online, só quem está jogando', () => {
    const halos = (html: string) => html.match(/tracado-svg__halo/g)?.length ?? 0;
    expect(halos(tela(corrida, meio))).toBe(1);
    expect(halos(tela(corrida, meio, { jogadorLocalId: 'j05' }))).toBe(1);
    expect(halos(tela(corrida, meio, { jogadorLocalId: null }))).toBe(0);
    const html = tela(corrida, meio, { jogadorLocalId: 'j05' });
    const comHalo = /<g class="tracado-svg__carro[^"]*"[^>]*><circle class="tracado-svg__halo"[^>]*>.*?<title>([^<]*)/.exec(html)?.[1];
    expect(comHalo).not.toContain('Você');
  });

  it('Suzuka: carro sob a ponte vem antes do tabuleiro, os outros depois', () => {
    const suzuka = corridaCom(false, 'pista-suzuka');
    const linha = linhaDoTempoDoPit(suzuka.resultado, suzuka.pista);
    const fim = suzuka.resultado.classificacao[0].tempoTotal;
    const id = suzuka.resultado.classificacao[1].jogadorId;
    const h = suzuka.resultado.historicoVoltas[id];
    let t = 0;
    while (t < fim && !linha.posicao(id, h, 'terminou', t, false).sob) t += 50;
    expect(t).toBeLessThan(fim);
    const html = tela(suzuka, t);
    const tabuleiro = html.indexOf('<mask');
    const primeiro = html.indexOf('<g class="tracado-svg__carro');
    expect(tabuleiro).toBeGreaterThan(0);
    expect(primeiro).toBeLessThan(tabuleiro);
    expect(html.lastIndexOf('<g class="tracado-svg__carro')).toBeGreaterThan(tabuleiro);
  });
});

describe('incidentes na tela (PR 2d)', () => {
  const achar = (criterio: (c: ReturnType<typeof corridaCom>, r: ReturnType<typeof replayDaCorrida>) => string | undefined) => {
    for (let seed = 1; seed < 400; seed++) {
      const corrida = prepararCorrida(dataset, estado, 'pista-spa', seed);
      const replay = replayDaCorrida(corrida.resultado, corrida.pista);
      const id = criterio(corrida, replay);
      if (id !== undefined) return { corrida, id, replay };
    }
    throw new Error('sem corrida com esse caso');
  };
  const linhasDoTicker = (html: string) => [...html.matchAll(/<li><span class="ticker-eventos__volta">.*?<\/li>/g)].map((m) => m[0]);
  const comIncidente = (chuva: boolean) =>
    achar((c, r) => (c.resultado.chuva === chuva ? c.resultado.classificacao.find((x) => x.jogadorId !== 'j01' && r.incidentes(x.jogadorId).length > 0)?.jogadorId : undefined));

  it('o painel e o ticker não mostram "bot-" nem o id do jogador', () => {
    const corrida = corridaCom(false);
    const html = tela(corrida, corrida.resultado.classificacao[0].tempoTotal);
    const nomes = [...html.matchAll(/classificacao-ao-vivo__nome">([^<]*)</g)].map((m) => m[1]);
    expect(nomes).toHaveLength(22);
    for (const n of nomes) expect(n).not.toMatch(/^(bot-\d+|j\d+)$/);
    expect(nomes).toContain('Você');
    expect(html).toContain('ticker-eventos__piloto');
  });

  it('o evento entra no ticker no instante do carro, não na volta do líder', () => {
    const { corrida, id, replay } = comIncidente(false);
    const [inc] = replay.incidentes(id);
    const nome = rotulos.get(id)!;
    const conta = (t: number) => linhasDoTicker(tela(corrida, t)).filter((l) => l.includes(`>${nome}<`) && l.includes(`>V${inc.evento.volta}<`)).length;
    expect(conta(inc.inicio - 1)).toBe(0);
    expect(conta(inc.inicio)).toBe(1);
  });

  it('a frase traz o piloto em destaque e a consequência', () => {
    const { corrida, id, replay } = comIncidente(false);
    const [inc] = replay.incidentes(id);
    const nome = rotulos.get(id)!;
    const linha = linhasDoTicker(tela(corrida, inc.fim)).find((l) => l.includes(`>${nome}<`))!;
    expect(linha).toContain(`<span class="ticker-eventos__piloto">${nome}</span>`);
    expect(linha).toMatch(/perdeu \d+,\d s/);
    expect(linha).not.toContain('bot-');
  });

  it('o ticker do humano diz o piloto e o nome do jogador', () => {
    const { corrida, replay } = achar((_c, r) => (r.incidentes('j01').length > 0 ? 'j01' : undefined));
    const [inc] = replay.incidentes('j01');
    const linha = linhasDoTicker(tela(corrida, inc.fim)).find((l) => l.includes(`>${rotulos.get('j01')}<`))!;
    expect(linha).toContain('(Você)');
  });

  it('desenha o efeito no momento e o tira no fim; com movimento reduzido, nada', () => {
    const { corrida, id, replay } = comIncidente(false);
    const [inc] = replay.incidentes(id);
    expect(tela(corrida, inc.inicio)).toContain('tracado-svg__efeito--fumaca');
    expect(tela(corrida, inc.inicio - 1)).not.toContain('tracado-svg__efeito');
    tela_.reduzido = true;
    expect(tela(corrida, inc.inicio)).not.toContain('tracado-svg__efeito');
  });

  it('na chuva o erro de piloto solta spray', () => {
    const { corrida, id, replay } = achar((c, r) =>
      c.resultado.chuva && r.incidentes('j02').some((i) => i.evento.tipo === 'erro-piloto') ? 'j02' : undefined,
    );
    const inc = replay.incidentes(id).find((i) => i.evento.tipo === 'erro-piloto')!;
    expect(tela(corrida, inc.inicio)).toContain('tracado-svg__efeito--spray');
  });

  it('a guinada entra no rumo; com movimento reduzido, o carro só para', () => {
    const { corrida, id, replay } = achar((_c, r) => (r.incidentes('j01').some((i) => i.evento.tipo === 'erro-piloto') ? 'j01' : undefined));
    const inc = replay.incidentes(id).find((i) => i.evento.tipo === 'erro-piloto')!;
    const h = corrida.resultado.historicoVoltas[id];
    const rotacao = (html: string) => /<g class="tracado-svg__carro tracado-svg__carro--humano[^"]*" transform="[^"]*rotate\(([-\d.]+)\)/.exec(html)![1];
    const escala = corrida.resultado.classificacao[0].tempoTotal / (corrida.pista.voltas * 4500);
    const t = inc.inicio + 175 * escala;
    const { rumo } = replay.posicao(id, h, 'terminou', t, false);
    expect(rotacao(tela(corrida, t))).not.toBe(rumo.toFixed(1));
    tela_.reduzido = true;
    expect(rotacao(tela(corrida, t))).toBe(replay.posicao(id, h, 'terminou', t, true).rumo.toFixed(1));
  });

  it('carro parado no incidente não solta spray', () => {
    const { corrida, replay } = achar((c, r) => (c.resultado.chuva && r.incidentes('j01').length > 0 ? 'j01' : undefined));
    const [inc] = replay.incidentes('j01');
    const html = tela(corrida, inc.inicio + 1);
    const transform = /<g class="tracado-svg__carro tracado-svg__carro--humano[^"]*" transform="([^"]+)"/.exec(html)![1];
    for (const nivel of [1, 2, 3]) expect(html).not.toContain(`href="#spray-${nivel}" transform="${transform}"`);
  });

  it('DNF: congelado e parado no ponto, com o selo de DNF no instante do abandono', () => {
    const { corrida, id, replay } = achar((c) => c.resultado.classificacao.find((x) => x.status === 'dnf')?.jogadorId);
    const ab = replay.abandono(id)!;
    const nome = nomeNoPainel(id);
    const linha = (t: number) => [...tela(corrida, t).matchAll(/<li class="classificacao-ao-vivo__linha[^"]*">(.*?)<\/li>/g)].map((m) => m[1]).find((l) => l.includes(`>${nome}<`))!;
    expect(linha(ab.instante - 1)).not.toContain('badge-dnf');
    expect(linha(ab.instante)).toContain('badge-dnf');
    expect(tela(corrida, ab.instante)).toContain('tracado-svg__carro--congelado');
  });

  it('a frase do incidente na volta de pit termina em "e foi para os boxes"', () => {
    const { corrida, id, replay } = achar((c, r) =>
      c.resultado.classificacao.find((x) => r.incidentes(x.jogadorId).some((i) => c.resultado.voltasDePit[x.jogadorId].includes(i.evento.volta)))?.jogadorId,
    );
    const inc = replay.incidentes(id).find((i) => corrida.resultado.voltasDePit[id].includes(i.evento.volta))!;
    const linha = linhasDoTicker(tela(corrida, inc.fim)).find((l) => l.includes(`>${rotulos.get(id)}<`) && l.includes(`>V${inc.evento.volta}<`))!;
    expect(linha).toContain('e foi para os boxes');
  });

  it('o efeito cresce e some com a idade', () => {
    const efeito = (idade: number) =>
      renderToStaticMarkup(createElement(EfeitoDeIncidente, { tipo: 'fumaca', ponto: { x: 1, y: 2 }, rumo: 0, idade }));
    const raios = (html: string) => [...html.matchAll(/ r="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(efeito(0)).toContain('opacity="1.00"');
    expect(efeito(0.5)).toContain('opacity="0.50"');
    expect(raios(efeito(0.5))[0]).toBeGreaterThan(raios(efeito(0))[0]);
    expect(efeito(0)).toContain('tracado-svg__efeito--fumaca');
  });

  it('as cores do efeito são tokens da pista, não de raridade', () => {
    const css = readFileSync('src/ui/estilos.css', 'utf8');
    expect(css).toMatch(/\.tracado-svg__efeito--fumaca \{\s*fill: var\(--pista-limite\);/);
    expect(css).toMatch(/\.tracado-svg__efeito--spray \{\s*fill: var\(--carro-halo\);/);
  });

  it('a tela desenha a mesma lista pura que os testes de duração cobrem', () => {
    const { corrida, id, replay } = comIncidente(false);
    const [inc] = replay.incidentes(id);
    const escala = corrida.resultado.classificacao[0].tempoTotal / (corrida.pista.voltas * 4500);
    const lista = efeitosNoInstante(replay, corrida.resultado, corrida.pista.id, inc.inicio, escala);
    expect(tela(corrida, inc.inicio).match(/tracado-svg__efeito--/g)).toHaveLength(lista.length);
  });
});

describe('depois da bandeirada (PR 2e)', () => {
  /** Linhas do painel, de cima para baixo. */
  const linhas = (html: string) =>
    [...html.matchAll(/<li class="classificacao-ao-vivo__linha[^"]*">(.*?)<\/li>/g)].map((m) => m[1]);
  const achar = (criterio: (r: ReturnType<typeof replayDaCorrida>, c: ReturnType<typeof corridaCom>) => string | undefined) => {
    for (const pistaId of ['pista-imola', 'pista-suzuka']) {
      for (let seed = 1; seed < 400; seed++) {
        const corrida = prepararCorrida(dataset, estado, pistaId, seed);
        const id = criterio(replayDaCorrida(corrida.resultado, corrida.pista), corrida);
        if (id !== undefined) return { corrida, id, replay: replayDaCorrida(corrida.resultado, corrida.pista) };
      }
    }
    throw new Error('sem corrida com esse caso');
  };

  it('o título e o botão mudam na bandeirada, não antes', () => {
    const corrida = corridaCom(false);
    const { bandeirada } = replayDaCorrida(corrida.resultado, corrida.pista);
    const antes = tela(corrida, bandeirada - 1);
    expect(antes).toContain(`Volta ${corrida.pista.voltas}/${corrida.pista.voltas}`);
    expect(antes).toContain('Acelerar ⏩');
    expect(antes).not.toContain('Ir para o resultado');
    const depois = tela(corrida, bandeirada);
    expect(depois).toContain('🏁 Bandeirada');
    expect(depois).toContain('Ir para o resultado →');
    expect(depois).not.toContain('Acelerar ⏩');
  });

  it('o retardatário recebe a 🏁 ao cruzar e fica com +1 V', () => {
    const { corrida, id, replay } = achar(
      (r, c) => c.resultado.classificacao.find((x) => (r.chegada(x.jogadorId)?.voltas ?? c.pista.voltas) < c.pista.voltas)?.jogadorId,
    );
    const instante = replay.chegada(id)?.instante ?? 0;
    const nome = nomeNoPainel(id);
    const linhaDele = (t: number) => linhas(tela(corrida, t)).find((l) => l.includes(`>${nome}<`)) ?? '';
    expect(linhaDele(instante - 1)).not.toContain('🏁');
    expect(linhaDele(instante)).toContain('🏁');
    expect(linhaDele(replay.fim)).toContain('+1 V');
  });

  it('o selo da punição aparece com a 🏁, com o valor, e só no punido', () => {
    const { corrida, id, replay } = achar(
      (r, c) => c.resultado.classificacao.find((x) => r.punicaoMs(x.jogadorId) > 0)?.jogadorId,
    );
    const instante = replay.chegada(id)?.instante ?? 0;
    const nome = nomeNoPainel(id);
    const linhaDele = (t: number) => linhas(tela(corrida, t)).find((l) => l.includes(`>${nome}<`)) ?? '';
    const texto = `+${(replay.punicaoMs(id) / 1000).toFixed(1).replace('.', ',')}s`;
    expect(linhaDele(instante - 1)).not.toContain('badge-punicao');
    expect(linhaDele(instante)).toContain(`class="badge-punicao"`);
    expect(linhaDele(instante)).toContain(`>${texto}<`);
    expect(linhaDele(instante)).toContain(`Punição de ${texto.slice(1, -1)} segundos`);
    const punidos = corrida.resultado.classificacao.filter((c) => replay.punicaoMs(c.jogadorId) > 0).length;
    expect(tela(corrida, replay.fim).match(/class="badge-punicao"/g)).toHaveLength(punidos);
  });

  it('quem está na volta lenta fica espalhado pela pista, e sem spray', () => {
    const chuva = corridaCom(true);
    const replay = replayDaCorrida(chuva.resultado, chuva.pista);
    const html = tela(chuva, replay.fim);
    expect(html.match(/<g class="tracado-svg__carro/g)?.length).toBe(22);
    expect(html).not.toContain('tracado-svg__spray');
    const transforms = new Set([...html.matchAll(/<g class="tracado-svg__carro[^"]*" transform="translate\(([^)]+)\)/g)].map((m) => m[1]));
    expect(transforms.size).toBeGreaterThan(15);
  });

  it('o retardatário que chegou não solta spray, mesmo com histórico sobrando', () => {
    const { corrida, replay } = achar(
      (r, c) =>
        c.resultado.chuva
          ? c.resultado.classificacao.find((x) => (r.chegada(x.jogadorId)?.voltas ?? c.pista.voltas) < c.pista.voltas)?.jogadorId
          : undefined,
    );
    expect(tela(corrida, replay.fim)).not.toContain('tracado-svg__spray');
  });

  it('com movimento reduzido, quem chegou fica na linha', () => {
    tela_.reduzido = true;
    const corrida = corridaCom(false);
    const replay = replayDaCorrida(corrida.resultado, corrida.pista);
    const transforms = [...tela(corrida, replay.fim).matchAll(/<g class="tracado-svg__carro[^"]*" transform="translate\(([^)]+)\)/g)].map((m) => m[1]);
    const linha = pontoNoTracado(tracadoSuavizado(corrida.pista.id), 0);
    const naLinha = `${linha.x.toFixed(2)} ${linha.y.toFixed(2)}`;
    const chegaram = corrida.resultado.classificacao.filter((c) => c.status === 'terminou').length;
    expect(chegaram).toBeGreaterThan(10);
    expect(transforms.filter((t) => t === naLinha)).toHaveLength(chegaram);
  });
});
