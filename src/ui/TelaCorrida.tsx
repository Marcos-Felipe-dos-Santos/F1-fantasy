/**
 * Tela da corrida do modo Single (PR 1.7b, GDD §10): grid de largada, replay
 * animado no traçado (SVG) e ticker de eventos. Toda a matemática de posição
 * no traçado/progresso vem de `fluxo-corrida.ts` (funções puras) — este
 * componente só resolve nomes pro dataset e desenha.
 */

import type { DraftState, EventoCorrida, Pista, ResultadoCorrida, ResultadoQuali } from '../engine/types';
import { dataset } from './dataset-app';
import {
  acumularVoltas,
  classificacaoAoVivo,
  fracaoVisual,
  pontoNoTracado,
  TRACADO_GENERICO,
  voltaAtual,
  type VelocidadeReplay,
} from './fluxo-corrida';
import { nomeJogador } from './loadout-view';

interface TelaCorridaProps {
  state: DraftState;
  pista: Pista;
  grid: ResultadoQuali;
  resultado: ResultadoCorrida;
  fase: 'grid' | 'replay';
  tempoSimMs: number;
  onLargar: () => void;
  onAcelerar: () => void;
  /** Velocidade atual do replay (PR 2.6) — irrelevante na fase 'grid'. */
  velocidade: VelocidadeReplay;
  onVelocidade: (velocidade: VelocidadeReplay) => void;
}

/** Botões de velocidade do replay (PR 2.6) — trocável durante a corrida, não só antes. */
const OPCOES_VELOCIDADE: { valor: VelocidadeReplay; rotulo: string; emoji: string }[] = [
  { valor: 'lenta', rotulo: 'Lenta', emoji: '🐢' },
  { valor: 'media', rotulo: 'Média', emoji: '▶️' },
  { valor: 'rapida', rotulo: 'Rápida', emoji: '🐇' },
];

const ROTULOS_EVENTO: Record<EventoCorrida['tipo'], string> = {
  'erro-piloto': 'Erro de pilotagem',
  'quebra-chassi': 'Quebra de chassi — abandonou',
  'quebra-motor': 'Quebra de motor — abandonou',
  'problema-tecnico': 'Problema técnico',
  investigacao: 'Investigação pós-corrida',
};

/** Nome de exibição via `nomeJogador` (PR 2.1a); cai no próprio id se o jogador não for encontrado. */
function nomeDoJogadorId(state: DraftState, jogadorId: string): string {
  const jogador = state.jogadores.find((j) => j.id === jogadorId);
  return jogador ? nomeJogador(jogador) : jogadorId;
}

/** `true` se `jogadorId` é humano — destaque na tela de corrida vale pra todos os humanos (PR 2.1a). */
function ehHumanoId(state: DraftState, jogadorId: string): boolean {
  return state.jogadores.find((j) => j.id === jogadorId)?.tipo === 'humano';
}

function nomePiloto(state: DraftState, jogadorId: string): string {
  const loadout = state.loadouts[jogadorId];
  if (!loadout) return '?';
  return dataset.pilotosById.get(loadout.pilotoId)?.nome ?? '?';
}

function tracadoPath(): string {
  const [primeiro, ...resto] = TRACADO_GENERICO;
  const partes = resto.map((p) => `L ${p.x} ${p.y}`).join(' ');
  return `M ${primeiro.x} ${primeiro.y} ${partes} Z`;
}

export function TelaCorrida({
  state,
  pista,
  grid,
  resultado,
  fase,
  tempoSimMs,
  onLargar,
  onAcelerar,
  velocidade,
  onVelocidade,
}: TelaCorridaProps) {
  if (fase === 'grid') {
    return (
      <div className="tela-corrida">
        <h2>Grid de largada — {pista.nome}</h2>
        <table className="tabela-grid">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jogador</th>
              <th>Piloto</th>
              <th>Tempo</th>
            </tr>
          </thead>
          <tbody>
            {grid.grid.map((item, idx) => {
              const ehHumano = ehHumanoId(state, item.jogadorId);
              return (
                <tr key={item.jogadorId} className={ehHumano ? 'linha-humano' : ''}>
                  <td>{idx + 1}</td>
                  <td>{nomeDoJogadorId(state, item.jogadorId)}</td>
                  <td>{nomePiloto(state, item.jogadorId)}</td>
                  <td>{(item.tempo / 1000).toFixed(3)}s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="button" className="botao-primario" onClick={onLargar}>
          Largar
        </button>
      </div>
    );
  }

  const lider = resultado.classificacao[0];
  const historicoLider = resultado.historicoVoltas[lider.jogadorId] ?? [];
  const volta = voltaAtual(historicoLider, tempoSimMs, pista.voltas);

  const eventosOcorridos = resultado.eventos.filter((evento) => evento.volta <= volta);
  const gridLargada = grid.grid.map((item) => item.jogadorId);
  const classificacaoAtual = classificacaoAoVivo(resultado, gridLargada, tempoSimMs, pista.voltas);

  return (
    <div className="tela-corrida">
      <div className="tela-corrida__cabecalho">
        <h2>
          Volta {volta}/{pista.voltas}
        </h2>
        {resultado.chuva && <span className="badge-chuva">🌧️ Chuva</span>}
      </div>

      <div className="grupo-velocidade" role="group" aria-label="Velocidade do replay">
        {OPCOES_VELOCIDADE.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            className={`botao-velocidade${velocidade === opcao.valor ? ' botao-velocidade--ativo' : ''}`}
            aria-pressed={velocidade === opcao.valor}
            onClick={() => onVelocidade(opcao.valor)}
          >
            {opcao.emoji} {opcao.rotulo}
          </button>
        ))}
      </div>

      <div className="tela-corrida__area-replay">
        <svg className="tracado-svg" viewBox="0 0 1000 600" role="img" aria-label={`Traçado de ${pista.nome}`}>
          <path d={tracadoPath()} className="tracado-svg__pista" />
          {resultado.classificacao.map((item) => {
            const historico = resultado.historicoVoltas[item.jogadorId] ?? [];
            const fracao = fracaoVisual(historico, tempoSimMs, item.status, pista.voltas);
            const ponto = pontoNoTracado(TRACADO_GENERICO, fracao);
            const somaHistorico = acumularVoltas(historico).at(-1) ?? 0;
            const congelado = item.status === 'dnf' && tempoSimMs >= somaHistorico;
            const ehHumano = ehHumanoId(state, item.jogadorId);
            const classes = [
              'tracado-svg__carro',
              ehHumano ? 'tracado-svg__carro--humano' : '',
              congelado ? 'tracado-svg__carro--congelado' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <circle
                key={item.jogadorId}
                cx={ponto.x}
                cy={ponto.y}
                r={ehHumano ? 10 : 6}
                className={classes}
              >
                <title>{`${nomeDoJogadorId(state, item.jogadorId)} — ${nomePiloto(state, item.jogadorId)}`}</title>
              </circle>
            );
          })}
        </svg>

        <ol className="classificacao-ao-vivo" aria-label="Classificação ao vivo">
          {classificacaoAtual.map((item, idx) => {
            const ehHumano = ehHumanoId(state, item.jogadorId);
            const classes = [
              'classificacao-ao-vivo__linha',
              ehHumano ? 'linha-humano' : '',
              item.status === 'dnf' ? 'classificacao-ao-vivo__linha--dnf' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={item.jogadorId} className={classes}>
                <span className="classificacao-ao-vivo__posicao">{idx + 1}</span>
                <span className="classificacao-ao-vivo__nome">{nomeDoJogadorId(state, item.jogadorId)}</span>
                {item.status === 'dnf' && <span className="badge-dnf">DNF</span>}
                {item.status === 'terminou' && <span className="classificacao-ao-vivo__chegou">🏁</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <ul className="ticker-eventos">
        {eventosOcorridos.length === 0 && <li className="ticker-eventos__vazio">Sem incidentes até agora.</li>}
        {eventosOcorridos
          .slice()
          .reverse()
          .map((evento, idx) => (
            <li key={`${evento.jogadorId}-${evento.tipo}-${evento.volta}-${idx}`}>
              <span className="ticker-eventos__volta">V{evento.volta}</span>
              <span>
                {nomeDoJogadorId(state, evento.jogadorId)} ({nomePiloto(state, evento.jogadorId)}) —{' '}
                {ROTULOS_EVENTO[evento.tipo]}
              </span>
            </li>
          ))}
      </ul>

      <button type="button" className="botao-primario" onClick={onAcelerar}>
        Acelerar ⏩
      </button>
    </div>
  );
}
