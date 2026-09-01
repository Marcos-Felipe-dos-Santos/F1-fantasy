/**
 * A CERCA DO CURINGA (PR H1, adição obrigatória nº 1 do dev, 2026-09-01).
 *
 * 🔒 **O que esta cerca existe para impedir, em uma frase:** que *esquecer de
 * configurar o `wrangler` em produção* anule o PR inteiro. Se ausência de
 * `ALLOWED_ORIGINS` bastasse para cair em `*`, a falha de OMISSÃO — a mais
 * provável de todas — reabriria exatamente o buraco que o S9 fecha.
 *
 * 🔑 **Mora em `npm test`, e não em `test:party`, de propósito.** A regra é
 * função pura; provada aqui, ela é exaustiva e roda em milissegundos. O teste
 * de `party/` cobre outra coisa: que a casca REALMENTE consulta esta função.
 */
import { describe, expect, it } from 'vitest';

import { AMBIENTE_DEV, origemPermitida } from './cors';

const ORIGEM = 'https://f1-fantasy.exemplo';
const OUTRA = 'https://invasor.exemplo';

describe('origemPermitida — o curinga exige DOIS sinais', () => {
  it('🔒 A CERCA DITADA: allowlist ausente + Origin qualquer + SEM sinal de dev ⇒ REJEITA', () => {
    // É o caso do deploy que esqueceu de configurar. Nenhuma das origens abaixo
    // pode passar, e nenhuma pode receber `*`.
    for (const origem of [ORIGEM, OUTRA, 'null', '']) {
      expect(origemPermitida(origem, '', false), `origem ${JSON.stringify(origem)}`).toBeNull();
    }
    expect(origemPermitida(null, '', false)).toBeNull();
  });

  it('🔒 ANTI-VACUIDADE da cerca: com o sinal de dev, o MESMO caso libera `*`', () => {
    // Sem este caso, a cerca acima passaria mesmo se `origemPermitida`
    // devolvesse `null` para tudo, sempre — provando nada sobre o segundo sinal.
    expect(origemPermitida(ORIGEM, '', true)).toBe('*');
    expect(origemPermitida(null, '', true)).toBe('*');
  });

  it('o sinal de dev é EXATAMENTE `development` — nada mais serve', () => {
    // A casca compara com esta constante; o teste fixa o valor para que
    // renomeá-la não passe despercebido.
    expect(AMBIENTE_DEV).toBe('development');
  });
});

describe('origemPermitida — allowlist configurada', () => {
  it('ecoa a origem quando ela está na lista', () => {
    expect(origemPermitida(ORIGEM, ORIGEM, false)).toBe(ORIGEM);
  });

  it('recusa origem fora da lista, e NUNCA devolve `*`', () => {
    expect(origemPermitida(OUTRA, ORIGEM, false)).toBeNull();
  });

  it('aceita várias origens, com espaços e entradas vazias', () => {
    const lista = ` ${ORIGEM} , https://tunel.exemplo ,, `;
    expect(origemPermitida('https://tunel.exemplo', lista, false)).toBe('https://tunel.exemplo');
    expect(origemPermitida(ORIGEM, lista, false)).toBe(ORIGEM);
    expect(origemPermitida(OUTRA, lista, false)).toBeNull();
  });

  it('🔒 a allowlist VENCE o sinal de dev — configurar nunca afrouxa', () => {
    // Subir com ENVIRONMENT=development E uma lista real não pode virar `*`:
    // o curinga é o caminho de quem não configurou, não um afrouxamento.
    expect(origemPermitida(OUTRA, ORIGEM, true)).toBeNull();
    expect(origemPermitida(ORIGEM, ORIGEM, true)).toBe(ORIGEM);
  });

  it('🔒 casa por IGUALDADE, não por prefixo — o ataque do sufixo', () => {
    // `startsWith` deixaria `https://meu-site.com.invasor.test` passar. Este é
    // o caso que separa comparação exata de comparação preguiçosa.
    expect(origemPermitida(`${ORIGEM}.invasor.test`, ORIGEM, false)).toBeNull();
    expect(origemPermitida(`${ORIGEM}/`, ORIGEM, false)).toBeNull();
  });

  it('requisição SEM Origin não recebe liberação quando há allowlist', () => {
    expect(origemPermitida(null, ORIGEM, false)).toBeNull();
  });
});
