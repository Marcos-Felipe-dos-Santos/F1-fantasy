/** Resume a saída de medir-fps-pr3b.mjs sem confundir render React com quadro completo.
 * node scripts/resumir-fps-pr3b.mjs entrada.json saida.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) throw new Error('informe entrada.json e saida.json');
const dados = JSON.parse(readFileSync(entrada, 'utf8'));
const grupos = new Map();
for (const m of dados.medicoes) {
  const chave = `${m.pista}/${m.velocidade}/${m.rotulo}`;
  grupos.set(chave, [...(grupos.get(chave) ?? []), m]);
}
const arred = (x) => Number(x.toFixed(3));
const mediana = (xs) => {
  const x = xs.toSorted((a, b) => a - b);
  return (x[Math.floor((x.length - 1) / 2)] + x[Math.floor(x.length / 2)]) / 2;
};
const gruposResumidos = [...grupos.entries()].map(([grupo, ms]) => ({
  grupo,
  repeticoes: ms.length,
  frames: ms.reduce((n, m) => n + m.frames, 0),
  fpsMediano: arred(mediana(ms.map((m) => m.fps))),
  fpsMinimo: arred(Math.min(...ms.map((m) => m.fps))),
  mainMsPorFrameMediano: arred(mediana(ms.map((m) => m.mainPorFrame))),
  renderP50Mediano: arred(mediana(ms.map((m) => m.renderP50))),
  renderP95PiorRodada: arred(Math.max(...ms.map((m) => m.renderP95))),
  intervaloP95PiorRodada: arred(Math.max(...ms.map((m) => m.intervaloP95))),
  intervaloMaximo: arred(Math.max(...ms.map((m) => m.intervaloMax))),
  acima33ms: ms.reduce((n, m) => n + m.acima33ms, 0),
  audio: ms.map((m) => m.som ?? null),
}));
const resumo = {
  fonte: entrada,
  freioCpu: dados.freioCpu,
  viewport: dados.viewport,
  carros: dados.carros,
  chuva: dados.medicoes.every((m) => m.chuva),
  orcamentosMs: { fps60: 1000 / 60, fps30: 1000 / 30 },
  metodo: 'Medianas entre repetições e pior p95 de cada grupo; mainPorFrame é estimativa por Performance.TaskDuration/fps; render é tempo do render, não quadro completo. Não mede aparelho real nem thread de áudio. Áudio deve estar running, 17 decodificados e tocadas >0.',
  grupos: gruposResumidos,
};
writeFileSync(saida, `${JSON.stringify(resumo, null, 2)}\n`);
console.log(JSON.stringify(gruposResumidos.map((grupo) => Object.fromEntries(Object.entries(grupo).filter(([chave]) => chave !== 'audio'))), null, 2));
