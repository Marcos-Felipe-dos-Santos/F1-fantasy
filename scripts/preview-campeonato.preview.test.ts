/**
 * PREVIEW DAS TELAS DO CAMPEONATO (PR 8.3) — escreve `preview/campeonato.html`.
 *
 * PARA QUE SERVE. As três telas novas (calendário, classificação entre
 * corridas com variação, fim de campeonato) só aparecem no app depois de
 * jogar um draft inteiro e 5 corridas. Este arquivo põe as três na mesma
 * página, com um campeonato REAL já simulado, pro dev julgar de uma vez.
 *
 * ⚠️ ESTE PREVIEW NÃO É MAQUETE — e é a diferença dele pro `paleta.html`.
 * Aquele monta CSS próprio a partir dos tokens; este INLINA o `tokens.css` e o
 * `estilos.css` REAIS de produção e renderiza os COMPONENTES REAIS com
 * `renderToStaticMarkup`. O que se vê aqui é o que o app desenha, com o mesmo
 * CSS — a única coisa que falta é interação (nada de clique, nada de replay).
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`.
 * `preview/` é gitignored.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnos from '../src/data/equipe-anos.json';
import pecas from '../src/data/pecas.json';
import pistas from '../src/data/pistas.json';
import type { DraftState, Loadout } from '../src/engine/types';
import {
  avancarEtapa,
  calendarioAnotado,
  calendarioSorteado,
  classificacaoApos,
  iniciarCampeonato,
  simularOResto,
  variacaoDePosicao,
} from '../src/ui/fluxo-campeonato';
import { FluxoCampeonato } from '../src/ui/FluxoCampeonato';
import { PainelCalendario } from '../src/ui/PainelCalendario';
import { PainelCampeonato } from '../src/ui/PainelCampeonato';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = criarDataset(equipeAnos, pecas, pistas);

/** Loadouts variados: usa equipe/anos espaçados pra a tabela não ficar monótona. */
function loadoutsDeTeste(n: number): Loadout[] {
  return Array.from({ length: n }, (_, i) => {
    const equipeAno = dataset.equipeAnos[i * 37];
    return {
      jogadorId: i === 0 ? 'humano-1' : `jogador-${i}`,
      pilotoId: equipeAno.pilotos[0].id,
      chassiId: equipeAno.chassi.id,
      motorId: equipeAno.motor.id,
      estrategistaId: equipeAno.estrategista.id,
      pitId: equipeAno.pit.id,
      pecaId: dataset.pecas[i % dataset.pecas.length].id,
    };
  });
}

function draftDeTeste(loadouts: Loadout[]): DraftState {
  const loadoutsRecord: Record<string, Loadout> = {};
  for (const l of loadouts) loadoutsRecord[l.jogadorId] = l;
  return {
    seed: 2026,
    fase: 'concluido',
    jogadores: loadouts.map((l, i) => ({
      id: l.jogadorId,
      tipo: i === 0 ? 'humano' : 'bot',
      nome: i === 0 ? 'Você' : undefined,
      perfilBot: i === 0 ? undefined : 'praGanhar',
    })),
    sorteios: {},
    progresso: {},
    ordemPeca: loadouts.map((l) => l.jogadorId),
    indicePeca: loadouts.length,
    pecasReveladas: null,
    copiasRestantes: {},
    loadouts: loadoutsRecord,
  };
}

/** Lê um CSS de `src/ui/` pra inlinar no preview (é o CSS de PRODUÇÃO, não uma cópia). */
function css(nome: string): string {
  return readFileSync(join(__dirname, '..', 'src', 'ui', nome), 'utf8');
}

describe('preview das telas do campeonato', () => {
  it('escreve preview/campeonato.html com as três telas', () => {
    const loadouts = loadoutsDeTeste(8);
    const draft = draftDeTeste(loadouts);
    const calendario = calendarioSorteado(dataset, 2026, 'curta');
    const inicial = iniciarCampeonato(dataset, loadouts, 2026, calendario);

    // Estado "entre corridas": 3 de 5 disputadas — há o que mostrar no
    // calendário (3 já correram, 1 é a próxima) e variação de verdade.
    const entreCorridas = avancarEtapa(avancarEtapa(avancarEtapa(inicial)));
    const concluido = simularOResto(inicial);

    const secoes: { titulo: string; nota: string; html: string }[] = [
      {
        titulo: '1. Calendário (durante o campeonato)',
        nota:
          'Três etapas já correram (com vencedor), a 4ª é a próxima — friso vermelho da marca. ' +
          'As silhuetas são as MESMAS da tela de corrida (pathDaVolta), não um desenho paralelo. ' +
          'Repare que o vencedor da 4ª e da 5ª NÃO aparece, embora já esteja simulado em memória.',
        html: renderToStaticMarkup(
          createElement(PainelCalendario, {
            state: draft,
            etapas: calendarioAnotado(entreCorridas),
          }),
        ),
      },
      {
        titulo: '2. Classificação entre corridas (com variação de posição)',
        nota:
          'Coluna ± mostra a variação desde a corrida anterior: ▲ subiu, ▼ caiu, – manteve. ' +
          'Depois da 1ª corrida a coluna é toda "–", porque não havia tabela antes.',
        html: renderToStaticMarkup(
          createElement(PainelCampeonato, {
            state: draft,
            classificacao: classificacaoApos(entreCorridas, 3),
            variacao: variacaoDePosicao(entreCorridas, 3),
            corridasFeitas: 3,
            totalCorridas: 5,
            concluido: false,
            onProximaCorrida: () => {},
            nomeProximaPista: dataset.pistasById.get(calendario[3])?.nome ?? '?',
            auto: false,
            onAuto: () => {},
          }),
        ),
      },
      {
        titulo: '3. Fim de campeonato (pódio + tabela final + calendário completo)',
        nota: 'Pódio 2º-1º-3º, com o campeão ao centro e mais alto. Abaixo de 360px ele empilha.',
        html: renderToStaticMarkup(
          createElement(FluxoCampeonato, {
            state: draft,
            campeonato: concluido,
            onProximaCorrida: () => {},
            onReiniciar: () => {},
          }),
        ),
      },
    ];

    const pagina = `<!doctype html>
<html lang="pt-BR" data-tema="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — telas do campeonato (PR 8.3)</title>
<style>
/* CSS REAL de produção, inlinado: este preview NÃO é maquete. */
${css('tokens.css')}
${css('estilos.css')}
/* Só o andaime da página de preview vive aqui. */
body { margin: 0; padding: 24px; background: var(--fundo); color: var(--texto);
       font-family: system-ui, -apple-system, sans-serif; }
.pv-secao { max-width: 900px; margin: 0 auto 48px; }
.pv-titulo { font-size: 1.1rem; margin: 0 0 4px; color: var(--acento-texto); }
.pv-nota { font-size: .85rem; color: var(--texto-suave); margin: 0 0 16px; line-height: 1.5; }
.pv-quadro { border: 1px dashed var(--borda); border-radius: 12px; padding: 16px; }
.pv-cabecalho { max-width: 900px; margin: 0 auto 32px; }
</style>
</head>
<body>
<div class="pv-cabecalho">
  <h1>Telas do campeonato — PR 8.3</h1>
  <p class="pv-nota">
    Componentes REAIS renderizados com o <code>estilos.css</code> e o <code>tokens.css</code> de
    produção — não é maquete. Campeonato de verdade, seed 2026, temporada curta (5 etapas),
    8 jogadores. Falta só interação: aqui nada clica e não há replay.
  </p>
</div>
${secoes
  .map(
    (s) => `<section class="pv-secao">
  <h2 class="pv-titulo">${s.titulo}</h2>
  <p class="pv-nota">${s.nota}</p>
  <div class="pv-quadro">${s.html}</div>
</section>`,
  )
  .join('\n')}
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview', 'campeonato.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, pagina, 'utf8');

    // Guardas mínimas: se o preview sair vazio ou sem as telas, o arquivo
    // existiria e o dev olharia uma página em branco sem saber por quê.
    expect(pagina).toContain('painel-calendario');
    expect(pagina).toContain('variacao');
    expect(pagina).toContain('podio');
    expect(pagina.length).toBeGreaterThan(5000);
    console.log(`\npreview escrito: ${destino}\n`);
  });
});
