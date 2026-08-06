/**
 * Testes do tema claro/escuro (PR 7.8). Cobrem a lógica pura de `tema.ts` — o
 * ciclo, a persistência e, o mais importante, o fato de `'sistema'` REMOVER o
 * atributo em vez de escrever um valor.
 */

import { describe, expect, it } from 'vitest';
import {
  aplicarTema,
  CHAVE_TEMA,
  CICLO_TEMA,
  ehPreferenciaValida,
  lerPreferencia,
  type PreferenciaTema,
  proximaPreferencia,
  rotuloTema,
  salvarPreferencia,
} from './tema';

/** Dublê de `localStorage` sem jsdom — o suficiente pras funções deste módulo. */
function armazenamentoFalso(inicial?: string) {
  const dados = new Map<string, string>();
  if (inicial !== undefined) dados.set(CHAVE_TEMA, inicial);
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    dados,
  };
}

/** Dublê mínimo de elemento com atributos. */
function raizFalsa() {
  const attrs = new Map<string, string>();
  return {
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
    get: (k: string) => attrs.get(k),
    tem: (k: string) => attrs.has(k),
  };
}

describe('ciclo de preferência', () => {
  it('sistema -> dark -> light -> sistema (fecha o ciclo)', () => {
    expect(proximaPreferencia('sistema')).toBe('dark');
    expect(proximaPreferencia('dark')).toBe('light');
    expect(proximaPreferencia('light')).toBe('sistema');
  });

  it('o ciclo passa por todos os estados e volta ao início', () => {
    let atual: PreferenciaTema = 'sistema';
    const vistos: PreferenciaTema[] = [atual];
    for (let i = 0; i < CICLO_TEMA.length - 1; i++) {
      atual = proximaPreferencia(atual);
      vistos.push(atual);
    }
    expect(new Set(vistos).size).toBe(CICLO_TEMA.length);
    expect(proximaPreferencia(atual)).toBe('sistema');
  });

  it('cada estado tem rótulo próprio (o botão nunca mente sobre o modo atual)', () => {
    const rotulos = CICLO_TEMA.map(rotuloTema);
    expect(new Set(rotulos).size).toBe(CICLO_TEMA.length);
  });
});

describe('aplicarTema', () => {
  /**
   * O ponto do módulo inteiro. `'sistema'` tem que REMOVER o atributo: é a
   * ausência dele que reativa o `@media (prefers-color-scheme: light)`, que
   * está escopado com `:root:not([data-tema])`. Se `'sistema'` escrevesse
   * `data-tema="sistema"`, o media query ficaria desligado pra sempre e o app
   * pararia de seguir o SO — sem quebrar nada visível de imediato.
   */
  it("'sistema' REMOVE o atributo (é isso que devolve o controle ao @media)", () => {
    const raiz = raizFalsa();
    aplicarTema('light', raiz as unknown as HTMLElement);
    expect(raiz.get('data-tema')).toBe('light');

    aplicarTema('sistema', raiz as unknown as HTMLElement);
    expect(raiz.tem('data-tema')).toBe(false);
  });

  it("'dark' e 'light' escrevem o atributo correspondente", () => {
    const raiz = raizFalsa();
    aplicarTema('dark', raiz as unknown as HTMLElement);
    expect(raiz.get('data-tema')).toBe('dark');
    aplicarTema('light', raiz as unknown as HTMLElement);
    expect(raiz.get('data-tema')).toBe('light');
  });

  /**
   * `data-tema="dark"` precisa ser escrito de verdade, e não virar "remove o
   * atributo porque o escuro já é o padrão": sem o atributo, um usuário com o
   * SO no claro que ESCOLHEU escuro cairia no `@media` e voltaria pro claro.
   */
  it("escolher 'dark' escreve o atributo em vez de confiar no padrão do :root", () => {
    const raiz = raizFalsa();
    aplicarTema('dark', raiz as unknown as HTMLElement);
    expect(raiz.tem('data-tema')).toBe(true);
  });
});

describe('persistência', () => {
  it('lê a preferência salva', () => {
    expect(lerPreferencia(armazenamentoFalso('light'))).toBe('light');
    expect(lerPreferencia(armazenamentoFalso('dark'))).toBe('dark');
    expect(lerPreferencia(armazenamentoFalso('sistema'))).toBe('sistema');
  });

  it("valor ausente ou corrompido cai em 'sistema'", () => {
    expect(lerPreferencia(armazenamentoFalso())).toBe('sistema');
    expect(lerPreferencia(armazenamentoFalso('roxo'))).toBe('sistema');
    expect(lerPreferencia(armazenamentoFalso(''))).toBe('sistema');
  });

  it('salva e relê (ida e volta)', () => {
    for (const pref of CICLO_TEMA) {
      const arm = armazenamentoFalso();
      salvarPreferencia(pref, arm);
      expect(lerPreferencia(arm)).toBe(pref);
    }
  });

  /**
   * `localStorage` lança em modo privado / com cookies bloqueados. Tema é
   * preferência cosmética: derrubar o app por causa dela seria trocar um
   * detalhe visual por uma tela branca.
   */
  it('armazenamento que lança não derruba o app', () => {
    const quebrado = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(lerPreferencia(quebrado)).toBe('sistema');
    expect(() => salvarPreferencia('dark', quebrado)).not.toThrow();
  });
});

describe('ehPreferenciaValida', () => {
  it('aceita só os três valores conhecidos', () => {
    for (const ok of CICLO_TEMA) expect(ehPreferenciaValida(ok)).toBe(true);
    for (const nao of [null, undefined, '', 'DARK', 'claro', 0, {}]) {
      expect(ehPreferenciaValida(nao)).toBe(false);
    }
  });
});
