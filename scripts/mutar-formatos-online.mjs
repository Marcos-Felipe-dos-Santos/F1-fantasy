/** Mutação focal: implementação commitada, timeout por mutante e restauração garantida. */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const mutantes = [
 ['somente-host', 'src/net/sala.ts', "if (estado.anfitriaoId !== remetenteId) return recusar(estado, 'nao-e-anfitriao');", "if (false) return recusar(estado, 'nao-e-anfitriao');"],
 ['formatos-validos', 'src/net/sala.ts', '(nEtapas !== 1 && nEtapas !== 5 && nEtapas !== 10)', 'false'],
 ['pronto-da-revisao-atual', 'src/net/sala.ts', '(revisaoFormatoEsperada ?? 0) !== (estado.revisaoFormato ?? 0)', 'false'],
 ['revisao-monotonica', 'src/net/sala.ts', 'revisaoFormato: (estado.revisaoFormato ?? 0) + 1', 'revisaoFormato: (estado.revisaoFormato ?? 0)'],
 ['reset-prontos', 'src/net/sala.ts', 'jogadores: estado.jogadores.map((j) => ({ ...j, pronto: false }))', 'jogadores: estado.jogadores.map((j) => ({ ...j }))'],
 ['idempotencia-externa', 'src/net/servidor-sala.ts', "if (tipo === 'configurar-formato' && r.estado === estado.sala)", 'if (false)'],
 ['calendario-uma-etapa', 'src/ui/corrida-online.ts', "if (nEtapas === 1) return calendarioSorteado(dataset, seed, 'completa').slice(0, 1);", "if (nEtapas === 1) return calendarioSorteado(dataset, seed, 'completa').slice(0, 2);"],
];
const arquivos=[...new Set(mutantes.map(m=>m[1]))];
if(spawnSync('git',['diff','HEAD','--exit-code','--',...arquivos]).status!==0)throw Error('Commite a implementação antes de mutar');
const rodar=()=>spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','src/net/formato-sala.test.ts','src/ui/formato-online.test.ts','--maxWorkers=1'],{encoding:'utf8',timeout:120000,maxBuffer:2000000});
const controle=rodar();if(controle.status!==0)throw Error(controle.stdout+controle.stderr);
const resultados=[];
for(const [nome,arquivo,de,para] of mutantes){
 const original=readFileSync(arquivo,'utf8');if(original.split(de).length!==2)throw Error('Alvo ausente ou ambíguo:'+nome);
 try{writeFileSync(arquivo,original.replace(de,para));const r=rodar();const falha=(r.stdout+r.stderr).match(/FAIL\s+([^\n]+)/)?.[1]??null;
 if(r.status!==0&&!falha&&!r.error)throw Error('Falha de infraestrutura:'+nome);
 resultados.push({nome,detectada:r.status!==0&&!!falha&&!r.error,timeout:r.error?.code==='ETIMEDOUT',falha});console.log(JSON.stringify(resultados.at(-1)));
 }finally{writeFileSync(arquivo,original);}
}
writeFileSync('docs/online-formatos-mutacoes.json',JSON.stringify({timeoutMs:120000,resultados},null,2)+'\n');
if(resultados.some(r=>!r.detectada))process.exitCode=1;
