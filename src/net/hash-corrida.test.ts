/**
 * `hashDaCorrida` (PR 2/4 de "corrida online") — mesmo molde de
 * `hash-draft.test.ts`? Não existe um arquivo com esse nome; o precedente
 * conceitual é o docblock de `hash-draft.ts` (determinismo + discriminação).
 */

import { describe, expect, it } from 'vitest';
import { hashDaCorrida } from './hash-corrida';

function corrida(overrides: {
  pistaId?: string;
  classificacao?: { jogadorId: string; posicao: number; status: 'terminou' | 'dnf'; tempoTotal: number }[];
  voltaMaisRapidaJogadorId?: string;
  historicoVoltas?: Record<string, number[]>;
}) {
  return {
    pistaId: overrides.pistaId ?? 'pista-monza',
    resultado: {
      classificacao: overrides.classificacao ?? [
        { jogadorId: 'j1', posicao: 1, status: 'terminou' as const, tempoTotal: 5_400_000 },
        { jogadorId: 'j2', posicao: 2, status: 'terminou' as const, tempoTotal: 5_410_000 },
        { jogadorId: 'j3', posicao: 3, status: 'dnf' as const, tempoTotal: 2_000_000 },
      ],
      voltaMaisRapida: { jogadorId: overrides.voltaMaisRapidaJogadorId ?? 'j1' },
      historicoVoltas: overrides.historicoVoltas ?? { j1: [90_000, 91_000], j2: [92_000, 92_000] },
    },
  };
}

describe('hashDaCorrida', () => {
  it('é determinístico: mesma entrada, mesmo hash, em execuções independentes', () => {
    const a = hashDaCorrida(corrida({}));
    const b = hashDaCorrida(corrida({}));
    expect(a).toBe(b);
  });

  it('muda quando o pistaId muda', () => {
    const a = hashDaCorrida(corrida({ pistaId: 'pista-monza' }));
    const b = hashDaCorrida(corrida({ pistaId: 'pista-interlagos' }));
    expect(a).not.toBe(b);
  });

  it('muda quando a classificação muda (troca de duas posições)', () => {
    const base = corrida({});
    const trocada = corrida({
      classificacao: [
        { jogadorId: 'j2', posicao: 1, status: 'terminou', tempoTotal: 5_410_000 },
        { jogadorId: 'j1', posicao: 2, status: 'terminou', tempoTotal: 5_400_000 },
        { jogadorId: 'j3', posicao: 3, status: 'dnf', tempoTotal: 2_000_000 },
      ],
    });
    expect(hashDaCorrida(base)).not.toBe(hashDaCorrida(trocada));
  });

  it('muda quando só o status de um jogador muda (terminou vs. dnf, mesmo tempoTotal)', () => {
    const base = corrida({});
    const comDnf = corrida({
      classificacao: [
        { jogadorId: 'j1', posicao: 1, status: 'terminou', tempoTotal: 5_400_000 },
        { jogadorId: 'j2', posicao: 2, status: 'dnf', tempoTotal: 5_410_000 },
        { jogadorId: 'j3', posicao: 3, status: 'dnf', tempoTotal: 2_000_000 },
      ],
    });
    expect(hashDaCorrida(base)).not.toBe(hashDaCorrida(comDnf));
  });

  it('tem o formato de 16 hex (mesmo formato de hashDoDraft)', () => {
    expect(hashDaCorrida(corrida({}))).toMatch(/^[0-9a-f]{16}$/);
  });
});

/**
 * 🔴 BASELINE VERMELHO do achado da revisão (confirmado pelo dev): a primeira
 * versão do hash cobria só `pistaId` + `classificacao{jogadorId, posicao,
 * status, tempoTotal}`, sob a justificativa — FALSA — de que `pontos` deriva de
 * `posicao`/`status`.
 *
 * **`pontos` NÃO deriva só de `posicao`.** `corrida.ts:468` soma
 * `pontoVoltaMaisRapida` ao autor da volta mais rápida, e o autor é escolhido
 * por `melhorVolta` (`corrida.ts:455-464`) — o MENOR tempo do
 * `historicoVoltas`, não a soma. Dois clientes podiam então exibir **25 vs. 26
 * pontos para o mesmo jogador com hash IDÊNTICO**, e o alarme ficaria calado:
 * furo na própria tese do PR.
 *
 * A fixture discriminante mantém IGUAL tudo o que já era hasheado (mesmo
 * `pistaId`, mesma `classificacao` campo a campo — inclusive `tempoTotal`) e
 * varia só quem cravou a volta mais rápida. As somas batem de propósito:
 * 90+92 = 91+91 = 182. Sem isso o teste passaria de nascença, por `tempoTotal`
 * diferente, e não provaria nada.
 */
describe('🔴 volta mais rápida: o furo que fazia 25 vs. 26 pontos passar com hash igual', () => {
  const MESMA_CLASSIFICACAO = [
    { jogadorId: 'j1', posicao: 1, status: 'terminou' as const, tempoTotal: 182_000 },
    { jogadorId: 'j2', posicao: 2, status: 'terminou' as const, tempoTotal: 182_000 },
  ];

  const clienteA = corrida({
    classificacao: MESMA_CLASSIFICACAO,
    historicoVoltas: { j1: [90_000, 92_000], j2: [91_000, 91_000] },
    voltaMaisRapidaJogadorId: 'j1',
  });
  const clienteB = corrida({
    classificacao: MESMA_CLASSIFICACAO,
    historicoVoltas: { j1: [91_000, 91_000], j2: [90_000, 92_000] },
    voltaMaisRapidaJogadorId: 'j2',
  });

  it('a fixture é honesta: tudo o que já era hasheado é IGUAL nos dois (anti-vacuidade)', () => {
    // Se esta asserção quebrar, o teste abaixo pode estar passando por
    // `tempoTotal` diferente — e não provaria o furo que existe pra provar.
    expect(clienteA.pistaId).toBe(clienteB.pistaId);
    expect(clienteA.resultado.classificacao).toEqual(clienteB.resultado.classificacao);
    const soma = (v: number[]) => v.reduce((a, b) => a + b, 0);
    expect(soma(clienteA.resultado.historicoVoltas.j1)).toBe(soma(clienteB.resultado.historicoVoltas.j1));
    expect(soma(clienteA.resultado.historicoVoltas.j2)).toBe(soma(clienteB.resultado.historicoVoltas.j2));
  });

  it('dois clientes que discordam do AUTOR da volta mais rápida têm hashes DIFERENTES', () => {
    expect(
      hashDaCorrida(clienteA),
      'mesmo pistaId + mesma classificação + autor da volta rápida diferente = 25 vs. 26 pontos na tela, e o detector precisa acusar',
    ).not.toBe(hashDaCorrida(clienteB));
  });

  it('🔒 muda quando SÓ o autor difere — histórico e classificação IDÊNTICOS (atribuição)', () => {
    // 🔴 ACHADO DA REVISÃO, e a lição vale mais que o teste: o par
    // `clienteA`/`clienteB` acima varia o histórico E o autor ao mesmo tempo,
    // então ele fica verde mesmo que `voltaMaisRapida` saia da carga canônica
    // — `historicoVoltas` sozinho o satisfaz. Medido na revisão: apagar a
    // linha `voltaMaisRapida=` de `cargaCanonica` deixava a SUÍTE INTEIRA
    // verde (1453 passando). Baseline vermelho real, mas NÃO-ATRIBUIDOR: dois
    // campos entraram juntos e só um estava travado.
    //
    // Este caso isola o campo. A fixture é DE PROPÓSITO inconsistente com a
    // engine — j1 tem a volta mais rápida no histórico, mas j2 é apontado
    // como autor — e é exatamente esse o ponto: ela modela um cliente cuja
    // LÓGICA DE SELEÇÃO divergiu (`melhorVolta`, ou o desempate por posição
    // em `corrida.ts:455-464`), que é classe de bug diferente de "a simulação
    // divergiu". Tornar a fixture consistente mataria a discriminação e o
    // teste voltaria a passar de nascença.
    expect(
      hashDaCorrida(corrida({})),
      'só `voltaMaisRapida.jogadorId` difere — se este teste passar sem esse campo na carga canônica, o campo não está travado por nada',
    ).not.toBe(hashDaCorrida(corrida({ voltaMaisRapidaJogadorId: 'j2' })));
  });

  it('dois clientes que discordam do HISTÓRICO DE VOLTAS têm hashes diferentes, mesmo com o mesmo autor', () => {
    // O replay volta a volta é o que o jogador VÊ; divergir nele é assistir a
    // corridas diferentes ainda que a chegada coincida.
    const a = corrida({ historicoVoltas: { j1: [90_000, 91_000], j2: [92_000, 92_000] } });
    const b = corrida({ historicoVoltas: { j1: [91_000, 90_000], j2: [92_000, 92_000] } });
    expect(hashDaCorrida(a)).not.toBe(hashDaCorrida(b));
  });

  it('🔒 a ORDEM DAS CHAVES de historicoVoltas NÃO muda o hash (senão o alarme seria falso)', () => {
    // `historicoVoltas` é um `Record`, e a ordem de inserção depende de como a
    // engine montou o objeto. Se a carga canônica dependesse dela, dois
    // clientes CORRETOS alarmariam um ao outro — pior que o bug que este
    // arquivo conserta. Chaves ordenadas, como em `hash-draft.ts`.
    const a = corrida({ historicoVoltas: { j1: [90_000, 91_000], j2: [92_000, 92_000] } });
    const b = corrida({ historicoVoltas: { j2: [92_000, 92_000], j1: [90_000, 91_000] } });
    expect(hashDaCorrida(a)).toBe(hashDaCorrida(b));
  });
});

describe('hashDaCorrida — discriminação e formato', () => {
  it('🔒 anti-vacuidade: não é uma constante — hashes de entradas diferentes são diferentes', () => {
    const hashes = new Set([
      hashDaCorrida(corrida({ pistaId: 'pista-monza' })),
      hashDaCorrida(corrida({ pistaId: 'pista-interlagos' })),
      hashDaCorrida(corrida({ pistaId: 'pista-suzuka' })),
    ]);
    expect(hashes.size).toBe(3);
  });
});
