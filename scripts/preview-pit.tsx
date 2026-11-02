/**
 * Preview e medição de FPS dos PRs 2c e 2a: `TelaCorrida` REAL, dataset real, 22 carros.
 *
 * Build: npx vite build --config scripts/preview-pit.config.ts
 * Servir: npx vite preview --config scripts/preview-pit.config.ts --host 127.0.0.1 --port 4175 --strictPort
 * Abrir: http://127.0.0.1:4175/scripts/preview-pit.html
 *
 * Parâmetros: `pista`, `seed`, `velocidade`, `chuva=1` (a primeira seed com chuva),
 * `reduzido` não existe: use a emulação do navegador, é o que o hook lê.
 * `fps=1` mede sozinho e grava em `window.__fps` (ver `scripts/medir-fps-pr2c.mjs`).
 * Sem `pit-replay.ts` (build do "antes") a página funciona igual, sem o HUD do box.
 */

/// <reference types="vite/client" />
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { atribuirPerfis } from '../src/engine/bots';
import { criarDraft, resolverBots } from '../src/engine/draft';
import type { DraftState, Jogador, Pista, ResultadoCorrida } from '../src/engine/types';
import { dataset } from '../src/ui/dataset-app';
import {
  acumularVoltas,
  escalaReplay,
  MS_REPLAY_POR_VOLTA,
  prepararCorrida,
  type VelocidadeReplay,
} from '../src/ui/fluxo-corrida';
import { TelaCorrida } from '../src/ui/TelaCorrida';
import '../src/ui/estilos.css';

declare global {
  interface Window {
    __fps?: unknown;
    __irPara?: (t: number) => void;
    __picoDoBox?: () => number | null;
  }
}

interface ParadaLida {
  chegada: number;
  partida: number;
}
interface ModuloPit {
  linhaDoTempoDoPit(
    r: ResultadoCorrida,
    p: Pista,
  ): {
    paradas(id: string): readonly ParadaLida[];
    posicao(id: string, h: number[], s: 'terminou' | 'dnf', t: number, reduzido: boolean): { sob: boolean };
  };
}

const moduloPit = import.meta.glob<ModuloPit>('../src/ui/pit-replay.ts');

const PISTAS_DO_PREVIEW: [string, string][] = [
  ['pista-spa&chuva=1', 'Spa, chuva'],
  ['pista-monza', 'Monza, seca'],
  ['pista-suzuka&chuva=1', 'Suzuka, chuva'],
];

const q = new URLSearchParams(location.search);
const pistaId = q.get('pista') ?? 'pista-spa';
const querChuva = q.get('chuva') === '1';
const estaUrl = `${pistaId}${querChuva ? '&chuva=1' : ''}`;
const medirFps = q.get('fps') === '1';
const AQUECIMENTO = 60;
const FRAMES = 600;

function montarEstado(): DraftState {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const jogadores = atribuirPerfis(base, 42, 'dificil');
  const estado = resolverBots(criarDraft(dataset, jogadores, 42), dataset);
  return {
    ...estado,
    jogadores: estado.jogadores.map((j, i) => (i === 0 ? { ...j, tipo: 'humano', nome: 'Você' } : j)),
  };
}

function montarCorrida(estado: DraftState) {
  const inicial = Number(q.get('seed') ?? 1);
  for (let seed = inicial; seed < inicial + 200; seed++) {
    const corrida = prepararCorrida(dataset, estado, pistaId, seed);
    if (corrida.resultado.chuva === querChuva) return corrida;
  }
  throw new Error('preview-pit: nenhuma seed com esse clima');
}

/** Instantes de fim de volta de pit, em ordem: é onde estão as janelas do box. */
function fimDasVoltasDePit(resultado: ResultadoCorrida): number[] {
  return Object.entries(resultado.voltasDePit)
    .flatMap(([id, voltas]) => {
      const acum = acumularVoltas(resultado.historicoVoltas[id]);
      return voltas.map((v) => acum[v - 1]);
    })
    .sort((a, b) => a - b);
}

const estado = montarEstado();
const { pista, grid, resultado } = montarCorrida(estado);
const pits = fimDasVoltasDePit(resultado);
const fimDaCorrida = resultado.classificacao[0].tempoTotal;

function Preview() {
  const [t, setT] = useState(0);
  const [velocidade, setVelocidade] = useState<VelocidadeReplay>(
    (q.get('velocidade') as VelocidadeReplay | null) ?? 'media',
  );
  const [pausado, setPausado] = useState(false);
  const [paradas, setParadas] = useState<readonly ParadaLida[]>([]);
  const [modulo, setModulo] = useState<ModuloPit | null>(null);
  const tRef = useRef(0);
  const pausadoRef = useRef(false);
  const escala = useMemo(
    () => escalaReplay(fimDaCorrida, pista.voltas, MS_REPLAY_POR_VOLTA[velocidade]),
    [velocidade],
  );
  const escalaRef = useRef(escala);
  escalaRef.current = escala;
  pausadoRef.current = pausado;

  const irPara = (novo: number) => {
    tRef.current = Math.max(0, Math.min(novo, fimDaCorrida - 1));
    setT(tRef.current);
  };

  useEffect(() => {
    const carregar = moduloPit['../src/ui/pit-replay.ts'];
    if (carregar === undefined) return;
    void carregar().then((m) => {
      setModulo(m);
      const linha = m.linhaDoTempoDoPit(resultado, pista);
      setParadas(Object.keys(resultado.voltasDePit).flatMap((id) => [...linha.paradas(id)]));
    });
  }, []);

  useEffect(() => {
    window.__irPara = (novo) => {
      setPausado(true);
      irPara(novo);
    };
    window.__picoDoBox = () => {
      let melhor: number | null = null;
      let maximo = 0;
      for (const { chegada } of paradas) {
        const n = paradas.filter((p) => p.chegada <= chegada && chegada < p.partida).length;
        if (n > maximo) {
          maximo = n;
          melhor = chegada;
        }
      }
      return melhor;
    };
  }, [paradas]);

  useEffect(() => {
    let id = 0;
    let anterior: number | null = null;
    const intervalos: number[] = [];
    const trabalho: number[] = [];
    if (medirFps) tRef.current = Math.max(0, (pits[Math.floor(pits.length / 2)] ?? 0) - 90000);
    const passo = (agora: number) => {
      if (anterior !== null && !pausadoRef.current) {
        const delta = agora - anterior;
        const antes = performance.now();
        tRef.current = (tRef.current + delta * escalaRef.current) % fimDaCorrida;
        flushSync(() => setT(tRef.current));
        if (medirFps) {
          intervalos.push(delta);
          trabalho.push(performance.now() - antes);
          if (intervalos.length === AQUECIMENTO + FRAMES) {
            const iv = intervalos.slice(AQUECIMENTO).sort((a, b) => a - b);
            const tb = trabalho.slice(AQUECIMENTO).sort((a, b) => a - b);
            const pct = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor(xs.length * p))];
            window.__fps = {
              pista: pista.id,
              velocidade,
              chuva: resultado.chuva,
              frames: FRAMES,
              fps: (1000 * iv.length) / iv.reduce((s, x) => s + x, 0),
              intervaloP50: pct(iv, 0.5),
              intervaloP95: pct(iv, 0.95),
              intervaloMax: iv[iv.length - 1],
              acima33ms: iv.filter((x) => x > 33.34).length,
              renderP50: pct(tb, 0.5),
              renderP95: pct(tb, 0.95),
              renderMax: tb[tb.length - 1],
            };
            return;
          }
        }
      }
      anterior = agora;
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, []);

  const proximoPit = () => {
    const alvo = pits.find((fim) => fim - 30000 > tRef.current) ?? pits[0];
    if (alvo !== undefined) irPara(alvo - 30000);
  };
  const proximaPonte = () => {
    if (modulo === null) return;
    const linha = modulo.linhaDoTempoDoPit(resultado, pista);
    for (let t = tRef.current + 3000; t < fimDaCorrida; t += 400) {
      const sob = resultado.classificacao.some(
        (c) => linha.posicao(c.jogadorId, resultado.historicoVoltas[c.jogadorId], c.status, t, false).sob,
      );
      if (sob) {
        setPausado(true);
        irPara(t);
        return;
      }
    }
  };
  const noBoxAgora = paradas.filter((p) => p.chegada <= t && t < p.partida).length;

  return (
    <>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: 8 }}>
        {PISTAS_DO_PREVIEW.map(([id, rotulo]) => (
          <a key={id} href={`?pista=${id}&velocidade=${velocidade}`} aria-current={id === estaUrl}>
            {id === estaUrl ? <strong>{rotulo}</strong> : rotulo}
          </a>
        ))}
        <button type="button" onClick={proximoPit}>
          Próximo pit
        </button>
        {pistaId === 'pista-suzuka' && (
          <button type="button" onClick={proximaPonte}>
            Carro sob a ponte
          </button>
        )}
        <button type="button" onClick={() => setPausado((p) => !p)}>
          {pausado ? 'Continuar' : 'Pausar'}
        </button>
        <span>
          {(t / 1000).toFixed(0)} s simulados · parados no box: {noBoxAgora}
        </span>
      </nav>
      <TelaCorrida
        state={estado}
        pista={pista}
        grid={grid}
        resultado={resultado}
        fase="replay"
        tempoSimMs={t}
        onLargar={() => undefined}
        onAcelerar={() => irPara(fimDaCorrida - 1)}
        velocidade={velocidade}
        onVelocidade={setVelocidade}
      />
    </>
  );
}

const raiz = document.getElementById('root');
if (raiz === null) throw new Error('preview-pit: #root não encontrado');
createRoot(raiz).render(<Preview />);
