/**
 * Despejo das SEEDS do campeonato a partir do storage do Durable Object
 * (pendência 0(p) do PR 3.5.1) — **ferramenta de OPERADOR, roda na máquina do
 * dev, nunca em produção e nunca no fio.**
 *
 * 🔑 **Por que ela precisa existir.** Sob `B-indep` (decisão D1) as 11 seeds são
 * SORTEADAS, logo **não são reconstituíveis** a partir da `seedMestre` —
 * palavras do dev: *"hoje um bug de corrida se reproduz com uma seed; num
 * campeonato `B-indep` preciso das 11."* Sem via de extração, um despejo do DO
 * no meio do campeonato deixaria uma etapa irreproduzível e o determinismo
 * viraria promessa não verificável.
 *
 * 🔴 **POR QUE NÃO DÁ PRA OLHAR O SQLITE DIRETO — medido, não suposto.** O DO é
 * `new_sqlite_classes` (ver `wrangler.jsonc`), e o `ctx.storage.put` grava na
 * tabela `_cf_KV` com o valor **V8-serializado**, não JSON. Verificado nos
 * bytes: o blob começa em `ff 0f` (header do V8) e um `seedMestre` aparece como
 * a tag `N` seguida de 8 bytes IEEE-754. Ou seja: `sqlite3 … "select * from
 * _cf_KV"`, `strings` ou qualquer dump de texto mostram os NOMES dos campos e
 * **não mostram os números**. É por isso que este script desserializa com
 * `node:v8` em vez de imprimir o blob.
 *
 * Sem dependência nova: `node:sqlite` e `node:v8` são do runtime (Node ≥ 22).
 *
 * Uso:
 *
 *     node scripts/despejar-seeds.ts
 *
 * Não precisa do worker no ar — lê o estado em repouso, no disco.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { deserialize } from 'node:v8';

/** Onde o `wrangler dev` guarda o storage local de cada instância do DO. */
const DIR_ESTADO = '.wrangler/state/v3/do/f1-fantasy-sala-Sala';

/** Quantas salas mostrar, da mais recente pra trás. */
const QUANTAS = 5;

interface SalaDespejada {
  salaId?: string;
  versaoSala?: number;
  etapaAtual?: number;
  seedCalendario?: number;
  seedsEtapas?: number[];
  seedMestre?: number;
}

function arquivosPorRecencia(): string[] {
  let nomes: string[];
  try {
    nomes = readdirSync(DIR_ESTADO);
  } catch {
    return [];
  }
  return nomes
    .filter((n) => n.endsWith('.sqlite'))
    .map((n) => join(DIR_ESTADO, n))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

/**
 * Lê a chave `estado` de um arquivo, ou `null`.
 *
 * ⚠️ O `try` não é preguiça: **a maioria dos arquivos não tem a tabela
 * `_cf_KV`**. Um DO que foi resetado (`encerrar()` faz `deleteAll`) deixa o
 * `.sqlite` no disco sem a tabela, e o mais RECENTE costuma ser justamente um
 * desses — foi o que aconteceu ao testar este script.
 */
function lerEstado(arquivo: string): SalaDespejada | null {
  try {
    const db = new DatabaseSync(arquivo, { readOnly: true });
    const linha = db.prepare('select value from _cf_KV where key = ?').get('estado') as
      | { value: Uint8Array }
      | undefined;
    db.close();
    if (linha === undefined) return null;
    const estado = deserialize(linha.value) as { sala?: SalaDespejada };
    return estado.sala ?? null;
  } catch {
    return null;
  }
}

function descrever(sala: SalaDespejada, arquivo: string): string[] {
  const seeds = sala.seedsEtapas;
  const temSeeds = Array.isArray(seeds);
  return [
    '='.repeat(66),
    `sala           : ${sala.salaId ?? '(sem id)'}   [${basename(arquivo).slice(0, 12)}…]`,
    sala.versaoSala === undefined
      ? 'versaoSala     : undefined  ← sala criada ANTES do 3.5.1 (legado, sem seeds)'
      : `versaoSala     : ${sala.versaoSala}`,
    `etapaAtual     : ${sala.etapaAtual ?? '(ausente)'}`,
    `seedCalendario : ${sala.seedCalendario ?? '(ausente)'}`,
    `seedsEtapas    : ${temSeeds ? seeds.join(', ') : '(ausente)'}`,
    `qtd de etapas  : ${temSeeds ? seeds.length : 'N/A'}   (esperado: 10)`,
    temSeeds && seeds.length === 10 && sala.seedCalendario !== undefined
      ? '✅ AS 11 SEEDS ESTÃO NO STORAGE — sobreviveram à persistência.'
      : sala.versaoSala === undefined
        ? 'ℹ️  Sala legado: não ter seeds aqui é o CORRETO, não é falha.'
        : '🔴 SALA PÓS-3.5.1 SEM AS 11 SEEDS — isto é corrupção, não sala nova.',
  ];
}

const arquivos = arquivosPorRecencia();
if (arquivos.length === 0) {
  process.stdout.write(
    `\nNenhum storage local em ${DIR_ESTADO}.\nRode \`npm run sala\` e crie uma sala antes.\n\n`,
  );
  process.exit(0);
}

const linhas: string[] = [];
let achadas = 0;
for (const arquivo of arquivos) {
  const sala = lerEstado(arquivo);
  if (sala === null) continue;
  linhas.push(...descrever(sala, arquivo));
  achadas += 1;
  if (achadas >= QUANTAS) break;
}

if (achadas === 0) {
  linhas.push(
    `Encontrei ${arquivos.length} arquivo(s) de DO, mas nenhum com a chave \`estado\`.`,
    'Salas encerradas apagam o storage (`deleteAll`) e deixam o arquivo vazio.',
    'Crie uma sala nova e rode de novo.',
  );
}

process.stdout.write(`\n${linhas.join('\n')}\n\n`);
