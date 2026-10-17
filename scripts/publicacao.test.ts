/** Cerca de publicação: dado servido idêntico ao derivado real. Diagnóstico limitado. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  serializarDerivado,
  verificarColisaoDeIds,
  type EquipeAnoDerivado,
} from './derivar-notas.ts';
import { EQUIPE_ANOS_DERIVADO, PUBLICADO_EQUIPE_ANOS } from './caminhos-dataset.ts';
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
const esperado = serializarDerivado(derivado);
describe('publicação dos nomes originais', () => {
  it('a comparação detecta alteração e limita o diagnóstico', () => {
    const diagnostico = primeiraDivergencia('a'.repeat(10000), 'b'.repeat(10000));
    expect(diagnostico).toContain('divergem no índice 0');
    expect(diagnostico.length).toBeLessThan(400);
    expect(primeiraDivergencia('a\r\n', 'a\n')).toBe('');
  });
  it('tem 771 registros e os nomes históricos conhecidos', () => {
    expect(derivado).toHaveLength(771);
    expect(
      derivado.find((r) => r.equipe === 'McLaren' && r.ano === 1988)?.pilotos.map((p) => p.nome),
    ).toContain('Ayrton Senna');
  });
  it('não contém colisão de ids', () =>
    expect(() => verificarColisaoDeIds(derivado)).not.toThrow());
  it('publicado é exatamente o derivado real', () => {
    expect(primeiraDivergencia(readFileSync(PUBLICADO_EQUIPE_ANOS, 'utf8'), esperado)).toBe('');
  });
});
