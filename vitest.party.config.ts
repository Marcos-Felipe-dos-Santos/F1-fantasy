/**
 * Vitest da CASCA (`party/`) — roda dentro do `workerd`, não no Node.
 *
 * Existe porque `party/sala.ts` era a única camada do projeto sem cobertura
 * automatizada (pendência 9), e é justamente a que sorteia, reidrata e vai
 * carregar o cursor no 3.5.2. A mitigação anterior é uma cerca TEXTUAL, que
 * pega a mutação desatenta e não pega quem contorna.
 *
 * 🔒 **CONFIG SEPARADA, E O TESTE MORA EM `party/`.** Sob `src/`, o arquivo
 * entraria no `include` do `npm test` e arrastaria os 63 arquivos da suíte para
 * dentro do `workerd`. Aqui `include` é só `party/**` e o `npm test` continua
 * intocado — medido: 1516/63 antes e depois de adotar o pool.
 *
 * 🔑 **`wrangler: { configPath }` aponta para o `wrangler.jsonc` DE PRODUÇÃO.**
 * É o que dá valor ao teste: o DO sob teste é declarado pela mesma config que o
 * deploy usa (`main`, binding `Sala`, `new_sqlite_classes`, `compatibility_date`).
 * Duplicar a declaração aqui faria o teste certificar uma sala que não existe.
 *
 * ⚠️ **`compatibilityFlags` NÃO está aqui, e é resultado MEDIDO, não descuido.**
 * O plano aprovado previa `nodejs_compat` só nesta config (Ramo 1), pelo receio
 * de o runner do pool exigi-la. Medido em 2026-08-19: o smoke passa SEM a flag.
 * Então a decisão travada do 3.2 fica preservada na SUBSTÂNCIA, não só na letra
 * — teste e produção rodam sob a mesma configuração de compat. Se um dia a flag
 * precisar entrar, ela entra AQUI (nunca no `wrangler.jsonc`) e com o registro
 * de qual import a exigiu.
 */
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  test: {
    include: ['party/**/*.test.ts'],
  },
});
