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
 * Direção de arte (PLANO_CLAUDE_CODE.md §1, corrigido no PR 7.0): estrutura de
 * simulador + tokens do design system do 5.1. Nenhuma cor fora do sistema,
 * exceto `ASFALTO`, que é o token novo proposto pro PR 7.2.
 */

/** Traçado de Monza (`TRACADO_GENERICO`, `fluxo-corrida.ts`) como `d` de SVG — colado de propósito: ver aviso no topo. */
const D_MONZA =
  'M150,500 L650,500 L700,480 L670,445 L720,415 L800,400 L855,320 L815,270 ' +
  'L870,210 L820,150 L650,110 L320,100 L260,130 L160,210 L70,360 L100,470 Z';

/** Via de pit: entra antes da linha de largada, corre paralela à reta, sai depois. */
const D_PIT = 'M118,492 Q126,566 182,566 L606,566 Q664,566 676,500';

/**
 * Trechos de ZEBRA — só em CURVA, nunca ao longo da reta (na F1 real zebra não
 * existe em reta; uma faixa contínua contornando a volta inteira era o que
 * puxava o mock pro cartunesco).
 *
 * Não escolhidos a olho: o ângulo de virada foi calculado em cada um dos 16
 * vértices do traçado e a zebra entra só onde passa de 28° — deu 11 trechos,
 * cada um cobrindo 44 unidades de comprimento de arco antes e depois do
 * vértice. As duas retas longas (largada e Rettilineo) ficam limpas.
 *
 * É o mesmo critério que o PR 7.6 (`trechosDeCurva`) automatiza; aqui está
 * congelado como constante porque é maquete, mas a REGRA já é a definitiva.
 */
const ZEBRAS: string[] = [
  'M112.3,477.4 L150.0,500.0 L194.0,500.0',
  'M659.1,496.3 L700.0,480.0 L671.4,446.6',
  'M698.6,478.4 L670.0,445.0 L707.7,422.4',
  'M756.8,408.1 L800.0,400.0 L824.9,363.7',
  'M830.1,356.3 L855.0,320.0 L827.5,285.6',
  'M842.5,304.4 L815.0,270.0 L844.7,237.6',
  'M840.3,242.4 L870.0,210.0 L841.8,176.2',
  'M848.2,183.8 L820.0,150.0 L777.2,139.9',
  'M364.0,101.3 L320.0,100.0 L280.6,119.7',
  'M92.6,322.3 L70.0,360.0 L81.6,402.4',
  'M88.4,427.6 L100.0,470.0 L137.7,492.6',
];

const ASFALTO = '#363636'; // = pistaAsfalto (7.8: desceu de #3E3A5C — teto imposto pelo carro vermelho)
const ESCAPE = '#121212'; // = pistaEscape (7.8: token proprio, era fundoAfundado)
/**
 * Muro ESCURECIDO na revisão 2. Não veio de referência: na paleta antiga, o
 * `borda` de então tinha luminância 0.0435 contra 0.0482 do asfalto — 10% de
 * diferença. O aro do muro competia com a própria pista pela atenção. Em
 * um muro mais escuro que a borda o asfalto volta a ser, com folga, a
 * superfície mais clara. Na paleta grafite do 7.8 o muro é `#2E2E2E` (0.0273)
 * contra 0.0369 do asfalto — mesma folga, valores recalculados.
 */
const MURO = '#2E2E2E'; // = pistaMuro
/** Terreno do autódromo (revisão 2): a faixa larga que faz a pista deixar de flutuar no vazio. */
const TERRENO = '#202020'; // = pistaTerreno
/** Áreas de escape nas curvas e plataforma do paddock (revisão 2). */
const SERVICO = '#262626'; // = pistaServico
const MARCACAO = '#9A9A9A'; // = pistaLimite
const ZEBRA_A = '#FF1801'; // = pistaZebraA (7.8: zebra vermelho/branco, como o real)
const ZEBRA_B = '#F5F0EB'; // = pistaZebraB
const CORPO_BOT = '#B0B0B0'; // = carroBot
const CORPO_BOT_ASA = '#8A8A8A';
const CAPACETE_BOT = '#FFB800'; // = acento (dourado)
const CORPO_HUMANO = '#FF1801'; // = primaria (7.8: vermelho F1 no lugar do magenta)
const CORPO_HUMANO_ASA = '#C21301';
const CAPACETE_HUMANO = '#FFB800';

/**
 * Posições e ângulos pré-calculados ao longo do traçado (o PR 7.9 deriva isso
 * de `pontoNoTracado` + `anguloNoTracado`; aqui é constante porque é maquete).
 * `n` é o número de largada — a identidade individual aprovada pelo dev, em
 * vez de 22 cores.
 *
 * PELOTÃO, não distribuição uniforme (revisão 3): espaçamento igual lia como
 * decoração, não como corrida. Aqui há líder isolado, trio brigando, dupla,
 * pack de 5 e retardatários espalhados. **No jogo real este espaçamento sai do
 * `historicoVoltas`** — a corrida já produz os gaps sozinha; isto aqui só
 * mostra a ideia.
 */
const CARROS: { n: number; x: number; y: number; ang: number }[] = [
  { n: 1, x: 318.6, y: 500, ang: 0 }, // líder isolado
  { n: 2, x: 455.6, y: 500, ang: 0 }, // trio brigando na reta
  { n: 3, x: 493.5, y: 500, ang: 0 },
  { n: 4, x: 531.4, y: 500, ang: 0 },
  { n: 5, x: 694.5, y: 482.2, ang: -21.8 }, // humano, em dupla na chicane
  { n: 6, x: 679.2, y: 455.7, ang: -130.6 },
  { n: 7, x: 810.8, y: 384.3, ang: -55.5 }, // pack de 5 subindo pras Lesmo
  { n: 8, x: 832.3, y: 353.1, ang: -55.5 },
  { n: 9, x: 853.8, y: 321.8, ang: -55.5 },
  { n: 10, x: 832.7, y: 292.1, ang: -128.7 },
  { n: 11, x: 821.5, y: 262.9, ang: -47.5 },
  { n: 12, x: 785.3, y: 141.8, ang: -166.8 }, // sozinho depois de um gap grande
  { n: 13, x: 620.4, y: 109.1, ang: -178.3 }, // dupla
  { n: 14, x: 582.5, y: 108, ang: -178.3 },
  { n: 15, x: 409.8, y: 102.7, ang: -178.3 }, // trio de retardatários
  { n: 16, x: 371.9, y: 101.6, ang: -178.3 },
  { n: 17, x: 334, y: 100.4, ang: -178.3 },
  { n: 18, x: 185.1, y: 190, ang: 141.3 },
  { n: 19, x: 100.6, y: 309, ang: 121 }, // dupla na Parabolica
  { n: 20, x: 81.1, y: 341.5, ang: 121 },
  { n: 21, x: 98.7, y: 465.3, ang: 74.7 },
  { n: 22, x: 373, y: 566, ang: 0 }, // PARADO no box — o pedido central do dev
];

const ID_HUMANO = 5;

/** Camadas SOB as zebras: mesmo `d`, larguras decrescentes. Ordem = ordem de pintura. */
const CAMADAS_BASE: { cor: string; largura: number }[] = [
  { cor: ESCAPE, largura: 92 },
  // O MURO é quem carrega a fronteira pista/fora — não o contraste de
  // preenchimento, que é matematicamente impossível de ter 3:1 ao mesmo tempo
  // que o magenta do carro tem 3:1 sobre o asfalto (ver PROGRESS, PR 7.1).
  { cor: MURO, largura: 78 },
];

/** Camadas SOBRE as zebras. A linha branca fina é o limite de pista contínuo. */
const CAMADAS_TOPO: { cor: string; largura: number; tracejado?: string; opacidade?: number }[] = [
  // Limite de pista: linha branca FINA e discreta em toda a volta (2 unidades
  // de cada lado ⇒ ~1,4px na tela). É ela que delimita a pista na reta, onde
  // zebra não existe.
  { cor: '#F5F0EB', largura: 56, opacidade: 0.5 },
  { cor: ASFALTO, largura: 52 },
  { cor: MARCACAO, largura: 1.6, tracejado: '14 18', opacidade: 0.5 },
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
      <text y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0F0F0F">
        {n}
      </text>
    </g>
  );
}

export function MockPista() {
  return (
    <div style={{ background: '#121212', minHeight: '100vh', padding: 24 }}>
      <p style={{ color: '#FFB800', fontFamily: 'monospace', letterSpacing: 3, fontSize: 12 }}>
        PR 7.1 · MAQUETE DESCARTÁVEL · NÃO É PRODUÇÃO
      </p>
      <svg viewBox="-40 -40 1080 700" style={{ width: '100%', height: 'auto', maxWidth: 1100 }}>
        <defs>
          <linearGradient id="mockVinheta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A2A2A" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#1A1A1A" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x={-40} y={-40} width={1080} height={700} fill="#1A1A1A" />
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
        {/*
          Complexo de boxes ancorado na reta. Os acessos de serviço finos foram
          REMOVIDOS na revisão 3: a 360px (largura mínima do projeto) ficavam
          com ~5px e viravam sujeira sem comunicar nada. Regra do dev — se não é
          legível a 360px, não entra.
        */}
        <rect x={150} y={500} width={492} height={96} rx={10} fill={SERVICO} />

        {/* camadas sob a zebra */}
        <g fill="none" strokeLinejoin="round" strokeLinecap="round">
          {CAMADAS_BASE.map((c, i) => (
            <path key={i} d={D_MONZA} stroke={c.cor} strokeWidth={c.largura} />
          ))}
        </g>

        {/* zebras: só nos trechos de curva (ver ZEBRAS) */}
        <g fill="none" strokeLinejoin="round" strokeLinecap="butt">
          {ZEBRAS.map((d, i) => (
            <path key={`za${i}`} d={d} stroke={ZEBRA_A} strokeWidth={66} strokeDasharray="12 12" />
          ))}
          {ZEBRAS.map((d, i) => (
            <path key={`zb${i}`} d={d} stroke={ZEBRA_B} strokeWidth={66} strokeDasharray="12 12" strokeDashoffset={12} />
          ))}
        </g>

        {/* camadas sobre a zebra */}
        <g fill="none" strokeLinejoin="round" strokeLinecap="round">
          {CAMADAS_TOPO.map((c, i) => (
            <path
              key={i}
              d={D_MONZA}
              stroke={c.cor}
              strokeWidth={c.largura}
              strokeDasharray={c.tracejado}
              opacity={c.opacidade}
            />
          ))}
        </g>

        {/* pit lane: ilha, garagens, via */}
        <rect x={168} y={512} width={452} height={34} rx={6} fill="#2A2A2A" stroke={MURO} strokeWidth={1.5} />
        <g fill="#2E2E2E" stroke={MURO} strokeWidth={1.2}>
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={178 + i * 36} y={516} width={30} height={26} rx={3} />
          ))}
        </g>
        {/* box ocupado: o único iluminado */}
        <rect x={358} y={516} width={30} height={26} rx={3} fill={ASFALTO} stroke={ZEBRA_A} strokeWidth={1.6} />

        <path d={D_PIT} fill="none" stroke={MURO} strokeWidth={30} strokeLinecap="round" />
        <path d={D_PIT} fill="none" stroke="#363636" strokeWidth={22} strokeLinecap="round" />
        <path d={D_PIT} fill="none" stroke={CAPACETE_BOT} strokeWidth={1.4} strokeDasharray="10 14" opacity={0.5} />

        {/* largada */}
        <rect x={196} y={474} width={4} height={52} fill="#F5F0EB" opacity={0.9} />

        <g fontFamily="monospace">
          {CARROS.map((c) => (
            <Carro key={c.n} {...c} />
          ))}
        </g>
      </svg>
    </div>
  );
}
