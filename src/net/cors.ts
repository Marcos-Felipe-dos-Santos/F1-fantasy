/**
 * Quem pode chamar o `POST /criar-sala` de outra origem (PR H1, item S9).
 *
 * 🔴 **O QUE ESTE MÓDULO NÃO FAZ, e precisa estar dito aqui em cima porque a
 * leitura oposta é a natural: CORS NÃO É DEFESA CONTRA SCRIPT.** O cabeçalho
 * `Access-Control-Allow-Origin` é imposto pelo NAVEGADOR, sobre a resposta.
 * `curl`, um script em Node ou qualquer cliente não-navegador **ignoram-no por
 * inteiro** — a requisição chega e a sala é criada do mesmo jeito.
 * 🔑 **Portanto isto não reduz flood.** Quem endereça flood é o teto por IP
 * (`rate-limit.ts`); o que este módulo impede é uma PÁGINA hospedada noutra
 * origem ler a resposta no navegador de quem a visita. **São ameaças
 * diferentes, e escrever "CORS restrito" como se cobrisse a primeira seria
 * afirmação falsa em presente do indicativo** — a classe que as revisões dos
 * PRs 6 e 7 pegaram duas vezes cada.
 *
 * 🔒 **O CURINGA EXIGE DOIS SINAIS — decisão do dev, 2026-09-01, e é o coração
 * do módulo.** Antes desta regra, "sem allowlist" bastaria para cair no `*`, e
 * então **esquecer de configurar o `wrangler` em produção anularia o PR
 * inteiro, em silêncio** — a falha mais provável de todas, porque é a de
 * omissão. Agora o `*` só sai com allowlist ausente **E** sinal explícito de
 * desenvolvimento. Sem o sinal, ausência de allowlist REJEITA.
 */

/** O valor de `ENVIRONMENT` que habilita o curinga. Nada mais serve. */
export const AMBIENTE_DEV = 'development';

/**
 * A origem a devolver em `Access-Control-Allow-Origin`, ou `null` para não
 * emitir cabeçalho de CORS nenhum (que é como se recusa — não existe "negar"
 * explícito neste protocolo; o navegador bloqueia na ausência).
 *
 * @param origem       o `Origin` da requisição, ou `null` se não veio.
 * @param allowlist    `ALLOWED_ORIGINS` cru, origens separadas por vírgula.
 * @param ehDesenvolvimento  o SEGUNDO sinal. Ver o docblock do módulo.
 *
 * 🔒 **A allowlist configurada VENCE o sinal de dev.** Se alguém subir com
 * `ENVIRONMENT=development` e uma allowlist real, a lista é que vale — o
 * curinga é o caminho de quem não configurou nada, nunca um afrouxamento de
 * quem configurou.
 *
 * 🔑 **Eco da origem, nunca a lista inteira.** `Access-Control-Allow-Origin`
 * aceita UMA origem ou `*`; devolver a lista não é sintaxe válida e o navegador
 * rejeitaria tudo. Por isso a origem é comparada e ECOADA — e é por isso que a
 * casca precisa emitir `Vary: Origin` junto.
 */
export function origemPermitida(
  origem: string | null,
  allowlist: string,
  ehDesenvolvimento: boolean,
): string | null {
  const permitidas = allowlist
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '');

  if (permitidas.length > 0) {
    // Comparação exata de string: `Origin` é sempre esquema+host+porta, sem
    // barra final. Nada de `startsWith`, que deixaria `https://meu-site.com`
    // liberar `https://meu-site.com.invasor.test`.
    return origem !== null && permitidas.includes(origem) ? origem : null;
  }

  // Allowlist ausente. O curinga depende do SEGUNDO sinal — ver o módulo.
  return ehDesenvolvimento ? '*' : null;
}
