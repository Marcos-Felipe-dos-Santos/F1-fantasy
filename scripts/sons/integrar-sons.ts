/**
 * Leva ao jogo os sons escolhidos (PR 3a): copia de `preview/sons/` (saída de `tratar-sons.ts`)
 * para `public/sons/`, com nome por categoria, e gera `src/ui/sons/catalogo.ts` com duração, laço,
 * pico e MD5 de cada arquivo. A cerca `scripts/sons/catalogo.test.ts` confere os dois lados.
 *
 * Comando: node scripts/sons/tratar-sons.ts && node scripts/sons/integrar-sons.ts &&
 *          npx prettier --write src/ui/sons/catalogo.ts
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESCOLHIDOS } from './escolhas.ts';

const ORIGEM = process.argv[2] ?? 'preview/sons';
const PUBLICO = 'public/sons';
const CATALOGO = 'src/ui/sons/catalogo.ts';

interface ArquivoManifesto {
  arquivo: string;
  velocidade?: string;
  durS: number;
  laco?: { inicioS: number; fimS: number };
  picoEmS?: number;
  camadas: { freesound: number }[];
}
interface SomManifesto {
  id: string;
  arquivos: ArquivoManifesto[];
}

const manifesto = JSON.parse(readFileSync(join(ORIGEM, 'manifesto.json'), 'utf8')) as { sons: SomManifesto[] };
const md5 = (b: Uint8Array) => createHash('md5').update(b).digest('hex');

mkdirSync(PUBLICO, { recursive: true });
// Recomeça do zero: arquivo de uma escolha antiga sobrando em public/ seria servido sem ninguém usar.
for (const f of readdirSync(PUBLICO)) rmSync(join(PUBLICO, f), { recursive: true });

const entradas: string[] = [];
const linha = (id: string, a: ArquivoManifesto, destino: string): string => {
  const bytes = readFileSync(join(ORIGEM, a.arquivo));
  writeFileSync(join(PUBLICO, destino), bytes);
  const campos = [`origem: '${id}'`, `arquivo: 'sons/${destino}'`, `durS: ${a.durS}`, `md5: '${md5(bytes)}'`, `freesound: [${a.camadas.map((c) => c.freesound).join(', ')}]`];
  if (a.laco) campos.push(`laco: { inicioS: ${a.laco.inicioS}, fimS: ${a.laco.fimS} }`);
  if (a.picoEmS !== undefined) campos.push(`picoEmS: ${a.picoEmS}`);
  return `{ ${campos.join(', ')} }`;
};
for (const [categoria, id] of Object.entries(ESCOLHIDOS)) {
  const som = manifesto.sons.find((s) => s.id === id);
  if (!som) throw new Error(`escolhido sem som tratado no manifesto: ${id}`);
  if (som.arquivos.length === 1) {
    entradas.push(`  ${categoria}: ${linha(id, som.arquivos[0], `${categoria}.ogg`)},`);
  } else {
    const porVel = som.arquivos.map((a) => `    ${a.velocidade}: ${linha(id, a, `${categoria}-${a.velocidade}.ogg`)},`);
    entradas.push(`  ${categoria}: {\n${porVel.join('\n')}\n  },`);
  }
}

const fonte = `/**
 * GERADO por \`scripts/sons/integrar-sons.ts\`: não editar à mão. Os sons escolhidos pelo Marcos
 * (2026-11-06), em \`public/sons/\`; origem e licença (CC0) em \`THIRD_PARTY_NOTICES.md\`.
 * \`laco\`: trecho que repete sem emenda (depois dele há uma guarda de 50 ms, para o decodificador
 * aparar sem cortar a emenda). \`picoEmS\`: onde está o pico de volume, que deve cair no evento.
 */

import type { VelocidadeReplay } from '../fluxo-corrida';

export interface SomDoCatalogo {
  /** Variação de \`scripts/sons/escolhas.ts\` de onde o arquivo saiu: a cerca confere com a escolha. */
  origem: string;
  arquivo: string;
  durS: number;
  md5: string;
  freesound: readonly number[];
  laco?: { inicioS: number; fimS: number };
  picoEmS?: number;
}

type PorVelocidade = Record<VelocidadeReplay, SomDoCatalogo>;

export const CATALOGO_SONS: {
  motor: SomDoCatalogo;
  lenta: SomDoCatalogo;
  pelotao: SomDoCatalogo;
  chuva: SomDoCatalogo;
  passagem: PorVelocidade;
  spray: PorVelocidade;
  largada: PorVelocidade;
  pistola: SomDoCatalogo;
  derrapagem: SomDoCatalogo;
  abandono: SomDoCatalogo;
  torcida: SomDoCatalogo;
} = {
${entradas.join('\n')}
};
`;
mkdirSync('src/ui/sons', { recursive: true });
writeFileSync(CATALOGO, fonte);
console.log(`${readdirSync(PUBLICO).length} arquivos em ${PUBLICO}; ${CATALOGO} gerado`);
