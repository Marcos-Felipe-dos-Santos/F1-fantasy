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
  export function writeFileSync(path: string, data: string, encoding?: 'utf8'): void;
  export function renameSync(oldPath: string, newPath: string): void;
  export function unlinkSync(path: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  /** Adicionado no PR 4.2 (agregar-fatos.ts) pra listar arquivos de cache por temporada. */
  export function readdirSync(path: string): string[];
  /** Adicionado no PR 3.1b (namespaces-seed.test.ts) pra andar na árvore de fontes. */
  export function statSync(path: string): { isDirectory(): boolean };
}

declare module 'node:path' {
  export function dirname(p: string): string;
  export function join(...parts: string[]): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
  export function pathToFileURL(path: string): URL;
}

/**
 * Adicionado no PR 3.3.4 (`checar-porta-sala.ts`): só o necessário pra
 * TENTAR ESCUTAR numa porta e descobrir se ela está livre. Não é um shim de
 * `net` — é o mínimo do mínimo, na linha do resto deste arquivo.
 */
declare module 'node:net' {
  export interface Servidor {
    once(evento: 'error' | 'listening', ouvinte: () => void): Servidor;
    listen(opcoes: { host?: string; port: number; exclusive?: boolean }): Servidor;
    close(aoFechar?: () => void): Servidor;
  }
  export function createServer(): Servidor;
}

declare const process: {
  argv: string[];
  exitCode?: number;
  env: Record<string, string | undefined>;
  /** Adicionado no PR 3.2 (cerca-lint.test.ts) pra rodar o ESLint na pasta do projeto. */
  cwd(): string;
  /** Adicionados no PR 3.3.4 (`checar-porta-sala.ts`) pra falhar ALTO e sair com código ≠ 0. */
  stderr: { write(texto: string): boolean };
  exit(codigo?: number): never;
};

interface ImportMeta {
  url: string;
  /**
   * Variáveis do Vite (PR 3.3). Só o que o projeto usa: `VITE_WS_BASE`, pra
   * apontar o WebSocket pra outro host quando o jogo não estiver em
   * `localhost`. Declarado à mão pelo mesmo motivo do resto deste arquivo — o
   * projeto não instala `@types/node` nem puxa `vite/client`, que traria um
   * monte de global que ninguém usa.
   */
  env?: { VITE_WS_BASE?: string };
}
