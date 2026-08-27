/**
 * PREVIEW DA CORRIDA ONLINE (PR 4/4) — escreve `preview/corrida-online.html`.
 *
 * PARA QUE SERVE. O caminho que este PR abre só existe no fim de um draft
 * online concluído, com a `seedCorrida` publicada — ou seja, exige duas abas,
 * um worker de pé e um draft inteiro jogado até o fim. O preview mostra as
 * quatro telas do caminho sem nada disso.
 *
 * ⚠️ NÃO É MAQUETE. Inlina o `tokens.css` e o `estilos.css` REAIS de produção e
 * renderiza os COMPONENTES REAIS (`FluxoOnline`, `FluxoCorrida`,
 * `TelaResultadoCorrida`) com `renderToStaticMarkup`. A corrida é computada por
 * `corridaDaSala` — a MESMA função que roda no jogo. O que se vê é o que o app
 * desenha. Falta só interação: nada clica e o replay não anda.
 *
 * Mostra os DOIS temas, pela regra travada da paleta (7.8).
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔧 **CONSERTADO EM 2026-08-27 — pendência 0(ab). O arquivo estava QUEBRADO
 * desde o 3.5.4 e ninguém tinha notado, porque `npm run preview` não roda no
 * `npm test` e ninguém o rodou desde então.**
 *
 * O mock de `useSalaOnline` não declarava `etapas` nem `etapaCorrente`, campos
 * que o `FluxoOnline` passou a ler no 3.5.4 — `TypeError` em render, e
 * `npm run preview` saindo **exit 1 inteiro**. Isso importa além deste arquivo:
 * `npm run preview` é o comando que a definição de pronto §5 exige de
 * **qualquer** PR com portão visual, então todo PR seguinte veria um vermelho
 * que não era dele.
 *
 * 🔴 **CONSERTAR A EXECUÇÃO EXPÔS QUE O CONTEÚDO TINHA ENVELHECIDO — e é o
 * achado maior.** O 3.5.4 **removeu o caminho que este preview foi escrito para
 * mostrar**, e nada acusou:
 * - `online.corrida` **não é mais lido** pelo `FluxoOnline` (medido: zero
 *   leitura no componente). O mock continua passando `corrida` e o valor é
 *   **inerte**.
 * - O botão **"Ir pra corrida" não aparece mais neste caminho**:
 *   `mostrarIrParaCorrida={false}` é **fixo** no único call site
 *   (`FluxoOnline.tsx:283`).
 * - Logo as seções 1 e 2 originais — *"o botão APARECE"* e *"a GUARDA … a única
 *   diferença é o botão"* — passaram a renderizar **exatamente a mesma tela,
 *   sem botão nenhum**. A seção 2 virou vacuosa e a 1 virou falsa. **Foram
 *   fundidas numa só, honesta.**
 * - E a guarda `expect(pagina).toContain('Ir pra corrida')` **passava casando
 *   com o TÍTULO da seção 1**, não com o botão. Ver a nota nas asserções.
 *
 * ⚠️ **LACUNA DE COBERTURA ASSUMIDA, e ela é do 3.5.4, não deste conserto:**
 * este preview **não mostra o caminho de campeonato online**, que é o normal de
 * toda sala criada por worker 3.5.1+ (`FluxoOnline.tsx:216-253`). Mostrá-lo
 * exige alimentar o mock com `etapas` NÃO vazio **mais** `classificacao` e
 * `calendario`, que o `ResumoDaEtapaOnline` consome — é cobertura NOVA, não
 * conserto, e por isso ficou fora deste PR curto. **Registrado para não passar
 * por esquecimento.**
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnos from '../src/data/equipe-anos.json';
import pecas from '../src/data/pecas.json';
import pistas from '../src/data/pistas.json';
import { revelarRodada } from '../src/engine/draft';
import type { DraftState, EscolhaDraft } from '../src/engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from '../src/ui/fluxo-draft';
import { corridaDaSala } from '../src/ui/corrida-online';
import { criarCliente } from '../src/net/cliente';
import type { EstadoSalaPublico } from '../src/net/tipos';
import { FluxoOnline } from '../src/ui/FluxoOnline';
import { FluxoCorrida } from '../src/ui/FluxoCorrida';
import { TelaResultadoCorrida } from '../src/ui/TelaResultadoCorrida';
import * as useSalaOnlineModule from '../src/ui/useSalaOnline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// `FluxoOnline` monta a URL do socket a partir de `window.location`.
(globalThis as unknown as { window: unknown }).window = {
  location: { protocol: 'http:', host: 'localhost:5173' },
};

function css(nome: string): string {
  return readFileSync(join(__dirname, '..', 'src', 'ui', nome), 'utf8');
}

const dataset = criarDataset(equipeAnos, pecas, pistas);

/** Joga o humano até o draft concluir — mesmo caminho de `useCorrida.test.ts`. */
function jogarDraftAteConcluir(seedTexto: string): DraftState {
  let atual = iniciarDraftSingle(dataset, seedTexto, 'facil');
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, ID_HUMANO);
    if (revelacao.fase !== 'sorteios') break;
    const slot = revelacao.slotsDisponiveis[0];
    const escolha: EscolhaDraft =
      slot === 'piloto'
        ? {
            tipo: 'piloto',
            pilotoId: (() => {
              const equipeAno = dataset.equipeAnos.find(
                (ea) =>
                  ea.equipe === revelacao.equipeAno.equipe && ea.ano === revelacao.equipeAno.ano,
              );
              if (!equipeAno) throw new Error('equipe/ano sorteada não encontrada');
              return equipeAno.pilotos[0].id;
            })(),
          }
        : { tipo: 'componente', slot };
    atual = aplicarEscolhaHumano(dataset, atual, escolha);
  }
  const revelacao = revelarRodada(atual, ID_HUMANO);
  if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) {
    throw new Error('esperado fase peca com peças reveladas');
  }
  return aplicarEscolhaHumano(dataset, atual, { tipo: 'peca', pecaId: revelacao.pecasReveladas[0] });
}

const SEED_CORRIDA = 4242;
const draft = jogarDraftAteConcluir('preview-corrida-online');
const corrida = corridaDaSala(dataset, draft, SEED_CORRIDA);

type Retorno = ReturnType<typeof useSalaOnlineModule.useSalaOnline>;

function salaConcluida(): EstadoSalaPublico {
  return {
    salaId: 'A3F9C2',
    seedDraft: 2026,
    seedCorrida: SEED_CORRIDA,
    etapaAtual: 0,
    nEtapas: 5,
    seedCalendario: 555_001,
    seedsAbertas: [900_001],
    dificuldade: 'dificil',
    fase: 'iniciada',
    anfitriaoId: ID_HUMANO,
    jogadores: [],
    roster: null,
    draft: null,
    seq: 7,
    concluidaEm: null,
    corridaAbertaEm: null,
  };
}

/**
 * Renderiza o `FluxoOnline` REAL com o draft concluído. Só o `useSalaOnline` é
 * substituído — ele abre WebSocket, e o preview roda em Node sem servidor.
 * Tudo abaixo dele (telas, CSS, a corrida) é produção de verdade.
 */
function telaOnline(extras: Partial<Retorno> = {}): string {
  const cliente = {
    ...criarCliente(),
    draft,
    euSou: ID_HUMANO,
    sala: salaConcluida(),
    ...((extras.cliente ?? {}) as object),
  };
  const espiao = vi.spyOn(useSalaOnlineModule, 'useSalaOnline').mockReturnValue({
    estadoConexao: 'aberta',
    cliente,
    euSou: ID_HUMANO,
    minhaVez: false,
    souAusente: false,
    encerrada: false,
    inexistente: false,
    ultimoErro: null,
    corrida: null,
    /**
     * 🔧 **OS DOIS CAMPOS QUE FALTAVAM — conserto da pendência 0(ab),
     * 2026-08-27.** Sem eles `FluxoOnline.tsx:205` fazia
     * `online.etapas[online.etapaCorrente]` sobre `undefined` e o gerador
     * inteiro morria com `TypeError`, derrubando `npm run preview` para exit 1.
     *
     * 🔑 **`etapaCorrente` é `-1` porque a invariante é `etapas.length - 1`**
     * (docblock de `useSalaOnline`), **não** `0`. Com lista vazia, `-1` é o
     * valor que a produção realmente produziria, e `etapas[-1]` é `undefined` —
     * que é justamente o ramo desta tela. Pôr `0` daria o mesmo `undefined` por
     * acidente e deixaria o mock mentindo sobre a produção.
     */
    etapas: [],
    etapaCorrente: -1,
    entrar: () => {},
    definirPronto: () => {},
    iniciar: () => {},
    sair: () => {},
    escolher: () => {},
    atestarFimDaCorrida: () => {},
    ...extras,
  } as Retorno);
  try {
    return renderToStaticMarkup(createElement(FluxoOnline, { sala: 'A3F9C2', onVoltar: () => {} }));
  } finally {
    espiao.mockRestore();
  }
}

describe('preview da corrida online', () => {
  it('escreve preview/corrida-online.html com as telas nos dois temas', () => {
    const secoes = [
      {
        titulo: '1. Fim do draft online, SEM etapa aberta — o beco sem saída com saída',
        // 🔑 Alturas MEDIDAS no navegador (`body.scrollHeight` de cada iframe),
        // não estimadas. A primeira versão usava 620px e o botão — que era a
        // mudança central do PR 4/4 — ficava atrás do scroll INTERNO do iframe:
        // o preview existia e escondia justamente o que veio mostrar. Mesma
        // família do defeito do 3.4.1, e igualmente só pegável abrindo.
        altura: 1240,
        nota:
          'TelaResumo com mostrarIrParaCorrida={false} — que é fixo no call site (FluxoOnline:283). ' +
          'É o que a produção desenha quando o draft concluiu e etapasDaSala devolveu []: sala ' +
          'legado, sala corrompida (0(t)) ou nEtapas sem formato (0(w)). Para essas três classes o ' +
          'ramo é PERMANENTE, não uma janela. A saída é o "← Voltar ao início".',
        html: telaOnline({}),
      },
      {
        titulo: `3. A corrida — grid de largada em ${corrida.pista.nome}`,
        altura: 780,
        nota:
          `A pista NÃO foi escolhida por mim: saiu de pistaSorteada(seed ${SEED_CORRIDA}), a mesma ` +
          'derivação que roda no jogo. A corrida vem pronta de corridaDaSala — a mesma referência ' +
          'que alimentou o hash de divergência. ⚠️ O que se vê aqui é a PRIMEIRA fase da ' +
          'TelaCorrida (o grid de largada), porque o render estático nasce nela e nada o move: o ' +
          'traçado da pista e a narração aparecem depois do "Largar", e para vê-los é preciso o ' +
          'app de verdade. A tela é a do single/local, sem fork.',
        html: renderToStaticMarkup(
          createElement(FluxoCorrida, {
            state: draft,
            fonte: { modo: 'pronta', corrida },
            onReiniciar: () => {},
          }),
        ),
      },
      {
        titulo: '4. O resultado — pontuação FIA',
        altura: 920,
        nota:
          'Tela de resultado do offline, reusada inteira: coluna de Pontos, destaque do humano, ' +
          'volta mais rápida com o ponto extra. É ao CHEGAR aqui que o cliente atesta "terminei" ' +
          'para a barreira do 3/4 — o que não segura ninguém, só decide quando a sala considera ' +
          'a partida encerrada. ⚠️ O botão do rodapé diz "← Voltar ao início", e NÃO "Novo draft" ' +
          'como no offline: aqui ele sai da sala, e o rótulo antigo prometia um draft novo que ' +
          'não vinha (achado da revisão).',
        html: renderToStaticMarkup(
          createElement(TelaResultadoCorrida, {
            state: draft,
            resultado: corrida.resultado,
            rotuloReiniciar: '← Voltar ao início',
            onReiniciar: () => {},
          }),
        ),
      },
      {
        titulo: '5. O alarme de divergência, agora com texto de CORRIDA',
        altura: 1320,
        nota:
          'O banner do 3.4.1 já valia em todas as telas, mas o texto dizia "o draft" mesmo quando ' +
          'o que divergiu foi a corrida. Agora ramifica: leia a última linha do alarme. Divergir na ' +
          'corrida e ler "não dá pra confiar que o draft é o mesmo" mandaria conferir a coisa errada.',
        html: telaOnline({
          corrida,
          cliente: {
            ...criarCliente(),
            draft,
            euSou: ID_HUMANO,
            sala: salaConcluida(),
            divergencia: { escopo: 'corrida', ancora: 12, jogadores: ['humano-07'] },
          },
        } as Partial<Retorno>),
      },
    ];

    const folhas = `${css('tokens.css')}\n${css('estilos.css')}`;

    /**
     * ⚠️ Cada tema vai num IFRAME com documento PRÓPRIO — necessidade, não
     * capricho. A cascata da paleta é `:root[data-tema='light']`, então
     * `data-tema` num `<div>` aninhado NÃO faz nada: foi exatamente o defeito
     * do preview do 3.4.1, cuja seção "tema claro" renderizava escura. O
     * `srcdoc` dá a cada tema o seu próprio `:root`.
     */
    const molduraTema = (tema: 'dark' | 'light', conteudo: string, altura: number): string => {
      const doc = `<!doctype html><html lang="pt-BR" data-tema="${tema}"><head><meta charset="utf-8">
<style>${folhas}
body { margin:0; padding:16px; background:var(--fundo); color:var(--texto);
       font-family: system-ui, -apple-system, sans-serif; }
</style></head><body>${conteudo}</body></html>`;
      return `<iframe class="pv-frame" style="height:${altura}px" srcdoc="${doc.replace(/"/g, '&quot;')}"></iframe>`;
    };

    const blocos = (tema: 'dark' | 'light') => `
<div class="pv-bloco">
  <h2 class="pv-tema-titulo">${tema === 'dark' ? '🌙 Tema escuro' : '☀️ Tema claro'}</h2>
  ${secoes
    .map(
      (s) => `<section class="pv-secao">
    <h3 class="pv-titulo">${s.titulo}</h3>
    <p class="pv-nota">${s.nota}</p>
    ${molduraTema(tema, s.html, s.altura)}
  </section>`,
    )
    .join('\n')}
</div>`;

    const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — corrida online (PR 4/4)</title>
<style>
/* CSS REAL de produção, inlinado: este preview NÃO é maquete. */
${css('tokens.css')}
${css('estilos.css')}
/* Só o andaime da página de preview vive aqui. */
/* A página de fora é neutra de propósito: quem manda na cor é cada iframe. */
body { margin: 0; padding: 0; background: #1a1a1a; color: #e8e8e8;
       font-family: system-ui, -apple-system, sans-serif; }
.pv-bloco { padding: 24px; }
.pv-tema-titulo { max-width: 980px; margin: 0 auto 20px; font-size: 1.2rem; color: #ffb800; }
.pv-secao { max-width: 980px; margin: 0 auto 36px; }
.pv-titulo { font-size: 1rem; margin: 0 0 4px; color: #ffb800; }
.pv-nota { font-size: .85rem; color: #a0a0a0; margin: 0 0 14px; line-height: 1.5; }
.pv-frame { width: 100%; border: 1px dashed #555; border-radius: 12px;
            background: #fff; display: block; }
.pv-cabecalho { max-width: 980px; margin: 0 auto; padding: 24px 24px 0; }
</style>
</head>
<body>
<div>
  <div class="pv-cabecalho">
    <h1>Corrida online — PR 4/4</h1>
    <p class="pv-nota">
      Componentes REAIS (<code>FluxoOnline</code>, <code>FluxoCorrida</code>,
      <code>TelaResultadoCorrida</code>) com o <code>estilos.css</code> e o <code>tokens.css</code>
      de produção — não é maquete. A corrida foi computada por <code>corridaDaSala</code>, a mesma
      função que roda no jogo, sobre a seed <code>${SEED_CORRIDA}</code>. Só o
      <code>useSalaOnline</code> foi substituído, porque ele abre WebSocket e o preview roda sem
      servidor. <strong>Nada clica e o replay não anda</strong> — para isso, as duas abas.
    </p>
  </div>
</div>
${blocos('dark')}
${blocos('light')}
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview', 'corrida-online.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, pagina, 'utf8');

    // Guardas: sem isto o arquivo existiria e o dev olharia uma página que não
    // mostra o que promete.
    /**
     * 🔴 **A GUARDA ANTERIOR ERA VACUOSA E FOI TROCADA (0(ab), 2026-08-27).**
     * Era `expect(pagina).toContain('Ir pra corrida')`, e ela passava casando
     * com o **título da seção 1** — que continha a frase —, não com o botão
     * renderizado. **Media a prosa da página, não o dado.** Depois do 3.5.4 o
     * botão não existe mais neste caminho (`mostrarIrParaCorrida={false}` é fixo
     * em `FluxoOnline.tsx:283`), e a guarda velha teria continuado verde para
     * sempre, afirmando exatamente o que deixou de ser verdade.
     * 🔑 É a mesma família do `>F-duct McLaren<` que casou na linha "era:" do
     * preview das peças, no mesmo dia. **Guarda tem de ancorar em MARCAÇÃO.**
     */
    // `tela-resumo__acoes` é o contêiner dos botões (`TelaResumo.tsx:73`): prova
    // que a TelaResumo renderizou de fato, e é onde o botão estaria se existisse.
    expect(pagina).toContain('tela-resumo__acoes');
    expect(pagina).toContain('← Voltar ao início'); // a saída do beco existe
    // 🔒 ANTI-VACUIDADE AO CONTRÁRIO: o botão do caminho antigo tem de estar
    // AUSENTE da marcação. `onIrParaCorrida` é o único handler dele
    // (`TelaResumo.tsx:75`) e some junto quando `mostrarIrParaCorrida` é false.
    // Sem esta linha, o botão poderia voltar sem que nada avisasse.
    expect(pagina).not.toContain('>Ir pra corrida<');
    expect(pagina).toContain(corrida.pista.nome);
    expect(pagina).toContain('a corrida é a mesma'); // o texto ramificado do banner
    // Dentro do `srcdoc` as aspas viram `&quot;` — checar a forma ESCAPADA é o
    // que prova que o tema claro passa pelo iframe (com `:root` próprio) em vez
    // de um `data-tema` numa div, que não pinta nada.
    expect(pagina).toContain('data-tema=&quot;light&quot;');
    expect(pagina).toContain('data-tema=&quot;dark&quot;');
    expect(pagina.length).toBeGreaterThan(5000);
    console.log(`\npreview escrito: ${destino}\n`);
  });
});
