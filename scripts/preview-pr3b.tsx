/**
 * Preview do PR 3b: o `FluxoCorrida` REAL, do grid ao resultado, tocando com som. É o que o Marcos
 * abre no celular; o arquivo único sai de `scripts/montar-preview-pr3b.mjs`, que embute os `.ogg` e
 * troca SÓ o carregador (o `fetch` de `/sons/*.ogg` lê do arquivo, não da rede).
 *
 * Build: PREVIEW_PR3B_SAIDA=.wrangler/pr3b-preview npx vite build --config scripts/preview-pr3b.config.ts
 * Parâmetros: `pista`, `seed`, `tema=light|dark`, `auto=1` (larga sozinho, para as capturas).
 * No topo: arquivos decodificados POR ESTE APARELHO (o teste do Ogg no iPhone) e o roteiro de escuta:
 * quando cai o pit e o problema técnico do seu carro em cada velocidade.
 */

/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { atribuirPerfis } from '../src/engine/bots';
import { criarDraft, resolverBots } from '../src/engine/draft';
import type { DraftState, Jogador } from '../src/engine/types';
import { BotaoTema } from '../src/ui/BotaoTema';
import { CHAVE_TEMA } from '../src/ui/tema';
import { dataset } from '../src/ui/dataset-app';
import { replayDaCorrida } from '../src/ui/fim-da-corrida';
import { escalaReplay, MS_REPLAY_POR_VOLTA, prepararCorrida, type VelocidadeReplay } from '../src/ui/fluxo-corrida';
import { FluxoCorrida } from '../src/ui/FluxoCorrida';
import { motorDeAudio, type StatusDoAudio } from '../src/ui/sons/audio';
import '../src/ui/estilos.css';

/** A cena achada por `scripts/preview-pr3b-cena.preview.test.ts`: seu carro tem pit e problema técnico, com chuva. */
const PISTA_PADRAO = 'pista-monza';
const SEED_PADRAO = 25;

const q = new URLSearchParams(location.search);
const pistaId = q.get('pista') ?? PISTA_PADRAO;
const seed = Number(q.get('seed') ?? SEED_PADRAO);
const tema = q.get('tema');
// Pela preferência salva, e não só pelo atributo: o `BotaoTema` aplica a preferência ao montar e
// apagaria um `data-tema` posto à mão (a captura "clara" saiu escura assim).
if (tema === 'light' || tema === 'dark') {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    /* sem armazenamento: fica o tema do sistema */
  }
  document.documentElement.setAttribute('data-tema', tema);
}
const VOCE = 'j01';

function montarEstado(): DraftState {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({ id: `j${String(i + 1).padStart(2, '0')}`, tipo: 'bot' as const }));
  const e = resolverBots(criarDraft(dataset, atribuirPerfis(base, 42, 'dificil'), 42), dataset);
  return { ...e, jogadores: e.jogadores.map((j) => (j.id === VOCE ? { ...j, tipo: 'humano', nome: 'Você' } : j)) };
}

const estado = montarEstado();
const { pista, resultado } = prepararCorrida(dataset, estado, pistaId, seed);
const replay = replayDaCorrida(resultado, pista);
const VELS: [VelocidadeReplay, string][] = [
  ['media', 'Média'],
  ['rapida', 'Rápida'],
  ['lenta', 'Lenta'],
];
const relogio = (tSim: number, v: VelocidadeReplay) => {
  const s = tSim / escalaReplay(resultado.classificacao[0].tempoTotal, pista.voltas, MS_REPLAY_POR_VOLTA[v]) / 1000;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const marcos: [string, number][] = [
  ...replay.paradas(VOCE).map((p, i): [string, number] => [`Seu pit ${i + 1}: chega à vaga (pistola; parado, marcha lenta)`, p.chegada]),
  ...replay
    .incidentes(VOCE)
    .map((x): [string, number] => [x.evento.tipo === 'problema-tecnico' ? 'Seu problema técnico (chocalho, 500 ms, 60%)' : 'Seu erro de pilotagem (derrapagem)', x.inicio]),
  ['Bandeirada (torcida)', replay.bandeirada],
];
marcos.sort((a, b) => a[1] - b[1]);

function Painel() {
  const [status, setStatus] = useState<StatusDoAudio | null>(null);
  useEffect(() => {
    const ler = () => setStatus(motorDeAudio()?.status() ?? null);
    ler();
    const id = window.setInterval(ler, 400);
    return () => clearInterval(id);
  }, []);
  const motor = motorDeAudio();
  return (
    <section className="cartao" style={{ marginBottom: 12, fontSize: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>PR 3b — som na corrida</strong>
        <BotaoTema />
      </div>
      {motor === null ? (
        <p>⚠️ Este navegador não tem Web Audio: o jogo roda sem som.</p>
      ) : status === null ? null : (
        <p data-decodificados={status.decodificados}>
          <strong>
            {status.decodificados} de {status.total} arquivos decodificados
          </strong>
          {' · '}
          {status.falhas.length === 0 ? 'nenhuma falha' : `${status.falhas.length} falha(s)`} · {status.taxaHz} Hz · contexto: {status.contexto}
        </p>
      )}
      {status !== null && status.falhas.length > 0 && (
        <ul>
          {status.falhas.map((f) => (
            <li key={f.arquivo}>
              {f.arquivo}: {f.erro}
            </li>
          ))}
        </ul>
      )}
      <p style={{ margin: '6px 0' }}>
        O toque em <b>Largar</b> é o que libera o som. No iPhone, a chave de silencioso cala o Web Audio: se aparecer
        “17 de 17” e não houver som, é a chave, não o Ogg.
      </p>
      <p style={{ margin: '6px 0' }}>
        {pista.nome}, {pista.voltas} voltas, {resultado.chuva ? 'com chuva' : 'seca'}, 22 carros; você é o carro com
        halo. Quando ouvir, contado do “Largar”:
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>momento</th>
            {VELS.map(([v, r]) => (
              <th key={v}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {marcos.map(([rotulo, t]) => (
            <tr key={rotulo}>
              <td>{rotulo}</td>
              {VELS.map(([v]) => (
                <td key={v} style={{ textAlign: 'center' }}>
                  {relogio(t, v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: '6px 0' }}>Trocar de velocidade no meio da corrida não muda os instantes de corrida, só o relógio.</p>
    </section>
  );
}

function Preview() {
  const [rodada, setRodada] = useState(0);
  return (
    <div className="app-shell">
      <Painel />
      <FluxoCorrida
        key={rodada}
        state={estado}
        fonte={{ modo: 'preparar', pistaId, seed }}
        autoLargar={q.get('auto') === '1'}
        rotuloReiniciar="Ouvir de novo"
        onReiniciar={() => setRodada((r) => r + 1)}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
