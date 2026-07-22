/**
 * Shim mínimo de tipos pros módulos nativos do Node usados por
 * `scripts/fetch-f1-data.ts`.
 *
 * O projeto não tem `@types/node` instalado (regra do PR 4.1: nenhuma
 * dependência nova) — `tsc --noEmit` roda hoje só contra as libs "ES2022" e
 * "DOM" do tsconfig.json, que cobrem `fetch`/`Response`/`AbortController`/
 * `console`/`URL`/`setTimeout` mas não os módulos `node:*` nem o global
 * `process`. Este arquivo declara só as assinaturas realmente usadas pelo
 * script — não é um substituto genérico de `@types/node`. Se o projeto
 * adotar `@types/node` no futuro (decisão do dev), este arquivo pode ser
 * removido.
 */

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string): void;
  export function renameSync(oldPath: string, newPath: string): void;
  export function unlinkSync(path: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  /** Adicionado no PR 4.2 (agregar-fatos.ts) pra listar arquivos de cache por temporada. */
  export function readdirSync(path: string): string[];
}

declare module 'node:path' {
  export function dirname(p: string): string;
  export function join(...parts: string[]): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
  export function pathToFileURL(path: string): URL;
}

declare const process: {
  argv: string[];
  exitCode?: number;
  env: Record<string, string | undefined>;
};

interface ImportMeta {
  url: string;
}
