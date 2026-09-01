/**
 * BASELINE VERMELHO do PR H1 — S1 (rate limit no `POST /criar-sala`) e S9 (CORS).
 *
 * 🔴 **Este arquivo nasce VERMELHO de propósito e é para ser lido assim.** Hoje
 * `party/sala.ts` não tem limitador nenhum e responde `Access-Control-Allow-Origin: *`
 * (`:400`). As asserções abaixo descrevem o comportamento PRETENDIDO; o que
 * elas medem hoje é a ausência dele.
 *
 * 🔑 **NÃO é vermelho de compilação.** A regra travada da Fase 3 diz que teste
 * vermelho porque o campo ainda não existe não prova nada sobre comportamento.
 * Aqui nada de novo é importado: o teste chama o `fetch` de produção que já
 * existe e compara a RESPOSTA. Ele compila hoje e falha por valor.
 *
 * 🔒 **A PRÉ-CONDIÇÃO É ASSERIDA, NÃO SUPOSTA** — é a lição da SEXTA instância
 * (3.5.2): *"baseline cujo cenário não alcança a guarda não é baseline"*. Um
 * teste que só exigisse `429` em algum lugar ficaria verde se o endpoint
 * estivesse quebrado e devolvesse erro por outro motivo. Por isso cada caso
 * afirma primeiro que as N requisições sob o teto **passaram com 200 e código
 * válido**, e só então cobra o `429` na N+1.
 *
 * ⚠️ **A SONDA do `CF-Connecting-IP` é informativa e está aqui de propósito.**
 * Se o cabeçalho não chegar no pool, um limitador chaveado nele cai num balde
 * só — e um balde só significa que o primeiro jogador tranca os outros 21. É a
 * decisão "falha aberta × falha fechada" que o plano tem de tomar EXPLÍCITA, e
 * ela não se toma sem saber o que o ambiente entrega.
 * ✅ **MEDIDO em 2026-09-01, por sonda temporária revertida:** o cabeçalho
 * CHEGA ao handler com o valor que o teste põe (`{"cf":"198.51.100.42"}`), e o
 * `Origin` também. `X-Forwarded-For` vem `null`.
 *
 * 🔴 **O QUE ESTE ARQUIVO NÃO COBRE, e está dito para não ser lido como se
 * cobrisse: a JANELA.** Toda asserção aqui é "N+1 ⇒ 429"; **nada exige que o
 * balde EXPIRE**. Um limitador de "5 salas por IP, para sempre" — um banimento,
 * não um limite — passaria neste arquivo inteiro, e é o pior desfecho possível
 * num jogo casual (um NAT doméstico, cinco salas, acabou).
 * 🔑 **A janela não entra aqui porque não daria baseline honesto:** ela se prova
 * na FUNÇÃO PURA que recebe `agora` por parâmetro, e essa função ainda não
 * existe — teste que não compila não conta como baseline vermelho (regra
 * travada da Fase 3). **Ela entra em `npm test`, junto da implementação.**
 *
 * 🔒 **`reset()` a cada caso, e NÃO é cerimônia.** O `party/smoke.test.ts` mede
 * que **não há isolamento automático** neste pool: a escrita de um teste
 * sobrevive para o seguinte. Hoje isso é inócuo (não há limitador, tudo dá
 * 200), mas assim que houver, os casos abaixo passariam a depender da ORDEM e
 * de os IPs não colidirem — e ficariam verdes escondendo isso.
 */
import { reset, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

import { ROTA_CRIAR_SALA } from '../src/net/rotas';

/**
 * Teto APROVADO pelo dev em 2026-09-01: **5 salas por IP**, janela de **10 s**.
 *
 * 🔒 **O PAR (teto, janela) foi decidido JUNTO, e a janela é a metade que
 * dispensa `ctx.storage`:** 10 s é menor que o horizonte de despejo do DO, então
 * o despejo zera um balde que já teria expirado — auto-corretivo, zero escrita
 * por request. Alongar a janela sem trocar isso reabre a rajada pós-despejo.
 * ⚠️ **A JANELA NÃO É ASSERIDA NESTE ARQUIVO** — ver o docblock do topo.
 */
const TETO_APROVADO = 5;

/** Uma origem que NÃO é a de produção, para o caso anti-vacuidade do CORS. */
const ORIGEM_ESTRANHA = 'https://exemplo-invasor.test';

function criarSala(ip: string, origem?: string): Promise<Response> {
  const headers: Record<string, string> = { 'CF-Connecting-IP': ip };
  if (origem !== undefined) headers.Origin = origem;
  return SELF.fetch(`https://exemplo.test${ROTA_CRIAR_SALA}`, { method: 'POST', headers });
}

beforeEach(async () => {
  // Ver o docblock: este pool NÃO isola por teste. Sem isto, o balde de um caso
  // vaza para o seguinte assim que o limitador existir.
  await reset();
});

describe('🔴 BASELINE H1 — S1: rate limit por IP no POST /criar-sala', () => {
  it('SONDA (informativa): o `CF-Connecting-IP` chega ao worker no pool?', async () => {
    const r = await criarSala('203.0.113.7');
    // Não assere nada sobre o IP — só prova que a rota responde, para que um
    // vermelho abaixo não possa ser confundido com "o endpoint está quebrado".
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { codigo?: string };
    expect(typeof corpo.codigo).toBe('string');
  });

  it(`🔴 a requisição nº ${TETO_APROVADO + 1} do MESMO IP é recusada com 429`, async () => {
    const ip = '198.51.100.42';
    const codigos: string[] = [];

    // PRÉ-CONDIÇÃO, asserida e não suposta: as N sob o teto passam de verdade.
    for (let i = 0; i < TETO_APROVADO; i += 1) {
      const r = await criarSala(ip);
      expect(r.status, `a requisição ${i + 1} devia passar (está sob o teto)`).toBe(200);
      const corpo = (await r.json()) as { codigo: string };
      codigos.push(corpo.codigo);
    }
    // E passaram criando salas DISTINTAS — senão "passou" não quer dizer nada.
    expect(new Set(codigos).size, 'as salas sob o teto deviam ser distintas').toBe(TETO_APROVADO);

    // Só agora o que o PR existe para introduzir.
    const excedente = await criarSala(ip);
    expect(excedente.status, 'a requisição acima do teto devia ser recusada').toBe(429);
  });

  /**
   * ⚠️ **VERDE HOJE, e verde POR VACUIDADE — não é baseline.** Sem limitador
   * tudo devolve 200, então ele passa sem medir nada. A função dele é OUTRA:
   * **continuar verde depois da implementação.** Se ficar vermelho lá, o
   * limitador caiu num balde global e o primeiro jogador tranca os outros 21.
   */
  it('🟢 (guarda, não baseline) um IP DIFERENTE não herda o teto do vizinho', async () => {
    const vizinho = '198.51.100.99';
    for (let i = 0; i < TETO_APROVADO + 1; i += 1) await criarSala(vizinho);

    // Se o limitador cair num balde global (IP ausente ou ignorado), esta
    // requisição vem 429 e o teste acusa — é o modo de falha que tranca os 22.
    const outro = await criarSala('192.0.2.1');
    expect(outro.status, 'IP distinto não pode herdar o teto de outro').toBe(200);
  });
});

describe('🔴 BASELINE H1 — S9: CORS restrito, não `*`', () => {
  it('🔴 a resposta do POST NÃO carrega `Access-Control-Allow-Origin: *`', async () => {
    const r = await criarSala('203.0.113.8');
    expect(r.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });

  it('🔴 ANTI-VACUIDADE: origem NÃO permitida não recebe liberação de CORS', async () => {
    const r = await criarSala('203.0.113.9', ORIGEM_ESTRANHA);
    // Nem eco da origem estranha, nem curinga: as duas liberariam o invasor.
    const permitido = r.headers.get('Access-Control-Allow-Origin');
    expect(permitido).not.toBe(ORIGEM_ESTRANHA);
    expect(permitido).not.toBe('*');
  });

  it('🔴 o pré-voo OPTIONS também não responde `*`', async () => {
    const r = await SELF.fetch(`https://exemplo.test${ROTA_CRIAR_SALA}`, {
      method: 'OPTIONS',
      headers: { Origin: ORIGEM_ESTRANHA },
    });
    expect(r.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });
});
