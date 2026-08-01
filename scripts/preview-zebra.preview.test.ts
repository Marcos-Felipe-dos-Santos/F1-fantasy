/**
 * PREVIEW DA ZEBRA NA DENSIDADE DO REDESENHO — escreve
 * `preview/zebra-densidade.html`.
 *
 * PARA QUE SERVE (pendência 4 do ESTADO, levantada na revisão do PR 7.6). Os
 * valores `JANELA_CURVATURA_ZEBRA = 88` e `COBERTURA_MAXIMA_ZEBRA = 0,4` foram
 * escolhidos na densidade de HOJE (~16 pontos de controle), onde o teto quase
 * não morde. Na densidade do redesenho (~120 pontos) o regime é outro: Monza
 * vai de 11 pra ~48 trechos e o teto passa a ser vinculante na maioria das
 * pistas. Nesse regime quem decide o desenho é **o teto + a ordem gulosa**, não
 * a geometria — e travar 88/40% sem ver isso seria decidir no escuro.
 *
 * COMO A DENSIDADE ALVO É SIMULADA. Mesmo método do teste de invariância em
 * `pista-camadas.test.ts` (`reamostrarPorArco` é cópia deliberada do de lá):
 * reamostra-se a CURVA SUAVIZADA em 120 pontos e trata-se ISSO como a nova
 * polilinha de controle. Reamostrar a polilinha de quinas cortaria cantos —
 * mudaria a forma, não só a densidade, e mediria outra coisa. A curva do 7.4 é
 * a mesma silhueta já densificada, que é a geometria que o redesenho terá.
 *
 * O redesenho por vir com o controle mais denso é também o motivo de o redraw
 * usar `AMOSTRAS_REDESENHO` = 4 e não as 12 de produção: com 120 pontos de
 * controle a sagita já é pequena, e é a queda pra 4-6 que o ESTADO registra
 * como decisão travada.
 *
 * O ALGORITMO É O DE PRODUÇÃO, variado por `OpcoesZebra` — nada aqui
 * reimplementa o critério. Um preview que reimplementa para de refletir a tela
 * no dia em que os dois divergem, e aí não decide nada.
 *
 * Roda por `npm run preview`, fora do `npm test`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import type { Ponto } from '../src/ui/fluxo-corrida';
import {
  ANGULO_MINIMO_ZEBRA,
  CAMADAS_PISTA,
  COBERTURA_MAXIMA_ZEBRA,
  JANELA_CURVATURA_ZEBRA,
  VIEWBOX_PISTA,
  type TrechoZebra,
  pathDaVolta,
  pathDoTrecho,
  pathsDeZebraDaPista,
  trechosDeZebra,
  viradaAcumuladaNaJanela,
} from '../src/ui/pista-camadas';
import {
  indiceDoVertice,
  suavizarPolilinhaFechada,
  trechoPorArco,
  tracadoSuavizado,
} from '../src/ui/suavizacao';
import { cores } from '../src/ui/tokens';
import { tracadoDaPista } from '../src/ui/tracados';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Densidade de controle que o redesenho terá (o ESTADO fala em 42-115 pontos). */
const DENSIDADE_ALVO = 120;
/** Amostras por segmento no redraw — ver cabeçalho: cai de 12 pra 4-6 no redesenho. */
const AMOSTRAS_REDESENHO = 4;

function hex(cor: string): string {
  return (cores as Record<string, string>)[cor] ?? '#f0f';
}

/**
 * Cópia deliberada do reamostrador de `pista-camadas.test.ts`: o preview
 * precisa simular a MESMA densidade que o teste de invariância mede, e o
 * helper de lá é local ao arquivo de teste. Exportá-lo da produção seria pôr
 * andaime de medição no bundle. Se um dos dois mudar, o outro tem de mudar
 * junto — é a única duplicação aceita aqui, e é de amostragem, não do critério.
 */
function reamostrarPorArco(pontos: readonly Ponto[], alvo: number): Ponto[] {
  const n = pontos.length;
  const seg: number[] = [];
  const arco: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    arco.push(acc);
    seg.push(Math.hypot(pontos[(i + 1) % n].x - pontos[i].x, pontos[(i + 1) % n].y - pontos[i].y));
    acc += seg[i];
  }
  const saida: Ponto[] = [];
  for (let k = 0; k < alvo; k++) {
    const alvoArco = (acc * k) / alvo;
    let i = 0;
    while (i < n - 1 && arco[i + 1] <= alvoArco) i++;
    const t = seg[i] === 0 ? 0 : (alvoArco - arco[i]) / seg[i];
    saida.push({
      x: pontos[i].x + (pontos[(i + 1) % n].x - pontos[i].x) * t,
      y: pontos[i].y + (pontos[(i + 1) % n].y - pontos[i].y) * t,
    });
  }
  return saida;
}

function perimetro(pontos: readonly Ponto[]): number {
  let soma = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    soma += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return soma;
}

/** Mesma conta de `coberturaAprox` em `pista-camadas.test.ts` (soma das cordas / perímetro, em %). */
function cobertura(pontos: readonly Ponto[], trechos: readonly TrechoZebra[]): number {
  let soma = 0;
  for (const { antes, vertice, depois } of trechos) {
    soma +=
      Math.hypot(vertice.x - antes.x, vertice.y - antes.y) +
      Math.hypot(depois.x - vertice.x, depois.y - vertice.y);
  }
  return (soma / perimetro(pontos)) * 100;
}

/**
 * Quantos vértices PASSARIAM no critério de virada, antes de o teto cortar.
 * A diferença entre isto e o número de trechos devolvidos é exatamente o que o
 * teto suprimiu — é assim que o preview sabe dizer "o teto MORDE aqui".
 */
function candidatos(pontos: readonly Ponto[], janela: number): number {
  let total = 0;
  for (let i = 0; i < pontos.length; i++) {
    if (viradaAcumuladaNaJanela(pontos, i, janela) >= ANGULO_MINIMO_ZEBRA) total++;
  }
  return total;
}

interface Variante {
  readonly rotulo: string;
  readonly teto: number;
  readonly destaque?: boolean;
}

/**
 * As colunas do comparativo. `1` é "sem teto" (a cobertura nunca passa de 100%),
 * e existe pra mostrar o que o teto está segurando — foi um traçado inteiro
 * virando faixa contínua que o dev reprovou quando o teto não existia.
 */
const VARIANTES: readonly Variante[] = [
  { rotulo: 'teto 25%', teto: 0.25 },
  { rotulo: `teto 40% (ATUAL)`, teto: COBERTURA_MAXIMA_ZEBRA, destaque: true },
  { rotulo: 'teto 60%', teto: 0.6 },
  { rotulo: 'SEM teto', teto: 1 },
];

/** Janelas varridas na tabela de sensibilidade (a outra metade da decisão 88/40%). */
const JANELAS = [44, 66, JANELA_CURVATURA_ZEBRA, 132, 176];

/** Camadas da volta viram `<use>` do mesmo `<path>`: 4 cópias do `d` por célula seriam ~30 KB à toa. */
function camadasComUse(idPath: string, zebras: readonly string[]): string {
  return CAMADAS_PISTA.map((camada) => {
    const comum =
      `stroke="${hex(camada.cor)}" stroke-width="${camada.largura}" fill="none" stroke-linejoin="round"`;
    const traco =
      (camada.tracejado ? ` stroke-dasharray="${camada.tracejado}"` : '') +
      (camada.deslocamentoTracejado !== undefined
        ? ` stroke-dashoffset="${camada.deslocamentoTracejado}"`
        : '');
    if (camada.alvo === 'volta') {
      return `<use href="#${idPath}" ${comum} stroke-linecap="round" />`;
    }
    return zebras
      .map((d) => `<path class="zebra" d="${d}" ${comum}${traco} stroke-linecap="butt" />`)
      .join('');
  }).join('');
}

/** Bolinha no primeiro e no último ponto de cada zebra: onde o tracejado `12 12` REINICIA. */
function limitesSvg(zebras: readonly { pontos: readonly Ponto[] }[]): string {
  const marcas = zebras
    .flatMap(({ pontos }) => [pontos[0], pontos[pontos.length - 1]])
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#ff2d95" />`)
    .join('');
  return `<g class="limites">${marcas}</g>`;
}

function celula(
  idPath: string,
  zebras: readonly { d: string; pontos: readonly Ponto[] }[],
  rotulo: string,
  stats: string,
  classe: string,
): string {
  return `
    <div class="celula ${classe}">
      <svg viewBox="${VIEWBOX_PISTA}" xmlns="http://www.w3.org/2000/svg">
        <rect x="-10" y="-30" width="1000" height="660" fill="${hex('fundo')}" />
        ${camadasComUse(idPath, zebras.map((z) => z.d))}
        ${limitesSvg(zebras)}
      </svg>
      <div class="rotulo">${rotulo}</div>
      <div class="stats">${stats}</div>
    </div>`;
}

describe('preview da ZEBRA na densidade do redesenho', () => {
  it('escreve preview/zebra-densidade.html', () => {
    const defs: string[] = [];
    const linhas: string[] = [];
    const sensibilidade: string[] = [];

    for (const pista of dataset.pistas) {
      const controleHoje = tracadoDaPista(pista.id);
      const curvaHoje = tracadoSuavizado(pista.id);
      const denso = reamostrarPorArco(curvaHoje, DENSIDADE_ALVO);
      const curvaDensa = suavizarPolilinhaFechada(denso, AMOSTRAS_REDESENHO);

      defs.push(`<path id="volta-hoje-${pista.id}" d="${pathDaVolta(pista.id)}" />`);
      defs.push(`<path id="volta-densa-${pista.id}" d="${pathDoTrecho(curvaDensa)} Z" />`);

      // Coluna de referência: exatamente o que está na tela hoje. Os `d` vêm de
      // `pathsDeZebraDaPista` (produção, memoizado); os pontos são recalculados
      // pela mesma `trechoPorArco` só pra posicionar os marcadores de limite.
      const trechosHoje = trechosDeZebra(controleHoje);
      const zebrasHoje = trechosHoje.map((t, i) => ({
        d: pathsDeZebraDaPista(pista.id)[i].d,
        pontos: trechoPorArco(curvaHoje, indiceDoVertice(t.indice), t.alcanceTras, t.alcanceFrente),
      }));
      const celulas = [
        celula(
          `volta-hoje-${pista.id}`,
          zebrasHoje,
          'HOJE (16 pts, teto 40%)',
          `${trechosHoje.length} trechos · ${cobertura(controleHoje, trechosHoje).toFixed(1)}% de cobertura`,
          'hoje',
        ),
      ];

      const totalCandidatos = candidatos(denso, JANELA_CURVATURA_ZEBRA);
      for (const variante of VARIANTES) {
        const trechos = trechosDeZebra(denso, { coberturaMaxima: variante.teto });
        const zebras = trechos.map((t) => {
          const pontos = trechoPorArco(
            curvaDensa,
            indiceDoVertice(t.indice, AMOSTRAS_REDESENHO),
            t.alcanceTras,
            t.alcanceFrente,
          );
          return { d: pathDoTrecho(pontos), pontos };
        });
        const cob = cobertura(denso, trechos);
        const cortou = trechos.length < totalCandidatos;
        const saturou = cob >= variante.teto * 100 - 0.5;
        const veredito = cortou
          ? `<b class="morde">TETO CORTA</b> ${totalCandidatos - trechos.length} de ${totalCandidatos} candidatos`
          : saturou
            ? `<b class="satura">SATURADO</b> — os ${totalCandidatos} couberam, mas encheram o teto`
            : `folgado (${totalCandidatos} candidatos, sobra teto)`;
        const stats = `${trechos.length} trechos · ${cob.toFixed(1)}% · ${veredito}`;
        celulas.push(
          celula(
            `volta-densa-${pista.id}`,
            zebras,
            `${DENSIDADE_ALVO} pts · ${variante.rotulo}`,
            stats,
            variante.destaque ? 'atual' : '',
          ),
        );
      }

      linhas.push(`<section class="pista">
      <h2>${pista.nome}</h2>
      <div class="fila">${celulas.join('')}</div>
    </section>`);

      // Linha da tabela de sensibilidade à JANELA (teto fixo no atual).
      const celulasJanela = JANELAS.map((janela) => {
        const trechos = trechosDeZebra(denso, { janela });
        const marca = janela === JANELA_CURVATURA_ZEBRA ? ' class="atual"' : '';
        return `<td${marca}>${trechos.length} · ${cobertura(denso, trechos).toFixed(0)}%</td>`;
      }).join('');
      sensibilidade.push(`<tr><th>${pista.nome}</th>${celulasJanela}</tr>`);
    }

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Zebra na densidade do redesenho — decidir 88/40%</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: ${hex('fundo')}; color: ${hex('texto')};
         font-family: system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 0 0 8px; color: ${hex('textoSuave')}; }
  p.sub { margin: 0 0 16px; opacity: .8; font-size: 14px; line-height: 1.55; max-width: 92ch; }
  .barra { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; padding: 12px;
           border: 1px solid ${hex('borda')}; border-radius: 8px; margin-bottom: 20px; font-size: 14px;
           position: sticky; top: 0; background: ${hex('fundoElevado')}; z-index: 5; }
  section.pista { margin-bottom: 26px; }
  .fila { display: grid; grid-template-columns: repeat(5, minmax(300px, 1fr)); gap: 12px;
          overflow-x: auto; padding-bottom: 6px; }
  .celula { border: 2px solid ${hex('borda')}; border-radius: 8px; overflow: hidden;
            background: ${hex('fundo')}; }
  .celula.atual { border-color: ${hex('pistaZebraA')}; }
  .celula.hoje { border-color: ${hex('bordaInterativa')}; }
  svg { display: block; width: 100%; height: auto; }
  .rotulo { padding: 6px 8px 2px; font: 700 12px/1.3 ui-monospace, monospace; }
  .celula.atual .rotulo { color: ${hex('pistaZebraA')}; }
  .celula.hoje .rotulo { color: ${hex('bordaInterativa')}; }
  .stats { padding: 0 8px 8px; font: 11px/1.4 ui-monospace, monospace; opacity: .85; }
  .morde { color: ${hex('pistaZebraB')}; }
  .satura { color: ${hex('pistaZebraA')}; }
  .achado { border: 2px solid ${hex('pistaZebraA')}; border-radius: 8px; padding: 12px 14px;
            margin: 0 0 20px; font-size: 14px; line-height: 1.55; max-width: 92ch;
            background: ${hex('fundoElevado')}; }
  .achado h3 { margin: 0 0 6px; font-size: 14px; color: ${hex('pistaZebraA')}; }
  .limites { display: none; }
  body.ver-limites .limites { display: inline; }
  body.sem-tracejado .zebra { stroke-dasharray: none !important; }
  table { border-collapse: collapse; font: 12px/1.4 ui-monospace, monospace; margin-top: 8px; }
  th, td { border: 1px solid ${hex('borda')}; padding: 4px 8px; text-align: right; }
  th { text-align: left; color: ${hex('textoSuave')}; font-weight: 400; }
  td.atual { background: ${hex('fundoElevado')}; color: ${hex('pistaZebraA')}; font-weight: 700; }
  .nota { font-size: 13px; opacity: .8; max-width: 92ch; line-height: 1.55; }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
${defs.join('\n')}
</defs></svg>

<h1>Zebra na densidade do redesenho — insumo pra travar 88/40%</h1>
<p class="sub">
  Cada linha é uma pista. A <b style="color:${hex('bordaInterativa')}">primeira célula</b> é o que está
  na tela HOJE (controle de 16 pontos). As quatro seguintes são a MESMA forma reamostrada em
  <b>${DENSIDADE_ALVO} pontos de controle</b> — a densidade que o redesenho terá — variando só o teto de
  cobertura. A <b style="color:${hex('pistaZebraA')}">terceira</b> é o valor atual (40%).
  <br />O algoritmo é o de produção (<code>trechosDeZebra</code>), variado por <code>OpcoesZebra</code>;
  nada aqui reimplementa o critério. Redraw com ${AMOSTRAS_REDESENHO} amostras por segmento
  (a queda de 12 → 4-6 já é decisão travada do redesenho).
</p>
<div class="achado">
  <h3>O que a medição mostrou — leia antes de olhar os desenhos</h3>
  Numa silhueta reamostrada em ${DENSIDADE_ALVO} pontos <b>uniformes</b>, cada trecho de zebra cobre
  ~1/${DENSIDADE_ALVO} do perímetro (o alcance vira <code>segmento/2</code> pra cada lado). Então o teto de
  40% deixa de ser uma restrição geométrica e vira uma <b>cota de contagem</b>:
  0,40 × ${DENSIDADE_ALVO} = <b>48 trechos</b>, e ponto. É por isso que sete das dez pistas abaixo param
  em exatamente 48 trechos / ~39,8% — Mônaco tem 93 candidatos, o Nordschleife 102, e as duas
  desenham a mesma quantidade de zebra que Monza, que tem 48.
  <br /><br />Quem escolhe QUAIS 48, aí, é a ordem gulosa (virada acumulada decrescente) — não a
  geometria da pista. <b>É esta a decisão que 88/40% está travando, e é ela que o dev precisa olhar:</b>
  se o teto continuar em 40%, o redesenho não muda a QUANTIDADE de zebra de pista nenhuma, só a
  posição dela. As colunas de 25% e 60% mostram o efeito de mexer na cota; a coluna sem teto mostra
  o que está sendo segurado.
</div>
<div class="barra">
  <label><input type="checkbox" id="limites" /> marcar início/fim de cada trecho
    (<span style="color:#ff2d95">rosa</span> — é onde o tracejado <code>12 12</code> REINICIA)</label>
  <label><input type="checkbox" id="tracejado" /> desligar o tracejado (zebra chapada)</label>
</div>

${linhas.join('\n')}

<h2>Sensibilidade à JANELA (a outra metade da decisão) — a ${DENSIDADE_ALVO} pontos, teto fixo em 40%</h2>
<p class="nota">
  Cada célula: <b>nº de trechos · cobertura</b>. A coluna destacada é a janela atual
  (${JANELA_CURVATURA_ZEBRA} u). Janela maior acumula virada de um pedaço maior de pista, então admite
  vértices mais suaves — e a partir de certo ponto passa a alcançar a curva vizinha, que foi o motivo
  de o 7.6 parar em 88 na densidade de hoje.
</p>
<table>
  <tr><th>pista</th>${JANELAS.map((j) => `<th style="text-align:right">janela ${j}</th>`).join('')}</tr>
  ${sensibilidade.join('\n  ')}
</table>

<script>
  document.getElementById('limites').addEventListener('change', (e) => {
    document.body.classList.toggle('ver-limites', e.target.checked);
  });
  document.getElementById('tracejado').addEventListener('change', (e) => {
    document.body.classList.toggle('sem-tracejado', e.target.checked);
  });
</script>
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview');
    mkdirSync(destino, { recursive: true });
    const arquivo = join(destino, 'zebra-densidade.html');
    writeFileSync(arquivo, html, 'utf8');

    // Números que o dev pediu explicitamente, também no console (o HTML é a
    // decisão; isto é a conferência de que o preview mostra o regime certo).
    const monza = reamostrarPorArco(tracadoSuavizado('pista-monza'), DENSIDADE_ALVO);
    const trechosMonza = trechosDeZebra(monza);
    let mordem = 0;
    let saturadas = 0;
    const tabela: string[] = [];
    for (const pista of dataset.pistas) {
      const denso = reamostrarPorArco(tracadoSuavizado(pista.id), DENSIDADE_ALVO);
      const trechos = trechosDeZebra(denso);
      const cand = candidatos(denso, JANELA_CURVATURA_ZEBRA);
      const cob = cobertura(denso, trechos);
      const cortou = trechos.length < cand;
      const saturou = cob >= COBERTURA_MAXIMA_ZEBRA * 100 - 0.5;
      if (cortou) mordem++;
      if (saturou) saturadas++;
      tabela.push(
        `  ${pista.nome.padEnd(26)} ${String(trechos.length).padStart(3)}/${String(cand).padEnd(3)} trechos · ` +
          `${cob.toFixed(1).padStart(5)}% ${cortou ? '· TETO CORTA' : saturou ? '· SATURADO' : ''}`,
      );
    }
    console.log(
      `\npreview ZEBRA escrito em: ${arquivo}\n` +
        `Monza a ${DENSIDADE_ALVO} pts: ${trechosMonza.length} trechos, ` +
        `${cobertura(monza, trechosMonza).toFixed(1)}% de cobertura\n` +
        `teto de 40%: CORTA candidatos em ${mordem} das 10 pistas; ` +
        `SATURA (enche o teto) em ${saturadas} das 10 (aceitos/candidatos):\n` +
        tabela.join('\n') +
        '\n',
    );

    expect(dataset.pistas).toHaveLength(10);
    expect(html).toContain('trechosDeZebra');
  });
});
