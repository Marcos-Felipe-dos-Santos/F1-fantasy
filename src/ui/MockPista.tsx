/**
 * MAQUETE DESCARTÁVEL de direção de arte (PR 7.1, Fase 7).
 *
 * ⚠️ ISTO NÃO É CÓDIGO DE PRODUÇÃO E NÃO DEVE SER REAPROVEITADO. Tudo aqui é
 * hardcoded de propósito: coordenadas, cores e posições de carro. O objetivo
 * único é materializar a direção de arte "arcade adulto" numa pista pro dev
 * aprovar ou reprovar ANTES de investir nos PRs 7.2/7.3/7.7/7.8. Se a direção
 * não fechar, joga-se este arquivo fora e perdeu-se 1 PR em vez de 6.
 *
 * O PR 7.3 reescreve isto como DADO PURO testável (`pista-camadas.ts`), com as
 * camadas derivadas do traçado real de `tracados.ts` em vez de um `d` colado.
 *
 * Acesso: `npm run dev` e abrir `?mock=pista`. Fora da navegação de propósito —
 * nenhuma tela do jogo linka pra cá.
 *
 * Direção de arte (PLANO_CLAUDE_CODE.md §5, corrigido no PR 7.0): estrutura de
 * simulador + tokens do design system do 5.1. Nenhuma cor fora do sistema,
 * exceto `ASFALTO`, que é o token novo proposto pro PR 7.2.
 */

/** Traçado de Monza (`TRACADO_GENERICO`, `fluxo-corrida.ts`) como `d` de SVG — colado de propósito: ver aviso no topo. */
const D_MONZA =
  'M150,500 L650,500 L700,480 L670,445 L720,415 L800,400 L855,320 L815,270 ' +
  'L870,210 L820,150 L650,110 L320,100 L260,130 L160,210 L70,360 L100,470 Z';

/** Via de pit: entra antes da linha de largada, corre paralela à reta, sai depois. */
const D_PIT = 'M118,492 Q126,566 182,566 L606,566 Q664,566 676,500';

const ASFALTO = '#3E3A5C'; // token proposto pro 7.2 (`pistaAsfalto`)
const ESCAPE = '#0E0C20'; // = fundoAfundado
/**
 * Muro ESCURECIDO na revisão 2 (era `borda #3A3468`). Não veio de referência:
 * medindo, `#3A3468` tem luminância 0.0435 contra 0.0482 do asfalto — 10% de
 * diferença. O aro do muro competia com a própria pista pela atenção. Em
 * `#2F2A55` (0.0292) o asfalto volta a ser, com folga, a superfície mais clara.
 */
const MURO = '#2F2A55';
/** Terreno do autódromo (revisão 2): a faixa larga que faz a pista deixar de flutuar no vazio. */
const TERRENO = '#1B1738';
/** Áreas de escape nas curvas e plataforma do paddock (revisão 2). */
const SERVICO = '#221E42';
const MARCACAO = '#B9B3DC'; // = textoSuave
const ZEBRA_A = '#FFCC00'; // = primaria
const ZEBRA_B = '#FF7B85'; // = erro
const CORPO_BOT = '#B9B3DC';
const CORPO_BOT_ASA = '#8E88B8';
const CAPACETE_BOT = '#29D9F5'; // = acento
const CORPO_HUMANO = '#FF4FA3'; // = magenta
const CORPO_HUMANO_ASA = '#D93B85';
const CAPACETE_HUMANO = '#FFCC00';

/**
 * Posições e ângulos pré-calculados ao longo do traçado (o PR 7.9 deriva isso
 * de `pontoNoTracado` + `anguloNoTracado`; aqui é constante porque é maquete).
 * `n` é o número de largada — a identidade individual aprovada pelo dev, em
 * vez de 22 cores.
 */
const CARROS: { n: number; x: number; y: number; ang: number }[] = [
  { n: 1, x: 192.1, y: 500, ang: 0 },
  { n: 2, x: 270.1, y: 500, ang: 0 },
  { n: 3, x: 348.1, y: 500, ang: 0 },
  { n: 4, x: 426.1, y: 500, ang: 0 },
  { n: 5, x: 504.1, y: 500, ang: 0 }, // humano
  { n: 6, x: 582, y: 500, ang: 0 },
  { n: 7, x: 659.3, y: 496.3, ang: -21.8 },
  { n: 8, x: 677.8, y: 454.1, ang: -130.6 },
  { n: 9, x: 727.6, y: 413.6, ang: -10.6 },
  { n: 10, x: 802.4, y: 396.5, ang: -55.5 },
  { n: 11, x: 846.6, y: 332.2, ang: -55.5 },
  { n: 12, x: 815.6, y: 270.7, ang: -128.7 },
  { n: 13, x: 867.1, y: 213.2, ang: -47.5 },
  { n: 14, x: 822.8, y: 153.4, ang: -129.8 },
  { n: 15, x: 748.4, y: 133.2, ang: -166.8 },
  { n: 16, x: 672.5, y: 115.3, ang: -166.8 },
  { n: 17, x: 595.2, y: 108.3, ang: -178.3 },
  { n: 18, x: 517.2, y: 106, ang: -178.3 },
  { n: 19, x: 439.3, y: 103.6, ang: -178.3 },
  { n: 20, x: 361.3, y: 101.3, ang: -178.3 },
  { n: 21, x: 287.3, y: 116.4, ang: 153.4 },
  { n: 22, x: 373, y: 566, ang: 0 }, // PARADO no box — o pedido central do dev
];

const ID_HUMANO = 5;

/** Uma camada da pista: mesmo `d`, largura decrescente. Ordem do array = ordem de pintura. */
const CAMADAS: { cor: string; largura: number; tracejado?: string; offset?: number; opacidade?: number }[] = [
  { cor: ESCAPE, largura: 92 },
  // O MURO é quem carrega a fronteira pista/fora — não o contraste de
  // preenchimento, que é matematicamente impossível de ter 3:1 ao mesmo tempo
  // que o magenta do carro tem 3:1 sobre o asfalto (ver PROGRESS, PR 7.1).
  { cor: MURO, largura: 78 },
  { cor: ZEBRA_A, largura: 62, tracejado: '16 16' },
  { cor: ZEBRA_B, largura: 62, tracejado: '16 16', offset: 16 },
  { cor: ASFALTO, largura: 52 },
  { cor: MARCACAO, largura: 1.6, tracejado: '14 18', opacidade: 0.55 },
];

function Carro({ n, x, y, ang }: { n: number; x: number; y: number; ang: number }) {
  const humano = n === ID_HUMANO;
  const corpo = humano ? CORPO_HUMANO : CORPO_BOT;
  const asa = humano ? CORPO_HUMANO_ASA : CORPO_BOT_ASA;
  const capacete = humano ? CAPACETE_HUMANO : CAPACETE_BOT;
  const e = humano ? 1.13 : 1; // humano um pouco maior

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Só o chassi gira; o número fica na horizontal pra continuar legível. */}
      <g transform={`rotate(${ang})`}>
        <rect x={-15 * e} y={-7 * e} width={30 * e} height={14 * e} rx={4} fill={corpo} />
        <rect x={-15 * e} y={-9 * e} width={6 * e} height={18 * e} rx={2} fill={asa} />
        <rect x={9 * e} y={-8 * e} width={6 * e} height={16 * e} rx={2} fill={asa} />
        {/* cockpit = disco do capacete (decisão D5) — superfície do editor do PR 5.3 */}
        <circle cx={-1} cy={0} r={5 * e} fill={capacete} />
      </g>
      <text y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#16132E">
        {n}
      </text>
    </g>
  );
}

export function MockPista() {
  return (
    <div style={{ background: '#0E0C20', minHeight: '100vh', padding: 24 }}>
      <p style={{ color: '#29D9F5', fontFamily: 'monospace', letterSpacing: 3, fontSize: 12 }}>
        PR 7.1 · MAQUETE DESCARTÁVEL · NÃO É PRODUÇÃO
      </p>
      <svg viewBox="-40 -40 1080 700" style={{ width: '100%', height: 'auto', maxWidth: 1100 }}>
        <defs>
          <linearGradient id="mockVinheta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#241F45" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#16132E" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x={-40} y={-40} width={1080} height={700} fill="#16132E" />
        <rect x={-40} y={-40} width={1080} height={700} fill="url(#mockVinheta)" />

        {/*
          ===== ENTORNO (revisão 2, depois da 2ª referência) =====
          Regra do dev: a pista e os 22 carros são o CONTEÚDO; entorno é MOLDURA.
          Se qualquer adição prejudicar a leitura dos carros, ela está errada.
          Por isso o entorno é só TONALIDADE — nenhum objeto decorativo, nenhuma
          forma que precise ser reconhecida — e toda superfície nova fica bem
          abaixo do asfalto em luminância (0.011 e 0.017 contra 0.048).
        */}
        {/* terreno do autódromo: um stroke largo faz a pista deixar de flutuar */}
        <path d={D_MONZA} fill="none" stroke={TERRENO} strokeWidth={196} strokeLinejoin="round" strokeLinecap="round" />
        {/* áreas de escape em curvas específicas */}
        <g fill={SERVICO}>
          <ellipse cx={700} cy={443} rx={52} ry={40} transform="rotate(-25 700 443)" />
          <ellipse cx={884} cy={264} rx={44} ry={56} transform="rotate(12 884 264)" />
          <ellipse cx={268} cy={86} rx={62} ry={34} transform="rotate(-8 268 86)" />
          <ellipse cx={40} cy={352} rx={40} ry={74} transform="rotate(6 40 352)" />
        </g>
        {/* complexo de boxes ancorado na reta principal + acessos de serviço */}
        <rect x={150} y={500} width={492} height={96} rx={10} fill={SERVICO} />
        <path d="M300,596 L300,628 M470,596 L470,628" stroke={TERRENO} strokeWidth={16} strokeLinecap="round" />
        <rect x={248} y={612} width={104} height={26} rx={5} fill={TERRENO} />
        <rect x={418} y={612} width={104} height={26} rx={5} fill={TERRENO} />

        {/* camadas da pista */}
        <g fill="none" strokeLinejoin="round" strokeLinecap="round">
          {CAMADAS.map((c, i) => (
            <path
              key={i}
              d={D_MONZA}
              stroke={c.cor}
              strokeWidth={c.largura}
              strokeDasharray={c.tracejado}
              strokeDashoffset={c.offset}
              opacity={c.opacidade}
            />
          ))}
        </g>

        {/* pit lane: ilha, garagens, via */}
        <rect x={168} y={512} width={452} height={34} rx={6} fill="#241F45" stroke={MURO} strokeWidth={1.5} />
        <g fill="#2E2952" stroke={MURO} strokeWidth={1.2}>
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={178 + i * 36} y={516} width={30} height={26} rx={3} />
          ))}
        </g>
        {/* box ocupado: o único iluminado */}
        <rect x={358} y={516} width={30} height={26} rx={3} fill={ASFALTO} stroke={ZEBRA_A} strokeWidth={1.6} />

        <path d={D_PIT} fill="none" stroke={MURO} strokeWidth={30} strokeLinecap="round" />
        <path d={D_PIT} fill="none" stroke="#37334F" strokeWidth={22} strokeLinecap="round" />
        <path d={D_PIT} fill="none" stroke={CAPACETE_BOT} strokeWidth={1.4} strokeDasharray="10 14" opacity={0.5} />

        {/* largada */}
        <rect x={196} y={474} width={4} height={52} fill="#F4F2FF" opacity={0.9} />

        <g fontFamily="monospace">
          {CARROS.map((c) => (
            <Carro key={c.n} {...c} />
          ))}
        </g>
      </svg>
    </div>
  );
}
