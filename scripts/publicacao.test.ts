/**
 * CERCA DE PUBLICAÇÃO — PR 6 da trilha do dataset fictício.
 *
 * Trava a única propriedade que o PR 6 precisa manter para sempre:
 *
 *     src/data/equipe-anos.json  ===  anonimizar(derivado, tabela)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 POR QUE ESTA CERCA EXISTE — palavras do dev, 2026-08-28.
 *
 * *"A cópia manual sem guarda existe há meses e ninguém sabia até o PR 5 medir.
 * Trocar um passo manual sem guarda por um script sem guarda não seria ganho —
 * seria a mesma dívida com nome novo."*
 *
 * O estado que este PR encerra está medido no `ESTADO.md`: `src/data/equipe-anos.json`
 * era **cópia byte a byte** de `scripts/derived/equipe-anos.derivado.json` (mesmo
 * `git hash-object`), **nenhum script fazia a cópia**, e **nada falhava se os dois
 * divergissem** — a identidade era resultado de alguém ter copiado certo, não de
 * um portão. Publicar por script mata o passo manual; **é esta cerca que mata a
 * ausência de guarda.** As duas coisas são diferentes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 A COMPARAÇÃO NÃO USA `toBe` SOBRE O CONTEÚDO, E É REGRA DO PROJETO.
 *
 * `src/data/equipe-anos.json` tem ~1 MB. Um `expect(publicado).toBe(esperado)`
 * que falhasse mandaria o vitest imprimir um diff de 1 MB — que é exatamente a
 * leitura integral que o `CLAUDE.md` §"Leitura de `src/data/`" proíbe, entrando
 * pela porta da mensagem de erro. `primeiraDivergencia` devolve **string vazia
 * quando são iguais** e, quando não são, um diagnóstico de tamanho fixo: o
 * índice, os dois tamanhos e uma janela de 60 caracteres de cada lado.
 * 🔑 **Portão que só é seguro enquanto passa não é seguro** — o custo de uma
 * cerca se paga no dia em que ela fica vermelha.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 A COMPARAÇÃO NORMALIZA CRLF → LF, E ISSO NÃO É FROUXIDÃO: SEM ISSO A CERCA
 * PASSARIA POR SORTE.
 *
 * **Medido no PR 6, ao ver este baseline vermelho pela primeira vez:** o repo
 * roda `core.autocrlf=true` e **não tem `.gitattributes`**, então
 *
 * - arquivo que o **git faz checkout** chega ao working tree em **CRLF** —
 *   `src/data/equipe-anos.json` tinha 52.430 CRLF antes deste PR;
 * - arquivo que um **script escreve** sai em **LF** — é o caso de
 *   `serializarDerivado`, que termina em `\n`.
 *
 * Comparando bytes crus, esta cerca ficaria **VERDE logo depois de rodar
 * `npm run dataset:anonimizar`** (arquivo recém-escrito, LF dos dois lados) e
 * **VERMELHA depois de qualquer `git clone` ou checkout limpo** (arquivo em
 * CRLF, esperado em LF) — **com o dado idêntico nos dois casos**. Seria um
 * vermelho que não é regressão, na cerca que existe para detectar regressão.
 *
 * 🔑 **Final de linha é artefato de CHECKOUT, não conteúdo de dataset.** O que
 * esta cerca afirma é sobre o dado; normalizar é o que a faz afirmar isso e não
 * o modo de checkout de quem a rodou.
 * ⚠️ **A alternativa — pinar `*.json` como LF num `.gitattributes`** — resolveria
 * a classe inteira, mas reescreveria final de linha do repo todo no próximo
 * checkout. **É PR próprio e decisão do dev**, não conserto de passagem daqui.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 ANTI-VACUIDADE, e ela tem DUAS metades load-bearing.
 *
 * - **(1) O esperado não é vazio nem degenerado.** ⚠️ **Das duas asserções, quem
 *   carrega o peso é `derivado.length === 771`.** A outra (o esperado ter o
 *   mesmo comprimento) é quase tautológica: `anonimizar` é um `.map`, então o
 *   comprimento bate **por construção**. Dito assim porque a redação anterior
 *   sugeria que a segunda sozinha pegava um `anonimizar` que devolvesse `[]` —
 *   **e ela não pega; quem pega é a primeira.** Achado da revisão do PR 6.
 * - **(2) O esperado DIFERE do derivado.** É o que impede a cerca de passar num
 *   mundo em que `anonimizar` virou cópia — o mesmo defeito que o `hashDoDraft`
 *   do teste diferencial do PR 5 existe para pegar, aqui do lado do artefato.
 *   **Sem esta metade, publicar o derivado cru passaria** desde que o script
 *   fosse consistente consigo mesmo.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anonimizar, type TabelaDeNomes } from './anonimizar.ts';
import {
  serializarDerivado,
  verificarColisaoDeIds,
  type EquipeAnoDerivado,
} from './derivar-notas.ts';
import { EQUIPE_ANOS_DERIVADO, PUBLICADO_EQUIPE_ANOS, TABELA_NOMES } from './caminhos-dataset.ts';

/** CRLF → LF. Ver o docblock: final de linha é artefato de checkout, não dado. */
function comLf(texto: string): string {
  return texto.replace(/\r\n/g, '\n');
}

/**
 * `''` se as strings são iguais (após normalizar o final de linha do lado
 * PUBLICADO); senão um diagnóstico de TAMANHO FIXO. Ver o docblock do topo:
 * nunca devolver o conteúdo inteiro.
 */
function primeiraDivergencia(bruto: string, esperado: string): string {
  const publicado = comLf(bruto);
  if (publicado === esperado) return '';
  const n = Math.min(publicado.length, esperado.length);
  let i = 0;
  while (i < n && publicado[i] === esperado[i]) i += 1;
  const janela = 60;
  const recorte = (s: string) => JSON.stringify(s.slice(Math.max(0, i - janela), i + janela));
  return [
    `divergem no índice ${i}`,
    `  publicado: ${publicado.length} B — ${recorte(publicado)}`,
    `  esperado:  ${esperado.length} B — ${recorte(esperado)}`,
  ].join('\n');
}

const derivado = JSON.parse(readFileSync(EQUIPE_ANOS_DERIVADO, 'utf8')) as EquipeAnoDerivado[];
const tabela = JSON.parse(readFileSync(TABELA_NOMES, 'utf8')) as TabelaDeNomes;
const esperado = serializarDerivado(anonimizar(derivado, tabela));

describe('🔒 cerca de publicação — `src/data/` é a saída do `anonimizar`, não uma cópia', () => {
  it('ANTI-VACUIDADE 1: o esperado tem os 771 registros do derivado, não um array vazio', () => {
    expect(derivado.length).toBe(771);
    expect(JSON.parse(esperado)).toHaveLength(derivado.length);
  });

  it('ANTI-VACUIDADE 2: o esperado DIFERE do derivado — `anonimizar` não é cópia', () => {
    expect(esperado).not.toBe(serializarDerivado(derivado));
  });

  /**
   * 🔴 A GUARDA DE COLISÃO ENTRA AQUI, e é conserto de achado da revisão do PR 6.
   *
   * `anonimizar.ts` afirma no docblock que `verificarColisaoDeIds` é
   * "re-executada sobre a própria saída" — verdade, mas **só em `main()`**, e
   * `main()` nunca roda no `npm test` (o `ehExecucaoDireta` a barra, e esta
   * cerca chama `anonimizar()` direto). **O docblock afirmava mais do que o
   * código sustentava**, que é a classe de defeito que este projeto já pagou
   * seis vezes. Rodando-a aqui, ela passa a valer em todo `npm test`.
   */
  it('a guarda de COLISÃO DE IDS roda sobre a saída — e não só no `main()`', () => {
    expect(() => verificarColisaoDeIds(anonimizar(derivado, tabela))).not.toThrow();
  });

  it('src/data/equipe-anos.json é EXATAMENTE `anonimizar(derivado, tabela)`', () => {
    const publicado = readFileSync(PUBLICADO_EQUIPE_ANOS, 'utf8');
    expect(primeiraDivergencia(publicado, esperado)).toBe('');
  });
});
