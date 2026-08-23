/**
 * PREVIEW DO CAMPEONATO ONLINE (PR 3.5.4) — escreve `preview/campeonato-online.html`.
 *
 * ⚠️ **NÃO sobrescreve `preview/campeonato.html`**, que é o preview do PR 8.3 e
 * cujo veredito do dev é o único item ainda aberto da Fase 8 (`ESTADO.md`).
 * Arquivo novo, decisão do dev.
 *
 * PARA QUE SERVE. O caminho que este PR abre só existe com um worker de pé,
 * duas abas, um draft inteiro jogado e a barreira do servidor fechando etapa
 * por etapa — cinco vezes. O preview mostra as telas sem nada disso.
 *
 * ⚠️ NÃO É MAQUETE. Inlina o `tokens.css` e o `estilos.css` REAIS e renderiza
 * os COMPONENTES REAIS. As etapas são computadas por `etapasDaSala`, o
 * calendário por `calendarioDaSala` e a tabela por `classificacaoDaSala` — as
 * MESMAS funções que rodam no jogo, sobre um snapshot forjado como o servidor
 * o publicaria. Só o `useSalaOnline` é substituído (ele abre WebSocket).
 *
 * 🔑 **O QUE ESTE PREVIEW EXISTE PARA MOSTRAR, e nenhum teste automatizado
 * cobre:** que a etapa 2 é uma corrida DIFERENTE da etapa 1. Sem a
 * `key={'etapa-'+k}` no `FluxoCorrida`, o `useState` de `useCorrida` mantém a
 * corrida anterior e o jogador corre a primeira pista cinco vezes — e **o hash
 * sai correto**, porque vem de `etapas[k]` e não da tela, então o detector de
 * divergência não acusa nada. Compare as seções 1 e 2: os nomes das pistas
 * TÊM que ser diferentes.
 *
 * ⚠️ **LIMITE, dito porque preview que esconde limite é preview que mente:** o
 * render estático nasce na fase `'grid'` de `useCorrida` e nada o move dali, e
 * o `extraResultado` só existe sob `fase === 'resultado'`. Por isso as telas de
 * tabela/pódio renderizam `TelaResultadoCorrida` + `ResumoDaEtapaOnline`
 * DIRETAMENTE — que são exatamente os componentes que o `FluxoOnline` monta
 * (`ResumoDaEtapaOnline` é exportado justamente para não haver cópia aqui),
 * mas a montagem entre eles não passou pelo `FluxoOnline`.
 *
 * Mostra os DOIS temas, pela regra travada da paleta (7.8).
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`.
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
import {
  calendarioDaSala,
  classificacaoDaSala,
  etapaCorrenteDaSala,
  etapasDaSala,
} from '../src/ui/corrida-online';
import { criarCliente } from '../src/net/cliente';
import type { EstadoSalaPublico } from '../src/net/tipos';
import { FluxoOnline, ResumoDaEtapaOnline } from '../src/ui/FluxoOnline';
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

const N_ETAPAS_SALA = 5;
const SEED_CALENDARIO = 555_001;
/** As 5 seeds que o DO sortearia (`B-indep`: independentes, não derivadas). */
const SEEDS_ETAPAS = [900_001, 900_002, 900_003, 900_004, 900_005];

const draft = jogarDraftAteConcluir('preview-campeonato-online');

/** As etapas ABERTAS quando o cursor do servidor está em `k` — o snapshot real. */
function etapasAte(k: number) {
  return etapasDaSala(dataset, draft, SEED_CALENDARIO, SEEDS_ETAPAS.slice(0, k + 1), N_ETAPAS_SALA);
}

type Retorno = ReturnType<typeof useSalaOnlineModule.useSalaOnline>;

function salaNaEtapa(k: number, concluida: boolean): EstadoSalaPublico {
  return {
    salaId: 'A3F9C2',
    seedDraft: 2026,
    seedCorrida: 4242,
    etapaAtual: k,
    nEtapas: N_ETAPAS_SALA,
    seedCalendario: SEED_CALENDARIO,
    seedsAbertas: SEEDS_ETAPAS.slice(0, k + 1),
    dificuldade: 'dificil',
    fase: 'iniciada',
    anfitriaoId: ID_HUMANO,
    jogadores: [],
    roster: null,
    draft: null,
    seq: 7 + k,
    concluidaEm: concluida ? 1_760_000_000_000 : null,
    corridaAbertaEm: null,
  };
}

/**
 * Renderiza o `FluxoOnline` REAL com o snapshot da etapa `k`. Tudo abaixo do
 * hook é produção de verdade — inclusive a `key` por etapa, que é o que este
 * preview vem mostrar.
 */
function telaDaEtapa(k: number): string {
  const etapas = etapasAte(k);
  const cliente = {
    ...criarCliente(),
    draft,
    euSou: ID_HUMANO,
    sala: salaNaEtapa(k, false),
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
    etapas,
    etapaCorrente: etapaCorrenteDaSala(etapas),
    calendario: calendarioDaSala(dataset, SEED_CALENDARIO, N_ETAPAS_SALA, etapas, etapas.length),
    classificacao: classificacaoDaSala(etapas, draft),
    entrar: () => {},
    definirPronto: () => {},
    iniciar: () => {},
    sair: () => {},
    escolher: () => {},
    atestarFimDaCorrida: () => {},
  } as Retorno);
  try {
    return renderToStaticMarkup(createElement(FluxoOnline, { sala: 'A3F9C2', onVoltar: () => {} }));
  } finally {
    espiao.mockRestore();
  }
}

/** A tela de RESULTADO da etapa `k`, com a tabela/calendário/pódio embaixo. */
function resultadoDaEtapa(k: number): string {
  const etapas = etapasAte(k);
  const classificacao = classificacaoDaSala(etapas, draft);
  const calendario = calendarioDaSala(
    dataset,
    SEED_CALENDARIO,
    N_ETAPAS_SALA,
    etapas,
    etapas.length,
  );
  return renderToStaticMarkup(
    createElement(TelaResultadoCorrida, {
      state: draft,
      resultado: etapas[k].resultado,
      rotuloReiniciar: '← Voltar ao início',
      onReiniciar: () => {},
      extra: createElement(ResumoDaEtapaOnline, {
        state: draft,
        etapa: k,
        totalEtapas: N_ETAPAS_SALA,
        classificacao,
        calendario,
      }),
    }),
  );
}

describe('preview do campeonato online', () => {
  it('escreve preview/campeonato-online.html com as telas nos dois temas', () => {
    const etapa0 = etapasAte(0);
    const etapa1 = etapasAte(1);
    const todas = etapasAte(4);

    // 🔒 GUARDA DE PRÉ-CONDIÇÃO: se as duas primeiras pistas fossem iguais, o
    // preview não mostraria nada sobre a `key` — e é para isso que ele existe.
    expect(etapa0[0].pista.nome).not.toBe(etapa1[1].pista.nome);

    const secoes = [
      {
        titulo: `1. ETAPA 1 de ${N_ETAPAS_SALA} — grid em ${etapa0[0].pista.nome}`,
        altura: 820,
        nota:
          'O jogador cai aqui direto do fim do draft: não há mais botão "Ir pra corrida" nem o ' +
          '<code>naCorrida</code> que o guardava. A tela é DERIVADA do snapshot, então um F5 no ' +
          'meio da etapa devolve o jogador à mesma etapa — antes ele voltava ao resumo. A pista ' +
          'saiu do calendário sorteado pelo servidor, não de escolha minha.',
        html: telaDaEtapa(0),
      },
      {
        titulo: `2. ETAPA 2 de ${N_ETAPAS_SALA} — grid em ${etapa1[1].pista.nome}`,
        altura: 820,
        nota:
          '🔑 <strong>É ESTA SEÇÃO QUE VALE O PORTÃO.</strong> A barreira do servidor fechou a ' +
          'etapa 1, o cursor andou, o snapshot publicou a seed nova e a tela trocou SOZINHA — ' +
          'sem clique. Compare o nome da pista com a seção 1: <strong>têm que ser diferentes</strong>. ' +
          'Se fossem iguais, seria o bug que a <code>key={etapa-k}</code> existe para impedir — o ' +
          'jogador correndo a primeira pista cinco vezes enquanto a tabela pontua as cinco etapas ' +
          'certas. Nenhum teste automatizado pega isso: o React não emite <code>key</code> no markup.',
        html: telaDaEtapa(1),
      },
      {
        titulo: '3. Fim da ETAPA 1 — a tabela acumulada nasce',
        // 🔑 Alturas MEDIDAS no navegador (`body.scrollHeight` de cada iframe),
        // não estimadas — com margem. A primeira versão usava 1500px e o
        // `PainelCalendario` ficava ATRÁS DO SCROLL INTERNO do iframe: o
        // preview existia e escondia justamente uma das telas que veio mostrar.
        // É a repetição literal do defeito do preview do PR 4/4 (620px
        // escondendo o botão), e só pega quem ABRE.
        altura: 1960,
        nota:
          'O que aparece abaixo do resultado: <code>PainelCampeonato</code> (tabela acumulada, ' +
          '"1 de 5") e <code>PainelCalendario</code> (as 5 pistas, com a próxima destacada). ' +
          '⚠️ Note que NÃO há botão "Próxima corrida": no online quem avança é a barreira do ' +
          'servidor, e um botão prometeria um controle que o jogador não tem.',
        html: resultadoDaEtapa(0),
      },
      {
        titulo: '4. Fim da ETAPA 2 — a tabela CRESCEU',
        altura: 1940,
        nota:
          'Compare com a seção 3: os pontos somaram a segunda etapa e o calendário agora mostra ' +
          'DUAS pistas disputadas, com os vencedores. 🔒 O vencedor da etapa 3 <strong>não</strong> ' +
          'aparece, embora ela já esteja simulada em memória — é a decisão travada do 8.3, e a ' +
          'fronteira é o <code>etapasVistas</code> de <code>calendarioDaSala</code>.',
        html: resultadoDaEtapa(1),
      },
      {
        titulo: '5. FIM DO CAMPEONATO — pódio, tabela final e calendário completo',
        altura: 2180,
        nota:
          'Na última etapa entra o pódio (2º-1º-3º, o campeão ao centro), a tabela fecha como ' +
          'final e o calendário mostra as 5 pistas disputadas com seus vencedores. ⚠️ O pódio ' +
          'aparece DENTRO do resultado da última etapa, e não numa tela própria como no offline: ' +
          'trocar a tela quando <code>concluidaEm</code> chega arrancaria da corrida quem ainda ' +
          'estivesse assistindo — a barreira pode fechar por timeout.',
        html: resultadoDaEtapa(4),
      },
    ];

    const folhas = `${css('tokens.css')}\n${css('estilos.css')}`;

    /**
     * ⚠️ Cada tema vai num IFRAME com documento PRÓPRIO — necessidade, não
     * capricho. A cascata da paleta é `:root[data-tema='light']`, então
     * `data-tema` num `<div>` aninhado NÃO faz nada: foi exatamente o defeito
     * do preview do 3.4.1, cuja seção "tema claro" renderizava escura.
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
<title>Preview — campeonato online (PR 3.5.4)</title>
<style>
/* CSS REAL de produção, inlinado: este preview NÃO é maquete. */
${css('tokens.css')}
${css('estilos.css')}
/* Só o andaime da página de preview vive aqui. */
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
.pv-destaque { color: #ffb800; }
</style>
</head>
<body>
<div class="pv-cabecalho">
  <h1>Campeonato online — PR 3.5.4</h1>
  <p class="pv-nota">
    Componentes REAIS (<code>FluxoOnline</code>, <code>TelaResultadoCorrida</code>,
    <code>ResumoDaEtapaOnline</code>, <code>PainelCampeonato</code>, <code>PainelCalendario</code>)
    com o <code>tokens.css</code> e o <code>estilos.css</code> de produção — não é maquete. As
    etapas vêm de <code>etapasDaSala</code>, o calendário de <code>calendarioDaSala</code> e a
    tabela de <code>classificacaoDaSala</code>: as mesmas funções que rodam no jogo, sobre um
    snapshot forjado como o servidor o publicaria (calendário <code>${SEED_CALENDARIO}</code>,
    5 seeds independentes). Só o <code>useSalaOnline</code> foi substituído, porque ele abre
    WebSocket. <strong>Nada clica e o replay não anda</strong> — para isso, as duas abas.
  </p>
  <p class="pv-nota">
    <span class="pv-destaque">O que conferir primeiro:</span> as seções 1 e 2 mostram pistas
    <strong>diferentes</strong>. É a única prova de que a <code>key</code> por etapa funciona —
    nenhum teste automatizado a alcança.
  </p>
  <p class="pv-nota">
    <span class="pv-destaque">⚠️ A PERGUNTA QUE PRECISA DO SEU VEREDITO (bloqueante C2 da
    revisão):</span> a mesma <code>key</code> que faz a seção 2 ser uma corrida nova
    <strong>remonta a tela no instante em que a barreira do servidor fecha a etapa</strong> — e a
    barreira fecha assim que o último elegível atesta, sem atraso nenhum. Consequência medida no
    código: as telas 3, 4 e 5 desta página — a tabela, o calendário, o pódio, que são o deliverable
    do PR — podem ficar <strong>milissegundos</strong> na tela antes de o jogador ser levado à etapa
    seguinte; e pelo caminho do timeout de 5 min, quem ainda está <em>assistindo</em> a corrida é
    arrancado no meio dela. No offline existe um botão "Próxima corrida" e 5 s de auto-avanço; no
    online não há nada entre chegar ao resultado e ser remontado. <strong>Não consertei</strong>:
    qualquer conserto (deixar a tela ficar atrás do cursor, ou pôr uma contagem) relaxa a invariante
    travada "a MESMA referência alimenta o hash e a tela" para "a mesma função alimenta os dois" —
    e afrouxar invariante travada é decisão sua, não minha.
  </p>
</div>
${blocos('dark')}
${blocos('light')}
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview', 'campeonato-online.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, pagina, 'utf8');

    // 🔒 GUARDAS — sem isto o arquivo existiria e o dev olharia uma página que
    // não mostra o que promete. Cada uma corresponde a uma afirmação da página.
    expect(pagina).toContain(etapa0[0].pista.nome);
    expect(pagina).toContain(etapa1[1].pista.nome);
    // O pódio da última etapa.
    expect(pagina).toContain('Fim do campeonato');
    expect(pagina).toContain('podio__medalha');
    // A tabela acumulada e o calendário.
    expect(pagina).toContain('painel-campeonato');
    // 🔒 O vencedor da etapa 3 NÃO pode aparecer na seção 4 (fim da etapa 2).
    // Conferido na função, não na página: o HTML inteiro contém a seção 5, onde
    // ele legitimamente aparece.
    const calendarioNaEtapa2 = calendarioDaSala(
      dataset,
      SEED_CALENDARIO,
      N_ETAPAS_SALA,
      etapa1,
      etapa1.length,
    );
    expect(calendarioNaEtapa2[2].vencedorId).toBeNull();
    expect(todas).toHaveLength(5);
    // Dentro do `srcdoc` as aspas viram `&quot;` — checar a forma ESCAPADA é o
    // que prova que o tema claro passa pelo iframe (com `:root` próprio) em vez
    // de um `data-tema` numa div, que não pinta nada.
    expect(pagina).toContain('data-tema=&quot;light&quot;');
    expect(pagina).toContain('data-tema=&quot;dark&quot;');
    expect(pagina.length).toBeGreaterThan(5000);
    console.log(`\npreview escrito: ${destino}\n`);
  });
});
