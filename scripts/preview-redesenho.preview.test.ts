/**
 * PREVIEW DA FATIA 1 DO REDESENHO (PR 7.7) — escreve `preview/fatia1.html`.
 *
 * PARA QUE SERVE. O `cego.html` mede as 10 pistas juntas e não responde à
 * pergunta desta fatia: *o redesenho de Monza e Interlagos moveu o ponteiro
 * contra a linha de base de 0/10?* Este arquivo isola as duas e mostra, lado a
 * lado, a silhueta ANTERIOR (PR 2.8, 16 pontos) e a NOVA.
 *
 * REGRAS QUE O FORMATO RESPEITA, senão a medida não vale:
 * - **teste cego primeiro**: a seção de cima mostra só as DUAS silhuetas novas,
 *   sem nome, em ordem embaralhada por hash do id. O nome existe no DOM, mas
 *   escondido — é de boa-fé, não à prova de quem lê o código-fonte;
 * - a seção de antes/depois vem DEPOIS e também não nomeia a pista: rotula só
 *   "ANTES (16 pontos)" e "DEPOIS (N pontos)". Emparelhar não entrega o nome;
 * - ordem DETERMINÍSTICA (hash do id, mesma função do `cego.html`), pra a
 *   bateria poder ser repetida e comparada. Nada de `Math.random()`;
 * - geometria, camadas, cores e viewBox DE PRODUÇÃO. As silhuetas ANTIGAS
 *   passam pelo MESMO pipeline (`suavizarPolilinhaFechada` → `trechosDeZebra` →
 *   `trechoPorArco`) que as novas, senão a comparação mediria o pipeline em vez
 *   do desenho.
 *
 * ⚠️ NÃO EXISTE CAMADA DE PIT LANE no jogo. `CAMADAS_PISTA` tem sete: terreno,
 * escape, muro, zebra-a, zebra-b, limite e asfalto. São essas que aparecem aqui
 * — inventar uma oitava faria o preview deixar de refletir a tela, que é a
 * única coisa que o torna útil pra decidir.
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Ponto } from '../src/ui/fluxo-corrida';
import { CAMADAS_PISTA, VIEWBOX_PISTA, pathDoTrecho, trechosDeZebra } from '../src/ui/pista-camadas';
import { indiceDoVertice, suavizarPolilinhaFechada, trechoPorArco } from '../src/ui/suavizacao';
import { cores } from '../src/ui/tokens';
import { TRACADOS_POR_PISTA } from '../src/ui/tracados';

const __dirname = dirname(fileURLToPath(import.meta.url));

function hex(cor: string): string {
  return (cores as Record<string, string>)[cor] ?? '#f0f';
}

/** Mesma função do `cego.html`: ordem determinística que não é a do dataset. */
function hashDoId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * As silhuetas ANTERIORES, copiadas do commit anterior ao PR 7.7 (Monza vinha
 * de `TRACADO_GENERICO` em `fluxo-corrida.ts`, Interlagos de `tracados.ts`).
 * Ficam aqui congeladas de propósito: são o termo de comparação, e o preview
 * precisa continuar mostrando o antes mesmo depois de o código só ter o depois.
 */
const SILHUETAS_ANTERIORES: Record<string, readonly Ponto[]> = {
  'pista-monaco': [{ x: 150, y: 520 }, { x: 450, y: 520 }, { x: 500, y: 480 }, { x: 480, y: 380 }, { x: 520, y: 300 }, { x: 470, y: 220 }, { x: 500, y: 150 }, { x: 430, y: 90 }, { x: 380, y: 95 }, { x: 340, y: 160 }, { x: 360, y: 280 }, { x: 300, y: 340 }, { x: 380, y: 360 }, { x: 320, y: 420 }, { x: 250, y: 480 }, { x: 150, y: 500 }],
  'pista-spa': [{ x: 100, y: 500 }, { x: 200, y: 520 }, { x: 320, y: 480 }, { x: 300, y: 420 }, { x: 360, y: 380 }, { x: 340, y: 320 }, { x: 450, y: 250 }, { x: 700, y: 200 }, { x: 900, y: 220 }, { x: 870, y: 320 }, { x: 800, y: 380 }, { x: 750, y: 460 }, { x: 600, y: 500 }, { x: 400, y: 545 }, { x: 200, y: 540 }],
  'pista-silverstone': [{ x: 120, y: 500 }, { x: 350, y: 520 }, { x: 550, y: 500 }, { x: 650, y: 460 }, { x: 700, y: 380 }, { x: 630, y: 340 }, { x: 680, y: 280 }, { x: 620, y: 230 }, { x: 670, y: 170 }, { x: 600, y: 120 }, { x: 450, y: 100 }, { x: 250, y: 120 }, { x: 150, y: 200 }, { x: 200, y: 320 }, { x: 130, y: 400 }, { x: 100, y: 460 }],
  'pista-suzuka': [{ x: 900, y: 300 }, { x: 870, y: 477 }, { x: 783, y: 550 }, { x: 653, y: 477 }, { x: 500, y: 300 }, { x: 347, y: 123 }, { x: 217, y: 50 }, { x: 130, y: 123 }, { x: 100, y: 300 }, { x: 130, y: 477 }, { x: 217, y: 550 }, { x: 347, y: 477 }, { x: 500, y: 300 }, { x: 653, y: 123 }, { x: 783, y: 50 }, { x: 870, y: 123 }],
  'pista-interlagos': [{ x: 150, y: 200 }, { x: 400, y: 160 }, { x: 470, y: 220 }, { x: 420, y: 280 }, { x: 500, y: 340 }, { x: 460, y: 420 }, { x: 550, y: 460 }, { x: 500, y: 520 }, { x: 600, y: 540 }, { x: 650, y: 480 }, { x: 750, y: 500 }, { x: 900, y: 460 }, { x: 880, y: 300 }, { x: 750, y: 220 }, { x: 600, y: 140 }, { x: 300, y: 130 }],
  'pista-nurburgring': [{ x: 80, y: 300 }, { x: 150, y: 150 }, { x: 220, y: 190 }, { x: 300, y: 140 }, { x: 380, y: 175 }, { x: 460, y: 130 }, { x: 540, y: 165 }, { x: 620, y: 120 }, { x: 700, y: 155 }, { x: 780, y: 110 }, { x: 860, y: 160 }, { x: 920, y: 300 }, { x: 860, y: 440 }, { x: 780, y: 490 }, { x: 700, y: 445 }, { x: 620, y: 480 }, { x: 540, y: 435 }, { x: 460, y: 470 }, { x: 380, y: 425 }, { x: 300, y: 460 }, { x: 220, y: 410 }, { x: 150, y: 450 }],
  'pista-imola': [{ x: 150, y: 500 }, { x: 450, y: 510 }, { x: 600, y: 480 }, { x: 580, y: 430 }, { x: 630, y: 400 }, { x: 700, y: 350 }, { x: 680, y: 280 }, { x: 620, y: 250 }, { x: 660, y: 200 }, { x: 600, y: 150 }, { x: 450, y: 120 }, { x: 300, y: 140 }, { x: 200, y: 220 }, { x: 250, y: 320 }, { x: 180, y: 400 }, { x: 120, y: 460 }],
  'pista-red-bull-ring': [{ x: 200, y: 500 }, { x: 500, y: 520 }, { x: 560, y: 440 }, { x: 650, y: 460 }, { x: 720, y: 380 }, { x: 680, y: 300 }, { x: 750, y: 200 }, { x: 600, y: 140 }, { x: 400, y: 160 }, { x: 300, y: 250 }, { x: 220, y: 350 }, { x: 180, y: 430 }],
  'pista-montreal': [{ x: 150, y: 540 }, { x: 150, y: 460 }, { x: 140, y: 300 }, { x: 160, y: 150 }, { x: 300, y: 100 }, { x: 450, y: 120 }, { x: 600, y: 100 }, { x: 750, y: 150 }, { x: 800, y: 300 }, { x: 790, y: 460 }, { x: 750, y: 520 }, { x: 700, y: 480 }, { x: 650, y: 540 }, { x: 400, y: 545 }],
  'pista-monza': [{ x: 150, y: 500 }, { x: 650, y: 500 }, { x: 700, y: 480 }, { x: 670, y: 445 }, { x: 720, y: 415 }, { x: 800, y: 400 }, { x: 855, y: 320 }, { x: 815, y: 270 }, { x: 870, y: 210 }, { x: 820, y: 150 }, { x: 650, y: 110 }, { x: 320, y: 100 }, { x: 260, y: 130 }, { x: 160, y: 210 }, { x: 70, y: 360 }, { x: 100, y: 470 }],
};

const NOMES: Record<string, string> = {
  'pista-monaco': 'Monaco',
  'pista-spa': 'Spa-Francorchamps',
  'pista-monza': 'Monza',
  'pista-silverstone': 'Silverstone',
  'pista-suzuka': 'Suzuka',
  'pista-interlagos': 'Interlagos',
  'pista-nurburgring': 'Nurburgring GP',
  'pista-imola': 'Imola',
  'pista-red-bull-ring': 'Red Bull Ring',
  'pista-montreal': 'Montreal',
};

/** A pilha de camadas de produção, para uma polilinha de controle QUALQUER. */
function camadasSvg(controle: readonly Ponto[]): string {
  const curva = suavizarPolilinhaFechada(controle);
  const dVolta = `${pathDoTrecho(curva)} Z`;
  const zebras = trechosDeZebra(controle).map((trecho) => ({
    indice: trecho.indice,
    d: pathDoTrecho(trechoPorArco(curva, indiceDoVertice(trecho.indice), trecho.alcanceTras, trecho.alcanceFrente)),
  }));

  return CAMADAS_PISTA.map((camada) => {
    const comum = `fill="none" stroke="${hex(camada.cor)}" stroke-width="${camada.largura}" stroke-linecap="round" stroke-linejoin="round"`;
    const tracejado = camada.tracejado ? ` stroke-dasharray="${camada.tracejado}"` : '';
    if (camada.alvo === 'curvas') {
      return zebras.map((z) => `<path d="${z.d}" ${comum}${tracejado} />`).join('');
    }
    return `<path d="${dVolta}" ${comum}${tracejado} />`;
  }).join('');
}

function cartao(controle: readonly Ponto[], nome: string, rotulo: string, cego: boolean): string {
  const legenda = cego
    ? `<figcaption class="nome" data-nome="${nome}">${nome}</figcaption>`
    : `<figcaption class="rotulo">${rotulo} · ${controle.length} pontos</figcaption>`;
  return `<figure>
  <svg viewBox="${VIEWBOX_PISTA}" role="img" aria-label="silhueta de traçado">${camadasSvg(controle)}</svg>
  ${legenda}
</figure>`;
}

describe('preview do REDESENHO das 10 (antes/depois)', () => {
  it('escreve preview/redesenho.html', () => {
    const ids = Object.keys(SILHUETAS_ANTERIORES).sort((a, b) => hashDoId(a) - hashDoId(b));

    // O teste cego não pode usar a ordem do dataset nem a alfabética.
    expect(ids).toHaveLength(10);

    const cegos = ids.map((id) => cartao(TRACADOS_POR_PISTA[id], NOMES[id], 'depois', true)).join('\n');

    const comparacoes = ids
      .map((id) => {
        const antes = SILHUETAS_ANTERIORES[id];
        const depois = TRACADOS_POR_PISTA[id];
        return `<section class="par">
  <div class="grade2">
    ${cartao(antes, NOMES[id], 'ANTES (PR 2.8)', false)}
    ${cartao(depois, NOMES[id], 'DEPOIS (PR 7.7)', false)}
  </div>
  <p class="nota nome" data-nome="${NOMES[id]}">${NOMES[id]}</p>
</section>`;
      })
      .join('\n');

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Redesenho das 10 pistas — PR 7.7</title>
<style>
  body { margin: 0; padding: 32px; background: ${hex('fundo')}; color: ${hex('texto')};
         font-family: system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  h2 { font-size: 15px; margin: 36px 0 10px; text-transform: uppercase; letter-spacing: 0.08em;
       border-bottom: 2px solid ${hex('borda')}; padding-bottom: 6px; }
  p.intro { max-width: 70ch; line-height: 1.55; margin: 0 0 8px; opacity: 0.9; font-size: 14px; }
  .grade2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .grade5 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
  figure { margin: 0; border: 3px solid ${hex('borda')}; border-radius: 10px; overflow: hidden;
           background: ${hex('fundoAfundado')}; }
  svg { display: block; width: 100%; height: auto; }
  figcaption { padding: 8px 10px; font-size: 13px; font-weight: 600; text-align: center; }
  .nome { visibility: hidden; }
  .rotulo { opacity: 0.85; }
  .par { margin-bottom: 26px; }
  .nota { text-align: center; font-weight: 700; margin: 8px 0 0; font-size: 15px; }
  .acao { font: inherit; padding: 8px 14px; border-radius: 8px; cursor: pointer;
          border: 2px solid ${hex('borda')}; background: ${hex('fundoAfundado')}; color: inherit; }
</style>
</head>
<body>
<h1>Redesenho das 10 pistas — PR 7.7</h1>
<p class="intro">
  Linha de base registrada: <b>0/10</b> no teste cego (silhuetas do PR 2.8). As 10 foram
  redesenhadas a partir da geometria real de cada circuito — as 9 imagens de referencia mais a
  descricao textual da que faltou. A pergunta e a mesma: <b>quantas voce reconhece sem ler o
  nome?</b>
</p>

<h2>1 · Teste cego — responda antes de revelar</h2>
<p class="intro">
  As 10 silhuetas <b>novas</b>, sem nome, em ordem embaralhada por hash do id. Para cada uma:
  <b>que pista é essa?</b> Só depois de responder, clique em revelar. O placar aqui é a régua
  do redesenho contra a linha de base de 0/10.
</p>
<div class="grade5">
${cegos}
</div>
<p style="margin:14px 0 0"><button type="button" class="acao" id="revelar">revelar os nomes</button></p>

<h2>2 · Antes e depois</h2>
<p class="intro">
  Mesma pista em cada linha: à esquerda a silhueta do PR 2.8, à direita a redesenhada. Ambas
  passam pelo mesmo pipeline de produção (suavização, zebra por virada acumulada, as sete camadas),
  então a diferença que se vê é do desenho, não do render. O nome de cada par também só aparece
  ao revelar.
</p>
${comparacoes}

<script>
  document.getElementById('revelar').addEventListener('click', () => {
    document.querySelectorAll('.nome').forEach((el) => { el.style.visibility = 'visible'; });
  });
</script>
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview', 'redesenho.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, html, 'utf8');

    // Nenhum nome pode aparecer como texto renderizado antes do clique.
    for (const nome of Object.values(NOMES)) {
      const ocorrencias = html.split(nome).length - 1;
      const dentroDeNomeEscondido = html.split(`data-nome="${nome}"`).length - 1;
      // Cada ocorrência do nome vem sempre acompanhada da classe `.nome`
      // (escondida): 1 por card cego + 2 por par (atributo + texto da nota).
      expect(ocorrencias, `${nome} vaza fora de .nome`).toBe(dentroDeNomeEscondido * 2);
    }
    expect(html).toContain('viewBox="-10 -30 1000 660"');
  });
});
