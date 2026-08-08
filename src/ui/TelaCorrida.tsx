/**
 * Tela da corrida do modo Single (PR 1.7b, GDD §10): grid de largada, replay
 * animado no traçado (SVG) e ticker de eventos. Toda a matemática de posição
 * no traçado/progresso vem de `fluxo-corrida.ts` (funções puras) — este
 * componente só resolve nomes pro dataset e desenha.
 */

import type { DraftState, Pista, ResultadoCorrida, ResultadoQuali } from '../engine/types';
import { dataset } from './dataset-app';
import {
  acumularVoltas,
  classificacaoAoVivo,
  fracaoVisual,
  pontoNoTracado,
  voltaAtual,
  type VelocidadeReplay,
} from './fluxo-corrida';
import { nomeJogador } from './loadout-view';
import { narrarEventos } from './narracao';
import {
  CAMADAS_PISTA,
  RAIO_CARRO_BOT,
  RAIO_CARRO_HUMANO,
  VIEWBOX_ALTURA,
  VIEWBOX_LARGURA,
  VIEWBOX_PISTA,
  VIEWBOX_X,
  VIEWBOX_Y,
  pathDaVolta,
  pathsDeZebraDaPista,
  varDeCor,
} from './pista-camadas';
import { tracadoSuavizado } from './suavizacao';

/**
 * Camadas do traçado de `pistaId` (PR 7.3): a pilha `CAMADAS_PISTA`
 * renderizada em ordem de pintura — `alvo: 'volta'` vira um único `<path>` da
 * volta inteira, `alvo: 'curvas'` vira um `<path>` por trecho de
 * `zebrasDaPista`. Extraído como componente PRÓPRIO e exportado pra que
 * `pista-camadas-render.test.ts` trave, contra a tela real, que nenhuma
 * camada some do JSX nem troca de ordem (a pendência que o PR 7.2 deixou
 * aberta era exatamente essa: dado puro sem elo testado com o que a tela
 * desenha).
 */
export function CamadasDaPista({ pistaId }: { pistaId: string }) {
  return (
    <>
      {CAMADAS_PISTA.map((camada) =>
        camada.alvo === 'volta' ? (
          <path
            key={camada.id}
            d={pathDaVolta(pistaId)}
            stroke={varDeCor(camada.cor)}
            strokeWidth={camada.largura}
            strokeDasharray={camada.tracejado}
            strokeDashoffset={camada.deslocamentoTracejado}
            className="tracado-svg__camada"
          />
        ) : (
          pathsDeZebraDaPista(pistaId).map((trecho) => (
            <path
              key={`${camada.id}-${trecho.indice}`}
              d={trecho.d}
              stroke={varDeCor(camada.cor)}
              strokeWidth={camada.largura}
              strokeDasharray={camada.tracejado}
              strokeDashoffset={camada.deslocamentoTracejado}
              className="tracado-svg__camada tracado-svg__camada--curva"
            />
          ))
        ),
      )}
    </>
  );
}

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
        <div className="tabela-grid-wrap">
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
        </div>
        <button type="button" className="botao-primario" onClick={onLargar}>
          Largar
        </button>
      </div>
    );
  }

  const lider = resultado.classificacao[0];
  const historicoLider = resultado.historicoVoltas[lider.jogadorId] ?? [];
  const volta = voltaAtual(historicoLider, tempoSimMs, pista.voltas);

  // Narração completa da corrida (PR A/B), filtrada pela volta já revelada.
  // O enriquecimento causal é calculado sobre a corrida INTEIRA e só depois
  // filtrado — o critério compara fronteiras de volta, não depende de até onde
  // o replay chegou.
  const eventosOcorridos = narrarEventos(resultado).filter(
    (narrada) => narrada.evento.volta <= volta,
  );
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
        <div className="coluna-tracado">
          <svg className="tracado-svg" viewBox={VIEWBOX_PISTA} role="img" aria-label={`Traçado de ${pista.nome}`}>
            <rect
              x={VIEWBOX_X}
              y={VIEWBOX_Y}
              width={VIEWBOX_LARGURA}
              height={VIEWBOX_ALTURA}
              className="tracado-svg__chao"
            />
            <CamadasDaPista pistaId={pista.id} />
            {resultado.classificacao.map((item) => {
              const historico = resultado.historicoVoltas[item.jogadorId] ?? [];
              const fracao = fracaoVisual(historico, tempoSimMs, item.status, pista.voltas);
              // Curva SUAVIZADA, a mesma geometria que `pathDaVolta` desenha
              // (PR 7.4): usar a polilinha de controle aqui deixaria os carros
              // cortando as curvas por fora do asfalto desenhado.
              const ponto = pontoNoTracado(tracadoSuavizado(pista.id), fracao);
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
                  r={ehHumano ? RAIO_CARRO_HUMANO : RAIO_CARRO_BOT}
                  className={classes}
                >
                  <title>{`${nomeDoJogadorId(state, item.jogadorId)} — ${nomePiloto(state, item.jogadorId)}`}</title>
                </circle>
              );
            })}
          </svg>
          <p className="tracado-svg__legenda">{pista.nome}</p>
        </div>

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
                {item.status === 'pit' && <span className="badge-pit">🔧 PIT</span>}
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
          .map(({ evento, frase, caiuAtrasDe, entrouNosBoxes }, idx) => (
            <li key={`${evento.jogadorId}-${evento.tipo}-${evento.volta}-${idx}`}>
              <span className="ticker-eventos__volta">V{evento.volta}</span>
              <span>
                {nomeDoJogadorId(state, evento.jogadorId)} ({nomePiloto(state, evento.jogadorId)}) —{' '}
                {frase}
                {/* Fraseado RELACIONAL, nunca posição absoluta ("caiu para
                    8º"): o painel ao lado ordena por progresso contínuo no
                    instante do replay, e esta comparação é na fronteira da
                    volta — um número aqui brigaria com o número de lá. */}
                {caiuAtrasDe !== null && (
                  <span className="ticker-eventos__consequencia">
                    {' '}
                    e caiu atrás de {nomeDoJogadorId(state, caiuAtrasDe)}
                  </span>
                )}
                {entrouNosBoxes && <span className="ticker-eventos__pit"> · entrou nos boxes</span>}
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
