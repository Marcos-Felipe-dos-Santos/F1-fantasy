/**
 * Acha a corrida do preview do PR 3b (`scripts/preview-pr3b.tsx`): com o mesmo grid do preview (seu
 * carro é `j01`), uma corrida com chuva em que o SEU carro tem pit e problema técnico e não abandona,
 * com o problema longe do pit. É o que o Marcos quer ouvir: o problema técnico (500 ms, 60%), a
 * marcha lenta no pit e o equilíbrio com chuva e spray.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/preview-pr3b-cena.preview.test.ts --reporter=verbose --silent=false
 */

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { atribuirPerfis } from '../src/engine/bots';
import { criarDraft, resolverBots } from '../src/engine/draft';
import type { Jogador } from '../src/engine/types';
import { dataset } from '../src/ui/dataset-app';
import { replayDaCorrida } from '../src/ui/fim-da-corrida';
import { prepararCorrida } from '../src/ui/fluxo-corrida';

const VOCE = 'j01';

describe('cena do preview do PR 3b', () => {
  it('acha', () => {
    const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({ id: `j${String(i + 1).padStart(2, '0')}`, tipo: 'bot' as const }));
    const e = resolverBots(criarDraft(dataset, atribuirPerfis(base, 42, 'dificil'), 42), dataset);
    const estado = { ...e, jogadores: e.jogadores.map((j) => (j.id === VOCE ? { ...j, tipo: 'humano' as const, nome: 'Você' } : j)) };
    const achadas: Record<string, unknown>[] = [];
    for (const pista of dataset.pistas) {
      for (let seed = 1; seed <= 400 && achadas.filter((a) => a.pista === pista.id).length < 2; seed++) {
        const { resultado, pista: p } = prepararCorrida(dataset, estado, pista.id, seed);
        if (!resultado.chuva) continue;
        const r = replayDaCorrida(resultado, p);
        if (r.abandono(VOCE)) continue;
        const paradas = r.paradas(VOCE);
        const problema = r.incidentes(VOCE).find((x) => x.evento.tipo === 'problema-tecnico');
        if (paradas.length === 0 || problema === undefined) continue;
        if (paradas.some((x) => Math.abs(x.chegada - problema.inicio) < 20000)) continue;
        achadas.push({ pista: pista.id, seed, voltas: p.voltas, paradas: paradas.length, problemaMs: problema.inicio, pitMs: paradas[0].chegada, fim: r.fim });
      }
    }
    writeFileSync('preview/pr3b-cenas.json', `${JSON.stringify(achadas, null, 1)}\n`);
    console.log(JSON.stringify(achadas, null, 1));
  }, 600_000);
});
