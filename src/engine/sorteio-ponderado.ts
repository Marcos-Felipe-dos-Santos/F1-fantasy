import type { Rng } from './rng';
import type { EquipeAnoRef } from './types';

export function pesoDoSorteio(ref: EquipeAnoRef, top3: boolean): number {
  return (
    1 +
    (ref.ano >= 1985 ? 0.5 : 0) +
    ([1988, 1991, 1994, 2004, 2008, 2012, 2016, 2021, 2023].includes(ref.ano) ? 0.5 : 0) +
    (top3 ? 0.5 : 0)
  );
}

export function sortearPonderado<T>(
  itens: readonly T[],
  quantidade: number,
  peso: (item: T) => number,
  rng: Rng,
): T[] {
  if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > itens.length) {
    throw new RangeError('Quantidade deve ser inteira, não negativa e não exceder os candidatos.');
  }

  const candidatos = itens.map((item) => {
    const valor = peso(item);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new RangeError('Pesos devem ser finitos e positivos.');
    }
    return { item, peso: valor };
  });
  if (!Number.isFinite(candidatos.reduce((soma, candidato) => soma + candidato.peso, 0))) {
    throw new RangeError('O peso total deve ser finito.');
  }
  const sorteados: T[] = [];

  // Recalcular evita carregar erros de subtração entre as extrações.
  for (let rodada = 0; rodada < quantidade; rodada++) {
    const total = candidatos.reduce((soma, candidato) => soma + candidato.peso, 0);
    if (!Number.isFinite(total)) {
      throw new RangeError('O peso total deve ser finito.');
    }
    const alvo = rng.next() * total;
    let acumulado = 0;
    let indice = candidatos.length - 1;
    for (let i = 0; i < candidatos.length; i++) {
      acumulado += candidatos[i].peso;
      if (alvo < acumulado) {
        indice = i;
        break;
      }
    }
    sorteados.push(candidatos.splice(indice, 1)[0].item);
  }

  return sorteados;
}
