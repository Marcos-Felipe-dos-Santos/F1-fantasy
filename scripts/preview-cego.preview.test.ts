/**
 * PREVIEW CEGO das 10 silhuetas — escreve `preview/cego.html`.
 *
 * PARA QUE SERVE. O critério de aceite do redesenho é subjetivo e o dev o
 * assume: *o jogador vê a pista e pensa "poxa, Interlagos" SEM LER O NOME*.
 * Não existe métrica automatizável disso (Hausdorff contra a pista real foi
 * recusado — aproximaria do mapa oficial, GDD §14.2). O substituto honesto é
 * medir o próprio dev: mostrar as silhuetas sem nome e registrar quantas ele
 * nomeia.
 *
 * ESTE ARQUIVO É A LINHA DE BASE, RODADO SOBRE AS SILHUETAS **ATUAIS** —
 * as do PR 2.8, que o portão do 7.4 já reprovou ("nenhuma das 10 é
 * reconhecível"). A expectativa é um placar BAIXO. Um placar baixo aqui é o
 * resultado esperado, não um bug: é contra ele que a fatia 1 vai ser comparada,
 * e é ele que sustenta o gatilho de abandono já aceito ("se a fatia 1 não mover
 * o ponteiro contra a linha de base cega, PARAR e reabrir a pergunta").
 *
 * REGRAS QUE O FORMATO PRECISA RESPEITAR, senão a medida não vale:
 * - nenhum nome visível antes do palpite (o nome existe no DOM, escondido —
 *   o teste é de boa-fé, não à prova de quem lê o código-fonte);
 * - ordem NÃO alfabética e NÃO a do dataset, senão a posição entrega a pista;
 * - ordem DETERMINÍSTICA (hash do id), pra a mesma bateria poder ser repetida
 *   e comparada. Nada de `Math.random()`, aqui também não;
 * - geometria, cores e viewBox DE PRODUÇÃO, sem a polilinha de controle rosa —
 *   o dev precisa julgar o que o jogador vê, não o andaime.
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`: é
 * ferramenta de dev que ESCREVE artefato, não verificação de lógica.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { CAMADAS_PISTA, VIEWBOX_PISTA, pathDaVolta, pathsDeZebraDaPista } from '../src/ui/pista-camadas';
import { cores } from '../src/ui/tokens';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

function hex(cor: string): string {
  return (cores as Record<string, string>)[cor] ?? '#f0f';
}

/**
 * Hash determinístico (FNV-1a de 32 bits) do id da pista. Serve só pra ordenar
 * os cartões de um jeito que não seja o do dataset nem o alfabético — e que
 * seja o MESMO em toda regeração, pra duas rodadas da bateria serem
 * comparáveis. Não é criptografia e não precisa ser.
 */
function hashDoId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const LETRAS = 'ABCDEFGHIJ';

/** A pilha de camadas de produção — mesma montagem do preview de traçados. */
function camadasSvg(pistaId: string): string {
  const zebras = pathsDeZebraDaPista(pistaId);
  return CAMADAS_PISTA.map((camada) => {
    const comum =
      `stroke="${hex(camada.cor)}" stroke-width="${camada.largura}" fill="none"` +
      ` stroke-linejoin="round"` +
      (camada.tracejado ? ` stroke-dasharray="${camada.tracejado}"` : '') +
      (camada.deslocamentoTracejado !== undefined
        ? ` stroke-dashoffset="${camada.deslocamentoTracejado}"`
        : '');
    if (camada.alvo === 'volta') {
      return `<path d="${pathDaVolta(pistaId)}" ${comum} stroke-linecap="round" />`;
    }
    return zebras.map((z) => `<path d="${z.d}" ${comum} stroke-linecap="butt" />`).join('');
  }).join('');
}

function cartao(pistaId: string, nome: string, letra: string): string {
  return `
  <figure class="pista" data-nome="${nome}" data-letra="${letra}">
    <div class="tela">
      <svg viewBox="${VIEWBOX_PISTA}" xmlns="http://www.w3.org/2000/svg">
        <rect x="-10" y="-30" width="1000" height="660" fill="${hex('fundo')}" />
        ${camadasSvg(pistaId)}
      </svg>
      <span class="letra">${letra}</span>
    </div>
    <figcaption>
      <div class="placar">
        <button type="button" data-voto="sim">reconheci</button>
        <button type="button" data-voto="quase">na dúvida</button>
        <button type="button" data-voto="nao">não faço ideia</button>
      </div>
      <div class="resposta"><span class="nome"></span></div>
    </figcaption>
  </figure>`;
}

describe('preview CEGO das silhuetas (linha de base do redesenho)', () => {
  it('escreve preview/cego.html com as 10 pistas sem nome', () => {
    const ordenadas = [...dataset.pistas].sort((a, b) => hashDoId(a.id) - hashDoId(b.id));
    const cartoes = ordenadas.map((p, i) => cartao(p.id, p.nome, LETRAS[i])).join('\n');

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bateria cega — linha de base</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: ${hex('fundo')}; color: ${hex('texto')};
         font-family: system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { margin: 0 0 16px; opacity: .8; font-size: 14px; line-height: 1.5; max-width: 88ch; }
  .barra { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 12px;
           border: 1px solid ${hex('borda')}; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
  .grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; }
  body.tamanho-360 .grade { grid-template-columns: repeat(auto-fit, 360px); }
  figure { margin: 0; border: 3px solid ${hex('borda')}; border-radius: 10px; overflow: hidden;
           background: ${hex('fundo')}; }
  .tela { position: relative; }
  svg { display: block; width: 100%; height: auto; }
  .letra { position: absolute; top: 8px; left: 10px; font: 700 15px/1 ui-monospace, monospace;
           color: ${hex('textoSuave')}; opacity: .85; }
  figcaption { padding: 10px 12px; border-top: 1px solid ${hex('borda')}; font-size: 13px; }
  .placar { display: flex; gap: 6px; }
  .placar button { flex: 1; padding: 6px 4px; font-size: 12px; cursor: pointer; border-radius: 6px;
                   border: 1px solid ${hex('bordaInterativa')}; background: ${hex('fundoAfundado')};
                   color: ${hex('texto')}; }
  .placar button[aria-pressed="true"] { background: ${hex('bordaInterativa')}; color: ${hex('textoEscuro')};
                                        font-weight: 700; }
  .resposta { margin-top: 8px; min-height: 18px; font-family: ui-monospace, monospace; font-size: 13px; }
  .nome { visibility: hidden; }
  figure.revelada .nome { visibility: visible; color: ${hex('pistaZebraA')}; font-weight: 700; }
  button.acao { padding: 7px 12px; cursor: pointer; border-radius: 6px; font-size: 13px;
                border: 1px solid ${hex('bordaInterativa')}; background: ${hex('fundoAfundado')};
                color: ${hex('texto')}; }
  #contagem { font-family: ui-monospace, monospace; font-size: 14px; }
  #resumo { width: 100%; margin-top: 20px; min-height: 120px; font-family: ui-monospace, monospace;
            font-size: 12px; background: ${hex('fundoAfundado')}; color: ${hex('texto')};
            border: 1px solid ${hex('borda')}; border-radius: 8px; padding: 10px; }
</style>
</head>
<body>
<h1>Bateria cega — linha de base das silhuetas ATUAIS</h1>
<p class="sub">
  Dez silhuetas, sem nome, em ordem embaralhada (determinística). Para cada uma, responda
  <b>antes de revelar</b>: você diria que pista é essa? Só então clique em <i>revelar tudo</i>.
  <br />Estas são as silhuetas de <b>hoje</b> — as mesmas que o portão do 7.4 já reprovou. Um placar
  baixo aqui é o resultado ESPERADO: ele é a régua contra a qual a fatia 1 vai ser medida.
  <br />Geometria, cores e viewBox são os de produção; a polilinha de controle rosa foi omitida
  de propósito.
</p>
<div class="barra">
  <label><input type="checkbox" id="p360" /> ver a 360px (a largura mínima do projeto)</label>
  <button type="button" class="acao" id="revelar">revelar tudo</button>
  <span id="contagem">0 reconheci · 0 na dúvida · 0 não faço ideia</span>
</div>
<div class="grade">
${cartoes}
</div>
<textarea id="resumo" readonly></textarea>
<script>
  const figuras = [...document.querySelectorAll('figure')];

  document.getElementById('p360').addEventListener('change', (e) => {
    document.body.classList.toggle('tamanho-360', e.target.checked);
  });

  for (const fig of figuras) {
    for (const botao of fig.querySelectorAll('.placar button')) {
      botao.addEventListener('click', () => {
        for (const irmao of fig.querySelectorAll('.placar button')) {
          irmao.setAttribute('aria-pressed', String(irmao === botao));
        }
        fig.dataset.voto = botao.dataset.voto;
        atualizar();
      });
    }
  }

  document.getElementById('revelar').addEventListener('click', () => {
    for (const fig of figuras) {
      fig.querySelector('.nome').textContent = fig.dataset.nome;
      fig.classList.add('revelada');
    }
    atualizar();
  });

  function atualizar() {
    const conta = (v) => figuras.filter((f) => f.dataset.voto === v).length;
    const sim = conta('sim'), quase = conta('quase'), nao = conta('nao');
    document.getElementById('contagem').textContent =
      sim + ' reconheci · ' + quase + ' na dúvida · ' + nao + ' não faço ideia';

    const linhas = figuras.map((f) =>
      '  ' + f.dataset.letra + ' — ' + (f.classList.contains('revelada') ? f.dataset.nome : '(não revelada)') +
      ': ' + (f.dataset.voto ?? '(sem voto)'));
    document.getElementById('resumo').value =
      'LINHA DE BASE CEGA (silhuetas atuais, pré-redesenho)\\n' +
      'placar: ' + sim + '/10 reconhecidas, ' + quase + ' na dúvida, ' + nao + ' sem ideia\\n' +
      linhas.join('\\n') + '\\n(colar no ESTADO.md como a régua da fatia 1)';
  }

  atualizar();
</script>
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview');
    mkdirSync(destino, { recursive: true });
    const arquivo = join(destino, 'cego.html');
    writeFileSync(arquivo, html, 'utf8');
    console.log(`\npreview CEGO escrito em: ${arquivo}\n`);

    expect(ordenadas).toHaveLength(10);
    // A ordem cega não pode ser a do dataset: se for, a posição entrega a pista.
    expect(ordenadas.map((p) => p.id)).not.toEqual(dataset.pistas.map((p) => p.id));
    // Nenhum nome pode aparecer como texto renderizado antes do clique em "revelar".
    for (const pista of dataset.pistas) {
      expect(html).not.toContain(`>${pista.nome}<`);
    }
  });
});
