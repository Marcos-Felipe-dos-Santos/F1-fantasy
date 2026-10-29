/** Instrumento reproduzível: componentes REAIS, resultado da engine, 22 carros.
 * Build: npx vite build --config scripts/preview-resultados.config.ts
 * Servir: npx vite preview --outDir .wrangler/pr1-preview --host 127.0.0.1 --port 4174 --strictPort
 * Abrir /scripts/preview-resultados.html. Medir 300 frames após 60 de aquecimento
 * em viewport 360x800, nas três velocidades; o perfil NÃO aplica CPU throttling.
 * Copiar o JSON visível para a evidência antes/depois. Sem dependências novas.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { DraftState, LinhaClassificacao } from '../src/engine/types';
import { dataset } from '../src/ui/dataset-app';
import { prepararCorrida, type VelocidadeReplay } from '../src/ui/fluxo-corrida';
import { Podio } from '../src/ui/Podio';
import { TelaCorrida } from '../src/ui/TelaCorrida';
import { TelaResultadoCorrida } from '../src/ui/TelaResultadoCorrida';
import { useCorrida } from '../src/ui/useCorrida';
import '../src/ui/estilos.css';
import './preview-resultados.css';

const nomes = [
  'Marcos — Escuderia da Curva',
  'Oficina dos Amigos',
  'Aceleradores de Domingo',
  'Equipe Última Chicane',
];
const loadouts = Array.from({ length: 22 }, (_, i) => {
  const equipe = dataset.equipeAnos[i * 31];
  return {
    jogadorId: i < 4 ? `humano-${i + 1}` : `bot-${i - 3}`,
    pilotoId: equipe.pilotos[0].id,
    chassiId: equipe.chassi.id,
    motorId: equipe.motor.id,
    estrategistaId: equipe.estrategista.id,
    pitId: equipe.pit.id,
    pecaId: dataset.pecas[i % dataset.pecas.length].id,
  };
});
const state: DraftState = {
  seed: 42,
  fase: 'concluido',
  jogadores: loadouts.map((l, i) => ({
    id: l.jogadorId,
    tipo: i < 4 ? 'humano' : 'bot',
    nome: nomes[i],
    perfilBot: i < 4 ? undefined : 'praGanhar',
  })),
  sorteios: {},
  progresso: {},
  ordemPeca: loadouts.map((l) => l.jogadorId),
  indicePeca: 22,
  pecasReveladas: null,
  copiasRestantes: {},
  loadouts: Object.fromEntries(loadouts.map((l) => [l.jogadorId, l])),
};

function cenarioChuvoso() {
  for (let seed = 0; seed < 100; seed++) {
    const corrida = prepararCorrida(dataset, state, 'pista-interlagos', seed);
    if (corrida.resultado.chuva) return { pistaId: corrida.pista.id, ...corrida };
  }
  throw new Error('Não encontrado cenário chuvoso nas 100 seeds fixas.');
}
const corrida = cenarioChuvoso();
const classificacao: LinhaClassificacao[] = state.jogadores.slice(0, 4).map((j, i) => ({
  jogadorId: j.id,
  pontos: 95 - i * 15,
  vitorias: 3 - i,
  podios: 4 - i,
  voltasRapidas: 1,
  dnfs: 0,
  posicoes: [i + 1],
}));

function ReplayMedido({ velocidade }: { velocidade: VelocidadeReplay }) {
  const replay = useCorrida(state, { modo: 'pronta', corrida }, true);
  const [medicao, setMedicao] = useState<object | null>(null);
  useEffect(() => {
    replay.setVelocidade(velocidade);
  }, [velocidade, replay.setVelocidade]);
  useEffect(() => {
    if (replay.fase !== 'replay' || medicao) return;
    let id = 0;
    let anterior: number | null = null;
    let frames = 0;
    const intervalos: number[] = [];
    const passo = (agora: number) => {
      if (anterior !== null && frames >= 60) intervalos.push(agora - anterior);
      anterior = agora;
      frames++;
      if (intervalos.length < 300) {
        id = requestAnimationFrame(passo);
        return;
      }
      const ordenados = [...intervalos].sort((a, b) => a - b);
      const soma = intervalos.reduce((a, b) => a + b, 0);
      setMedicao({
        velocidade,
        seedCorrida: corrida.resultado.seed,
        pista: corrida.pistaId,
        chuva: corrida.resultado.chuva,
        carros: document.querySelectorAll('.tracado-svg__carro').length,
        viewport: [window.innerWidth, window.innerHeight],
        dpr: window.devicePixelRatio,
        userAgent: navigator.userAgent,
        cpuThrottling: 'não aplicado',
        aquecimentoFrames: 60,
        amostras: 300,
        fps: (1000 * 300) / soma,
        medianaMs: ordenados[149],
        p95Ms: ordenados[284],
        p99Ms: ordenados[296],
        framesAcima33ms: intervalos.filter((t) => t > 33.34).length,
        intervalosMs: intervalos,
      });
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [replay.fase, medicao, velocidade]);
  return (
    <>
      <p role="status">
        {medicao
          ? 'Medição concluída — 300 frames.'
          : 'Medindo replay: 60 frames de aquecimento + 300 amostras.'}
      </p>
      {medicao && (
        <pre className="revisao-pr1__medicao" id="medicao-fps">
          {JSON.stringify(medicao, null, 2)}
        </pre>
      )}
      <TelaCorrida
        state={state}
        {...replay}
        fase="replay"
        onLargar={replay.largar}
        onAcelerar={replay.acelerar}
        onVelocidade={replay.setVelocidade}
      />
    </>
  );
}

function Preview() {
  const [tela, setTela] = useState('resultado');
  const [tema, setTema] = useState('dark');
  const [velocidade, setVelocidade] = useState<VelocidadeReplay>('media');
  const [rodada, setRodada] = useState(0);
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema);
  }, [tema]);
  return (
    <main className="revisao-pr1">
      <nav aria-label="Controles da revisão" className="revisao-pr1__controles">
        <button onClick={() => setTela('resultado')}>Resultados</button>
        <button onClick={() => setTela('podio')}>Pódio</button>
        <button onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}>Tema: {tema}</button>
        <select
          aria-label="Velocidade da medição"
          value={velocidade}
          onChange={(e) => setVelocidade(e.target.value as VelocidadeReplay)}
        >
          <option value="lenta">Lenta</option>
          <option value="media">Média</option>
          <option value="rapida">Rápida</option>
        </select>
        <button
          onClick={() => {
            setRodada(rodada + 1);
            setTela('fps');
          }}
        >
          Medir replay
        </button>
      </nav>
      {tela === 'resultado' && (
        <TelaResultadoCorrida state={state} resultado={corrida.resultado} onReiniciar={() => {}} />
      )}
      {tela === 'podio' && (
        <>
          <h2>Campeonato concluído</h2>
          <Podio state={state} classificacao={classificacao} />
        </>
      )}
      {tela === 'fps' && <ReplayMedido key={`${rodada}:${velocidade}`} velocidade={velocidade} />}
    </main>
  );
}
const raiz = document.getElementById('root');
if (!raiz) throw new Error('Root de revisão ausente.');
createRoot(raiz).render(<Preview />);
