/**
 * Tela da corrida do modo Single (PR 1.7b, GDD §10): grid de largada, replay
 * animado no traçado (SVG) e ticker de eventos. Toda a matemática de posição
 * no traçado/progresso vem de `fluxo-corrida.ts` (funções puras) — este
 * componente só resolve nomes pro dataset e desenha.
 */

import { Fragment, useMemo } from 'react';
import type { DraftState, Pista, ResultadoCorrida, ResultadoQuali } from '../engine/types';
import { CONTORNO_HUMANO, ESCALA_CARRO, contornoDoBot, niveisDeSpray } from './carro-replay';
import { CarroNaPista, DefsDoCarro, EfeitoDeIncidente, SprayDoCarro } from './CarroReplay';
import { dataset } from './dataset-app';
import { diferencasParaLider, formatarDiferenca } from './diferenca-lider';
import { replayDaCorrida } from './fim-da-corrida';
import {
  classificacaoAoVivo,
  escalaReplay,
  lutDoTracado,
  MS_REPLAY_POR_VOLTA,
  voltaAtual,
  type VelocidadeReplay,
} from './fluxo-corrida';
import { efeitosNoInstante, guinadaNoInstante } from './incidentes-replay';
import { nomeJogador, rotulosDosPilotos } from './loadout-view';
import { narrarEventos, textoDaConsequencia } from './narracao';
import { ControleSom } from './sons/ControleSom';
import { useSomDaCorrida } from './sons/useSomDaCorrida';
import {
  CAMADAS_PISTA,
  VIEWBOX_ALTURA,
  VIEWBOX_LARGURA,
  VIEWBOX_PISTA,
  VIEWBOX_X,
  VIEWBOX_Y,
  pathDaVolta,
  pathsDeZebraDaPista,
  varDeCor,
} from './pista-camadas';
import { LARGURA_REFLEXO, reflexosDaPista } from './molhado';
import { tracadoSuavizado } from './suavizacao';
import { useMovimentoReduzido } from './useMovimentoReduzido';
import { useTelaEstreita } from './useTelaEstreita';
import {
  ESPESSURA_BORDA_BOX,
  LARGURA_GARAGEM,
  LARGURA_PIT_WALL,
  TRACEJADO_GARAGEM,
  desenhoDoBox,
} from './box';
import {
  LARGURA_ESCAPE as LARGURA_ESCAPE_VIADUTO,
  OPACIDADE_SOMBRA,
  OPACIDADE_TABULEIRO,
  pathsDosViadutos,
} from './viaduto';

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
  const box = desenhoDoBox(pistaId);
  return (
    <>
      {CAMADAS_PISTA.map((camada) =>
        camada.alvo === 'volta' ? (
          <Fragment key={camada.id}>
            <path
              d={pathDaVolta(pistaId)}
              stroke={varDeCor(camada.cor)}
              strokeWidth={camada.largura}
              strokeDasharray={camada.tracejado}
              strokeDashoffset={camada.deslocamentoTracejado}
              className="tracado-svg__camada"
            />
            {/* PR 2b: pit lane (superfície, borda só por fora, pit wall, garagens) logo depois do muro (ver `box.ts`). */}
            {camada.id === 'muro' && box !== null && (
              <>
                <path
                  d={box.faixa}
                  stroke={varDeCor('pistaServico')}
                  strokeWidth={box.larguraFaixa}
                  className="tracado-svg__camada tracado-svg__camada--box"
                />
                <path
                  d={box.bordaExterna}
                  stroke={varDeCor('pistaLimite')}
                  strokeWidth={ESPESSURA_BORDA_BOX}
                  className="tracado-svg__camada tracado-svg__camada--box"
                />
                <path
                  d={box.pitWall}
                  stroke={varDeCor('pistaEscape')}
                  strokeWidth={LARGURA_PIT_WALL}
                  className="tracado-svg__camada tracado-svg__camada--box"
                />
                {box.garagens !== null && (
                  <path
                    d={box.garagens}
                    stroke={varDeCor('pistaLimite')}
                    strokeWidth={LARGURA_GARAGEM}
                    strokeDasharray={TRACEJADO_GARAGEM}
                    className="tracado-svg__camada tracado-svg__camada--box"
                  />
                )}
              </>
            )}
            {/* As rampas por cima do limite abrem a passagem; o asfalto, que vem depois, cobre o eixo. */}
            {camada.id === 'limite' &&
              box !== null &&
              box.rampas.map((d) => (
                <path
                  key={d}
                  d={d}
                  stroke={varDeCor('pistaServico')}
                  strokeWidth={box.larguraFaixa}
                  className="tracado-svg__camada tracado-svg__camada--box"
                />
              ))}
          </Fragment>
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

/**
 * Viadutos de `pistaId` (PR 2b, `viaduto.ts`): tabuleiro semitransparente da
 * passagem de cima, recortado pela faixa da passagem de baixo, com o
 * guarda-corpo opaco. Vai DEPOIS dos carros que estão sob a ponte e ANTES dos
 * demais (ver `TelaCorrida`).
 */
export function ViadutosDaPista({ pistaId }: { pistaId: string }) {
  return (
    <>
      {pathsDosViadutos(pistaId).map((v, i) => {
        const id = `viaduto-${pistaId}-${i}`;
        const camada = (nome: 'escape' | 'muro' | 'asfalto', d: string) => {
          const c = CAMADAS_PISTA.find((x) => x.id === nome);
          return c === undefined ? null : (
            <path d={d} stroke={varDeCor(c.cor)} strokeWidth={c.largura} className="tracado-svg__camada tracado-svg__camada--box" />
          );
        };
        return (
          <g key={id}>
            <defs>
              <mask id={id} maskUnits="userSpaceOnUse" x={VIEWBOX_X} y={VIEWBOX_Y} width={VIEWBOX_LARGURA} height={VIEWBOX_ALTURA}>
                <path d={v.mascara} stroke="#fff" strokeWidth={LARGURA_ESCAPE_VIADUTO} className="tracado-svg__camada tracado-svg__camada--box" />
              </mask>
            </defs>
            <g mask={`url(#${id})`}>
              <g opacity={OPACIDADE_SOMBRA}>{camada('escape', v.sombra)}</g>
              <g opacity={OPACIDADE_TABULEIRO}>
                {camada('escape', v.tabuleiro)}
                {camada('muro', v.tabuleiro)}
                {camada('asfalto', v.tabuleiro)}
              </g>
              {v.guardaCorpo.map((d) => (
                <path
                  key={d}
                  d={d}
                  stroke={varDeCor('pistaLimite')}
                  strokeWidth={v.espessuraGuardaCorpo}
                  className="tracado-svg__camada tracado-svg__camada--box"
                />
              ))}
            </g>
          </g>
        );
      })}
    </>
  );
}

/** Asfalto molhado: estático, então fica também com movimento reduzido (ver `molhado.ts`). */
function ReflexosMolhados({ pistaId }: { pistaId: string }) {
  return (
    <>
      {reflexosDaPista(pistaId).map(({ d, tracejado }) => (
        <path key={tracejado} d={d} strokeWidth={LARGURA_REFLEXO} strokeDasharray={tracejado} className="tracado-svg__reflexo" />
      ))}
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
  /**
   * Quem está jogando neste aparelho: é o carro do halo. `undefined` no Single,
   * onde todo humano é o jogador; `null` no online para o espectador.
   */
  jogadorLocalId?: string | null;
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
  jogadorLocalId,
}: TelaCorridaProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const telaEstreita = useTelaEstreita();
  const pilotos = useMemo(() => rotulosDosPilotos(state.loadouts, dataset), [state.loadouts]);

  const replay = replayDaCorrida(resultado, pista);
  const simPorReal = escalaReplay(resultado.classificacao[0].tempoTotal, pista.voltas, MS_REPLAY_POR_VOLTA[velocidade]);
  // Antes do retorno do grid: o som (PR 3b) é hook e usa estas mesmas posições.
  const posicoes =
    fase === 'grid'
      ? []
      : resultado.classificacao.map((item) => {
          const historico = resultado.historicoVoltas[item.jogadorId] ?? [];
          // Curva SUAVIZADA, a mesma geometria que `pathDaVolta` desenha
          // (PR 7.4): usar a polilinha de controle aqui deixaria os carros
          // cortando as curvas por fora do asfalto desenhado. No pit, o caminho do
          // box (PR 2c); depois da linha, a volta lenta (PR 2e).
          const posicao = replay.posicao(item.jogadorId, historico, item.status, tempoSimMs, movimentoReduzido);
          const parado = replay.parado(item.jogadorId, tempoSimMs);
          return {
            ...posicao,
            abandonou: replay.abandonou(item.jogadorId, tempoSimMs),
            parado,
            parou: replay.chegou(item.jogadorId, tempoSimMs) || parado,
          };
        });
  const encerrarSom = useSomDaCorrida({
    resultado,
    pista,
    humanos: state.jogadores.filter((j) => j.tipo === 'humano').map((j) => j.id),
    jogadorLocalId,
    fase,
    tempoSimMs,
    velocidade,
    escala: simPorReal,
    carros: posicoes.map((p, i) => ({
      id: resultado.classificacao[i].jogadorId,
      ponto: p.ponto,
      naPista: p.fracaoNaPista !== null,
      parado: p.parado,
      abandonou: p.abandonou,
    })),
  });

  if (fase === 'grid') {
    return (
      <div className="tela-corrida">
        <h2>Grid de largada — {pista.nome}</h2>
        <ControleSom />
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

  // Narração da corrida inteira, memoizada, filtrada pelo instante do carro (PR 2d).
  const eventosOcorridos = narrarEventos(resultado, replay).filter((narrada) => narrada.instante <= tempoSimMs);
  const gridLargada = grid.grid.map((item) => item.jogadorId);
  /** O piloto (PR 2d); o humano segue com o nome dele, que é como a sala o conhece. */
  const nomeNoPainel = (jogadorId: string) =>
    ehHumanoId(state, jogadorId) ? nomeDoJogadorId(state, jogadorId) : (pilotos.get(jogadorId) ?? jogadorId);
  const depoisDaBandeirada = tempoSimMs >= replay.bandeirada;
  const classificacaoAtual = classificacaoAoVivo(resultado, gridLargada, tempoSimMs, pista.voltas, replay);
  const diferencas = diferencasParaLider(resultado, classificacaoAtual, tempoSimMs, pista.voltas, replay);

  const escalas = telaEstreita ? ESCALA_CARRO.estreita : ESCALA_CARRO.larga;
  const niveisSpray =
    resultado.chuva && !movimentoReduzido
      ? niveisDeSpray(
          posicoes.map((p) => (p.parou ? null : p.fracaoNaPista)),
          lutDoTracado(tracadoSuavizado(pista.id)).comprimentoTotal,
        )
      : null;

  const carrosDoReplay = resultado.classificacao.map((item, indice) => {
    const { ponto, sob, rumo, abandonou } = posicoes[indice];
    const guinada = movimentoReduzido ? 0 : guinadaNoInstante(replay, item.jogadorId, tempoSimMs, simPorReal);
    const ehHumano = ehHumanoId(state, item.jogadorId);
    const ehLocal = jogadorLocalId === undefined ? ehHumano : item.jogadorId === jogadorLocalId;
    const classes = [
      'tracado-svg__carro',
      ehHumano ? 'tracado-svg__carro--humano' : '',
      abandonou ? 'tracado-svg__carro--congelado' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const transform = `translate(${ponto.x.toFixed(2)} ${ponto.y.toFixed(2)}) rotate(${(rumo + guinada).toFixed(1)}) scale(${ehHumano ? escalas.humano : escalas.bot})`;
    const nivelSpray = niveisSpray?.[indice] ?? 0;
    return {
      // PR 2b: carro na passagem de baixo de um viaduto é desenhado ANTES do
      // tabuleiro, pra aparecer através dele e não por cima.
      sob,
      // No fim da lista, para o pelotão não cobrir o carro do jogador.
      prioridade: (ehHumano ? 1 : 0) + (ehLocal ? 1 : 0),
      spray: nivelSpray === 0 ? null : <SprayDoCarro key={item.jogadorId} transform={transform} nivel={nivelSpray} />,
      el: (
        <CarroNaPista
          key={item.jogadorId}
          transform={transform}
          classes={classes}
          contorno={ehHumano ? CONTORNO_HUMANO : contornoDoBot(telaEstreita)}
          halo={ehLocal}
          titulo={ehHumano ? `${nomeDoJogadorId(state, item.jogadorId)} — ${nomePiloto(state, item.jogadorId)}` : nomeNoPainel(item.jogadorId)}
        />
      ),
    };
  });
  carrosDoReplay.sort((a, b) => a.prioridade - b.prioridade);
  // O spray de cada camada vem antes dos carros dela: spray nenhum cobre carro.
  const camadaDeCarros = (sob: boolean) => {
    const carros = carrosDoReplay.filter((c) => c.sob === sob);
    return (
      <>
        {carros.map((c) => c.spray)}
        {carros.map((c) => c.el)}
      </>
    );
  };

  return (
    <div className="tela-corrida">
      <div className="tela-corrida__cabecalho">
        <h2>
          {depoisDaBandeirada ? (
            '🏁 Bandeirada'
          ) : (
            <>
              Volta {volta}/{pista.voltas}
            </>
          )}
        </h2>
        {resultado.chuva && <span className="badge-chuva">🌧️ Chuva</span>}
      </div>

      <ControleSom />

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
          <div className="tracado-chuva">
            <svg
              className={`tracado-svg${resultado.chuva ? ' tracado-svg--molhado' : ''}`}
              viewBox={VIEWBOX_PISTA}
              role="img"
              aria-label={`Traçado de ${pista.nome}`}
            >
              <rect
                x={VIEWBOX_X}
                y={VIEWBOX_Y}
                width={VIEWBOX_LARGURA}
                height={VIEWBOX_ALTURA}
                className="tracado-svg__chao"
              />
              <DefsDoCarro estreita={telaEstreita} />
              <CamadasDaPista pistaId={pista.id} />
              {resultado.chuva && <ReflexosMolhados pistaId={pista.id} />}
              {camadaDeCarros(true)}
              <ViadutosDaPista pistaId={pista.id} />
              {camadaDeCarros(false)}
              {!movimentoReduzido &&
                efeitosNoInstante(replay, resultado, pista.id, tempoSimMs, simPorReal).map(({ chave, ...efeito }) => (
                  <EfeitoDeIncidente key={chave} {...efeito} />
                ))}
            </svg>
            {resultado.chuva && !movimentoReduzido && (
              <div className="chuva-replay" aria-hidden="true">
                <div className="chuva-replay__camada chuva-replay__camada--fundo" />
                <div className="chuva-replay__camada" />
              </div>
            )}
          </div>
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
            const punicaoMs = item.status === 'terminou' ? replay.punicaoMs(item.jogadorId) : 0;
            const punicao = formatarDiferenca({ tipo: 'tempo', ms: punicaoMs });
            return (
              <li key={item.jogadorId} className={classes}>
                <span className="classificacao-ao-vivo__posicao">{idx + 1}</span>
                <span className="classificacao-ao-vivo__nome">{nomeNoPainel(item.jogadorId)}</span>
                {item.status === 'dnf' && <span className="badge-dnf">DNF</span>}
                {item.status === 'pit' && <span className="badge-pit">🔧 PIT</span>}
                {item.status === 'terminou' && <span className="classificacao-ao-vivo__chegou">🏁</span>}
                {punicaoMs > 0 && (
                  <span className="badge-punicao" title={`Punição de ${punicao.slice(1, -1)} segundos`}>
                    {punicao}
                  </span>
                )}
                <span className="classificacao-ao-vivo__diferenca">{formatarDiferenca(diferencas[idx])}</span>
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
          .map((narrada) => {
            const { evento, frase, foiParaOsBoxes } = narrada;
            const consequencia = textoDaConsequencia(narrada);
            return (
              <li key={narrada.chave}>
                <span className="ticker-eventos__volta">V{narrada.volta}</span>
                <span>
                  <span className="ticker-eventos__piloto">{pilotos.get(evento.jogadorId) ?? '?'}</span>
                  {ehHumanoId(state, evento.jogadorId) && ` (${nomeDoJogadorId(state, evento.jogadorId)})`} {frase}
                  {consequencia !== '' && <span className="ticker-eventos__consequencia">{consequencia}</span>}
                  {foiParaOsBoxes && <span className="ticker-eventos__pit"> e foi para os boxes</span>}
                </span>
              </li>
            );
          })}
      </ul>

      <button
        type="button"
        className={depoisDaBandeirada ? 'botao-primario' : 'botao-secundario'}
        onClick={() => {
          encerrarSom();
          onAcelerar();
        }}
      >
        {depoisDaBandeirada ? 'Ir para o resultado →' : 'Pular para o resultado ⏭'}
      </button>
    </div>
  );
}
