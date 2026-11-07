import type { Dataset } from './dataset';
import type {
  ControleRerolls,
  DraftState,
  EquipeAnoRef,
  PedidoReroll,
  RetornoReroll,
  TipoReroll,
} from './types';
import { createRng, deriveSeed } from './rng';
import { ehTop3Oficial } from './draft-top3';
import { pesoDoSorteio, sortearPonderado } from './sorteio-ponderado';

export function controleRerolls(state: DraftState, jogadorId: string): ControleRerolls {
  const controle = state.rerolls?.[jogadorId];
  if (controle) return controle;
  if (state.fase === 'concluido') {
    return { comunsUsados: 3, especialUsado: true, revisao: 0, descartados: [] };
  }
  throw new Error(`controleRerolls: draft ativo sem controle de rerolls para "${jogadorId}"`);
}

function permitido(state: DraftState, jogadorId: string): boolean {
  const rodada = state.progresso[jogadorId]?.rodada;
  return (
    state.fase === 'sorteios' &&
    state.jogadores.some((j) => j.id === jogadorId && j.tipo === 'humano') &&
    Number.isInteger(rodada) &&
    rodada >= 1 &&
    rodada <= 5
  );
}

export function candidatosDoReroll(
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
  alvo: TipoReroll,
): EquipeAnoRef[] {
  if (!permitido(state, jogadorId)) return [];
  const controle = controleRerolls(state, jogadorId);
  const sorteios = state.sorteios[jogadorId];
  const atual = sorteios[state.progresso[jogadorId].rodada - 1];
  return dataset.equipeAnos
    .filter((ref) => {
      const mesmaMarca = ref.equipe === atual.equipe;
      const mesmoAno = ref.ano === atual.ano;
      const dimensao =
        alvo === 'marca'
          ? !mesmaMarca && mesmoAno
          : alvo === 'ano'
            ? mesmaMarca && !mesmoAno
            : alvo === 'ambos' && !mesmaMarca && !mesmoAno;
      return (
        dimensao &&
        ![...sorteios, ...controle.descartados].some(
          (outro) => outro.equipe === ref.equipe && outro.ano === ref.ano,
        )
      );
    })
    .map(({ equipe, ano }) => ({ equipe, ano }));
}

export function aplicarReroll(
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
  pedido: PedidoReroll,
): RetornoReroll {
  if (
    !permitido(state, jogadorId) ||
    pedido.tipo !== 'reroll' ||
    !['marca', 'ano', 'ambos'].includes(pedido.alvo)
  ) {
    return { state, resultado: 'nao-permitido' };
  }
  const controle = controleRerolls(state, jogadorId);
  const rodada = state.progresso[jogadorId].rodada;
  if (pedido.turnoEsperado !== rodada) return { state, resultado: 'turno-divergente' };
  if (pedido.revisaoEsperada !== controle.revisao)
    return { state, resultado: 'revisao-divergente' };

  const novoControle = { ...controle, revisao: controle.revisao + 1 };
  const novoState = { ...state, rerolls: { ...state.rerolls, [jogadorId]: novoControle } };
  const especial = pedido.alvo === 'ambos';
  if (especial ? controle.especialUsado : controle.comunsUsados >= 3) {
    return { state: novoState, resultado: 'cota-esgotada' };
  }
  const candidatos = candidatosDoReroll(state, dataset, jogadorId, pedido.alvo);
  if (candidatos.length === 0) return { state: novoState, resultado: 'pool-vazio' };
  const rng = createRng(
    deriveSeed(
      state.seed,
      `draft:reroll:${jogadorId}:${rodada}:${controle.revisao}:${pedido.alvo}`,
    ),
  );
  const [sorteado] = sortearPonderado(
    candidatos,
    1,
    (ref) => pesoDoSorteio(ref, ehTop3Oficial(ref)),
    rng,
  );
  const sorteios = state.sorteios[jogadorId].slice();
  novoControle.descartados = [...controle.descartados, sorteios[rodada - 1]];
  sorteios[rodada - 1] = sorteado;
  if (especial) novoControle.especialUsado = true;
  else novoControle.comunsUsados++;
  return {
    state: { ...novoState, sorteios: { ...state.sorteios, [jogadorId]: sorteios } },
    resultado: 'aplicado',
  };
}
