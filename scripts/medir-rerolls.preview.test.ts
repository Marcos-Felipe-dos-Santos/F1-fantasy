/** Medição pareada: 200 campeonatos, 1 humano automatizado e21bots, sem ler notas na decisão de reroll. */
import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { atribuirPerfis, escolherBot } from '../src/engine/bots';
import { aplicarEscolha, criarDraft, resolverBots } from '../src/engine/draft';
import { aplicarReroll, candidatosDoReroll } from '../src/engine/rerolls';
import { simularCampeonato } from '../src/engine/campeonato';
import type { Jogador, TipoReroll } from '../src/engine/types';
import { dataset } from '../src/ui/dataset-app';
it('mede impacto de política fixa de rerolls sem favorecer artificialmente o resultado', () => {
  const linhas=[];
  for(const usar of [false,true]) {
    let vitorias=0,pontos=0,aplicados=0,semPool=0;
    for(let seed=0;seed<200;seed++) {
      const base:Jogador[]=Array.from({length:22},(_,i)=>({id:`j${String(i+1).padStart(2,'0')}`,tipo:'bot'}));
      const jogadores=atribuirPerfis(base,seed,'dificil').map((j,i)=>i===0?{...j,tipo:'humano' as const}:j);
      let state=resolverBots(criarDraft(dataset,jogadores,seed),dataset);
      while(state.fase==='sorteios') {
        const rodada=state.progresso.j01.rodada;
        const alvo:TipoReroll|undefined=usar?(['ano','marca','ano','ambos'] as const)[rodada-1]:undefined;
        if(alvo) {
          if(candidatosDoReroll(state,dataset,'j01',alvo).length) {
            const r=aplicarReroll(state,dataset,'j01',{tipo:'reroll',alvo,turnoEsperado:rodada,revisaoEsperada:state.rerolls.j01.revisao});
            expect(r.resultado).toBe('aplicado');state=r.state;aplicados++;
          } else semPool++;
        }
        // Automação de teste: a mesma estratégia praGanhar escolhe os slots em ambos os braços.
        const visao={...state,jogadores:state.jogadores.map(j=>j.id==='j01'?{...j,tipo:'bot' as const,perfilBot:'praGanhar' as const}:j)};
        state=resolverBots(aplicarEscolha(state,dataset,'j01',escolherBot(visao,dataset,'j01')),dataset);
      }
      while(state.fase==='peca') {
        const visao={...state,jogadores:state.jogadores.map(j=>j.id==='j01'?{...j,tipo:'bot' as const,perfilBot:'praGanhar' as const}:j)};
        state=resolverBots(aplicarEscolha(state,dataset,'j01',escolherBot(visao,dataset,'j01')),dataset);
      }
      const camp=simularCampeonato(dataset,Object.values(state.loadouts),dataset.pistas,seed);
      vitorias+=Number(camp.classificacao[0].jogadorId==='j01');
      pontos+=camp.classificacao.find(x=>x.jogadorId==='j01')!.pontos;
    }
    linhas.push({usarRerolls:usar,campeonatos:200,vitorias,pontosMedios:pontos/200,aplicados,semPool});
  }
  writeFileSync('docs/rerolls-medicao.json',JSON.stringify({metodo:'Seeds0..199, mesmas entradas e estratégia praGanhar para humano nos2braços; um reroll por rodada1..4:ano/marca/ano/ambos quando disponível; sem otimizar por força, sem rerolls de bots. Não é estimativa de jogador humano ótimo.',linhas},null,2)+'\n');
},120000);
