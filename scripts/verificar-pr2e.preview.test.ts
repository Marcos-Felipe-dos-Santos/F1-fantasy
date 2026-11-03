/**
 * Verificação do PR 2e nas mesmas 1000 corridas da medição, com o dataset REAL
 * (os testes de `src/` rodam na fixture). Falha se a ordem final divergir da oficial, se
 * um retardatário aparecer acima de quem corre com posição oficial melhor, se um carro na
 * volta lenta passar outro, ou se houver salto na linha.
 * Só é contado o carro que passa um já chegado depois de sair do box, com a parada
 * terminando depois da chegada do outro: é a exceção aceita.
 * `bandeiraNoBox` = 1 é medição fixada: mexer na geometria do box ou na engine a move.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/verificar-pr2e.preview.test.ts --reporter=verbose --silent=false
 */

import { describe, expect, it } from 'vitest';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { simularCorrida } from '../src/engine/corrida';
import { criarDataset } from '../src/engine/dataset';
import { simularQuali } from '../src/engine/quali';
import { replayDaCorrida } from '../src/ui/fim-da-corrida';
import { classificacaoAoVivo } from '../src/ui/fluxo-corrida';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const AMOSTRAS = 80;

describe('verificação do PR 2e', () => {
  it('1000 corridas', () => {
    const conta = { corridas: 0, ordemDivergente: 0, retardatarioAcima: 0, retardatarios: 0, voltaLentaPassou: 0, lentoPassouQuemCorre: 0, saidaDoBoxPassou: 0, corridoPassou: 0, maiorSaltoU: 0, bandeiraNoBox: 0, fimAntesDaLenta: 0 };
    dataset.pistas.forEach((pista, indice) => {
      for (let k = 0; k < 100; k++) {
        const loadouts = draftarCampeonato(dataset, 7000 + k).loadouts;
        const seed = (7000 + k) * 1009 + indice;
        const grid = simularQuali(dataset, loadouts, pista, seed);
        const r = simularCorrida(dataset, loadouts, pista, grid, seed);
        const replay = replayDaCorrida(r, pista);
        conta.corridas++;

        const ordem = classificacaoAoVivo(r, grid.grid.map((g) => g.jogadorId), replay.fim, pista.voltas, replay);
        const parados = ordem.filter((i) => i.status !== 'correndo').map((i) => i.jogadorId);
        const oficial = r.classificacao.map((c) => c.jogadorId).filter((id) => parados.includes(id));
        if (parados.join() !== oficial.join()) conta.ordemDivergente++;

        const terminaram = r.classificacao.filter((c) => c.status === 'terminou').map((c) => c.jogadorId);
        const dados = terminaram.map((id) => ({ id, h: r.historicoVoltas[id], c: replay.chegada(id)! }));
        conta.retardatarios += dados.filter((d) => d.c.voltas < pista.voltas).length;
        conta.bandeiraNoBox += dados.filter((d) => d.c.inicioLenta !== d.c.instante).length;
        // `fim` vem de `instante`: o último a cruzar não pode estar ainda saindo do box.
        conta.fimAntesDaLenta += dados.filter((d) => replay.fim < d.c.inicioLenta).length;

        // Salto: a passagem pela linha, de 5 ms em 5 ms simulados, não pode teleportar o carro.
        for (const { id, h, c } of dados) {
          const a = replay.posicao(id, h, 'terminou', c.inicioLenta - 5, false).ponto;
          const b = replay.posicao(id, h, 'terminou', c.inicioLenta + 5, false).ponto;
          conta.maiorSaltoU = Math.max(conta.maiorSaltoU, Math.hypot(a.x - b.x, a.y - b.y));
        }

        const passo = Math.max(1, (replay.fim - replay.bandeirada) / AMOSTRAS);
        let anterior: Map<string, number> | null = null;
        const posicaoOficial = new Map(r.classificacao.map((c) => [c.jogadorId, c.posicao]));
        const ordemGrid = grid.grid.map((g) => g.jogadorId);
        for (let t = replay.bandeirada; t <= replay.fim; t += passo) {
          const painel = classificacaoAoVivo(r, ordemGrid, t, pista.voltas, replay);
          painel.forEach((acima, i) => {
            if ((replay.chegada(acima.jogadorId)?.voltas ?? pista.voltas) === pista.voltas || acima.status !== 'terminou') return;
            for (const abaixo of painel.slice(i + 1)) {
              if (abaixo.status !== 'terminou' && abaixo.status !== 'dnf' && (posicaoOficial.get(abaixo.jogadorId) ?? 0) < (posicaoOficial.get(acima.jogadorId) ?? 0)) conta.retardatarioAcima++;
            }
          });
          const naLenta = dados.filter((d) => t >= d.c.inicioLenta);
          const fracao = new Map(dados.map((d) => [d.id, replay.posicao(d.id, d.h, 'terminou', t, false).fracaoNaPista]));
          const lista = [...naLenta].sort((x, y) => x.c.instante - y.c.instante);
          for (let i = 1; i < lista.length; i++) {
            const a = lista[i - 1];
            const b = lista[i];
            if (a.c.inicioLenta === a.c.instante && b.c.inicioLenta === b.c.instante && (fracao.get(a.id) ?? 0) < (fracao.get(b.id) ?? 0)) conta.voltaLentaPassou++;
          }
          // Quem corre × quem já chegou: inversão de lado na pista entre duas amostras seguidas.
          if (anterior !== null) {
            for (const lento of naLenta) {
              for (const r2 of dados) {
                if (t >= r2.c.instante) continue;
                const f0 = anterior.get(r2.id);
                const f1 = fracao.get(r2.id);
                const l0 = anterior.get(lento.id);
                const l1 = fracao.get(lento.id);
                if (f0 == null || f1 == null || l0 == null || l1 == null || f1 < f0 || t - passo < lento.c.inicioLenta) continue;
                if (f0 < l0 && f1 >= l1) {
                  const saiuDoBox = replay.paradas(r2.id).some((p) => p.fim > lento.c.inicioLenta);
                  if (saiuDoBox) conta.saidaDoBoxPassou++;
                  else conta.corridoPassou++;
                }
                if (f0 > l0 && f1 <= l1) conta.lentoPassouQuemCorre++;
              }
            }
          }
          anterior = new Map([...fracao].map(([id, f]) => [id, f ?? -1]));
        }
      }
    });
    console.log(JSON.stringify(conta));
    expect(conta.corridas).toBe(1000);
    expect(conta.ordemDivergente).toBe(0);
    expect(conta.retardatarioAcima).toBe(0);
    expect(conta.voltaLentaPassou).toBe(0);
    expect(conta.corridoPassou).toBe(0);
    expect(conta.lentoPassouQuemCorre).toBe(0);
    expect(conta.maiorSaltoU).toBeLessThan(1);
    expect(conta.bandeiraNoBox).toBe(1);
    expect(conta.fimAntesDaLenta).toBe(0);
    expect(conta.retardatarios).toBeGreaterThan(0);
  }, 300000);
});
