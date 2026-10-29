/**
 * CERCA de folga entre trechos da pista (PR 2b). Nenhum ajuste futuro de
 * traçado pode voltar a colar dois trechos DIFERENTES da volta: em cada uma
 * das 10 pistas, a menor folga entre trechos distintos tem que ser de pelo
 * menos `VAO_MINIMO_U` (1px a 360px), medida pela geometria de produção
 * (`medirFolga`, ver `folga-pistas.ts`).
 *
 * DUAS ISENÇÕES, e só estas:
 *
 * 1. **Zonas de "mesma curva" ficam FORA desta cerca, por decisão do Marcos
 *    (2026-10-29).** É o lado interno de um grampo ou de uma chicane, em que
 *    as zebras dos dois ramos se tocam. Não são trechos diferentes da volta,
 *    e consertá-las exigiria abrir raios em 9 das 10 silhuetas. Registradas
 *    como pendência própria no `ESTADO.md`. A cerca isenta pelo `escopo` que
 *    `medirFolga` devolve, nunca por pista nem por par de vértices.
 * 2. **Cruzamento real só sob VIADUTO declarado em produção**
 *    (`VIADUTOS_POR_PISTA` em `src/ui/tracados.ts`, desenho em `viaduto.ts`). A isenção é literal: o
 *    círculo de `LARGURA_ESCAPE` em volta do ponto declarado
 *    (`dentroDoViaduto`). Um segundo cruzamento na mesma pista, fora dele,
 *    reprova.
 *
 * 3. **O BOX é elemento DECLARADO** (`BOXES_POR_PISTA` em `src/ui/tracados.ts`,
 *    geometria em `caminhoDoBox`, `src/ui/box.ts`): toda pista tem pit lane, e ela pode correr
 *    paralela à reta principal a afastamento fixo, mas não encosta em nenhum
 *    outro trecho (`medirFolgaDoBox`). Só a janela de entrada/saída, alargada
 *    pela rampa, é isenta.
 *
 * Tabela: `FOLGA_TABELA=1 npx vitest run scripts/folga-pistas.test.ts --reporter=verbose --silent=false`
 */

import { describe, expect, it } from 'vitest';
import pistas from '../src/data/pistas.json';
import type { Ponto } from '../src/ui/fluxo-corrida';
import { caminhoDoBox } from '../src/ui/box';
import { BOXES_POR_PISTA, VIADUTOS_POR_PISTA, tracadoDaPista } from '../src/ui/tracados';
import type { ParMaisApertado } from './folga-pistas';
import {
  ESCALA_360,
  LARGURA_LIMITE,
  LARGURA_ZEBRA,
  VAO_MINIMO_U,
  dentroDoViaduto,
  medirFolga,
  medirFolgaDoBox,
} from './folga-pistas';
import { suavizarPolilinhaFechada } from '../src/ui/suavizacao';

const IDS = (pistas as readonly { id: string }[]).map((p) => p.id);

function isencaoDosViadutos(pistaId: string): (a: Ponto, b: Ponto) => boolean {
  const declarados = (VIADUTOS_POR_PISTA[pistaId] ?? []).map((v) => dentroDoViaduto(v.centro));
  return (a, b) => declarados.some((dentro) => dentro(a, b));
}

function celula(par: ParMaisApertado | undefined): string {
  if (par === undefined) return '—'.padEnd(46);
  const onde = `#${par.controleA}${par.zebraA ? 'z' : ''}×#${par.controleB}${par.zebraB ? 'z' : ''} (${par.a.x.toFixed(0)},${par.a.y.toFixed(0)})`;
  return `${par.folga.toFixed(1).padStart(6)} u ${par.folgaPx360.toFixed(1).padStart(5)} px ${onde.padEnd(22)} ${par.tipo.slice(0, 5)}`;
}

describe('folga entre trechos não adjacentes (PR 2b)', () => {
  /** Só imprime com `FOLGA_TABELA=1`, pra não poluir o `npm test`. */
  it.runIf(process.env.FOLGA_TABELA === '1')('imprime a tabela das 10 pistas', () => {
    const linhas = [
      `marcação: zebra ${LARGURA_ZEBRA} / limite ${LARGURA_LIMITE} u · escala 360px = ${ESCALA_360} px/u · vão mínimo ${VAO_MINIMO_U.toFixed(3)} u (1px)`,
      `${''.padEnd(20)} ${'TRECHOS DISTINTOS: folga mínima, onde, tipo'.padEnd(46)} <1px │ ${'MESMA CURVA (isenta): folga mínima'.padEnd(46)} <1px`,
    ];
    for (const id of IDS) {
      const m = medirFolga(tracadoDaPista(id), isencaoDosViadutos(id));
      const dist = m.zonas.filter((z) => z.escopo === 'distintos').length;
      linhas.push(
        `${id.padEnd(20)} ${celula(m.piorDistintos)} ${String(dist).padStart(3)} │ ${celula(m.piorMesmaCurva)} ${String(m.zonas.length - dist).padStart(3)}`,
      );
    }
    console.log(linhas.join('\n'));
    expect(IDS).toHaveLength(10);
  });

  it.each(IDS.map((id) => [id] as const))(
    `%s: trechos DISTINTOS da volta têm folga >= ${VAO_MINIMO_U.toFixed(3)} u (1px a 360px), fora de viaduto declarado`,
    (id) => {
      const { piorDistintos: pior } = medirFolga(tracadoDaPista(id), isencaoDosViadutos(id));
      if (pior === undefined) return;
      expect(
        pior.folga,
        `${id}: ${pior.tipo} entre #${pior.controleA} e #${pior.controleB} perto de (${pior.a.x.toFixed(0)}, ${pior.a.y.toFixed(0)}), folga ${pior.folga.toFixed(1)} u / ${pior.folgaPx360.toFixed(1)} px`,
      ).toBeGreaterThanOrEqual(VAO_MINIMO_U);
    },
  );

  it.each(IDS.map((id) => [id] as const))(
    '%s: tem BOX declarado e a pit lane não encosta em nenhum outro trecho',
    (id) => {
      const box = BOXES_POR_PISTA[id];
      expect(box, `${id}: sem box declarado em BOXES_POR_PISTA`).toBeDefined();
      if (box === undefined) return;
      const controle = tracadoDaPista(id);
      const { amostras, janela, largura } = caminhoDoBox(suavizarPolilinhaFechada(controle), box);
      const m = medirFolgaDoBox(controle, amostras, janela, largura, box.rampa);
      expect(
        m.folga,
        `${id}: pit lane (${m.trecho}) em (${m.onde.x.toFixed(0)}, ${m.onde.y.toFixed(0)}) encosta na pista em (${m.contra.x.toFixed(0)}, ${m.contra.y.toFixed(0)}), folga ${m.folga.toFixed(1)} u`,
      ).toBeGreaterThanOrEqual(VAO_MINIMO_U);
    },
  );

  it('anti-vacuidade: o viaduto de Suzuka aparece como CRUZAMENTO quando nada é isento', () => {
    expect(medirFolga(tracadoDaPista('pista-suzuka')).pior.tipo).toBe('cruzamento');
  });

  it('anti-vacuidade: só Suzuka tem cruzamento real', () => {
    const comCruzamento = IDS.filter(
      (id) => medirFolga(tracadoDaPista(id)).pior.tipo === 'cruzamento',
    );
    expect(comCruzamento).toEqual(['pista-suzuka']);
  });

  /**
   * Um U comprido: duas retas paralelas a 40 u (abaixo do limite de 42) ligadas
   * por uma volta larga numa ponta. Precisa de vértices intermediários porque
   * com só 4 pontos a suavização arqueia as retas e elas se afastam.
   */
  it('anti-vacuidade: retas paralelas a 40 u, longe no arco, dão folga negativa entre trechos distintos', () => {
    const u = [
      ...[0, 100, 200, 300, 400, 500].map((x) => ({ x, y: 0 })),
      { x: 600, y: -100 },
      { x: 700, y: 20 },
      { x: 600, y: 140 },
      ...[500, 400, 300, 200, 100, 0].map((x) => ({ x, y: 40 })),
      { x: -60, y: 20 },
    ];
    const { pior } = medirFolga(u);
    expect(pior.folga).toBeLessThan(0);
    expect(pior.escopo).toBe('distintos');
  });

  it('anti-vacuidade: pit lane entre duas retas a 40 u (encostada nas duas) reprova, e a janela não isenta o trecho paralelo', () => {
    const u = [
      ...[0, 100, 200, 300, 400, 500].map((x) => ({ x, y: 0 })),
      { x: 600, y: -100 },
      { x: 700, y: 20 },
      { x: 600, y: 140 },
      ...[500, 400, 300, 200, 100, 0].map((x) => ({ x, y: 40 })),
      { x: -60, y: 20 },
    ];
    const amostras = [100, 200, 300].map((x) => ({ p: { x, y: 20 }, paralelo: true }));
    const m = medirFolgaDoBox(u, amostras, { inicio: 0, fim: 1e6 }, 26, 60);
    expect(m.folga).toBeLessThan(0);
    expect(m.trecho).toBe('paralelo');
  });

  it('anti-vacuidade: a isenção do viaduto é literal — um cruzamento fora do círculo declarado reprova', () => {
    const longe = dentroDoViaduto({ x: 9999, y: 9999 });
    expect(medirFolga(tracadoDaPista('pista-suzuka'), longe).piorDistintos?.tipo).toBe(
      'cruzamento',
    );
  });
});
