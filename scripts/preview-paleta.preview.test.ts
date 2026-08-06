/**
 * PREVIEW DA PALETA (PR 7.8) — escreve `preview/paleta.html`.
 *
 * PARA QUE SERVE. A troca da paleta azul-noite pela grafite/F1 é portão
 * visual: número de contraste não diz se a tela "diz F1". Este arquivo mostra
 * as duas telas que importam — DRAFT e CORRIDA — nos dois temas, lado a lado,
 * pra o dev julgar a mesma composição com a única variável sendo a cor.
 *
 * ARQUIVO NOVO, DE PROPÓSITO. Não reaproveita nem regenera `redesenho.html`:
 * aquele preview é o portão AINDA ABERTO do desenho das silhuetas, e repintá-lo
 * com a paleta nova misturaria duas perguntas que o dev precisa responder
 * separado ("a silhueta é reconhecível?" e "a cor diz F1?").
 *
 * COMO OS TEMAS SÃO APLICADOS. Os dois painéis recebem as custom properties
 * REAIS, geradas a partir de `paleta('dark')` e `paleta('light')` — os mesmos
 * nomes de token do app, escopados por painel em vez de `:root` (é a única
 * forma de ter os dois modos na mesma página). A marcação é IDÊNTICA nos dois
 * lados: se algo mudar entre eles, mudou por causa de um token, não do HTML.
 *
 * Roda por `npm run preview` (config separada), fora do `npm test`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CAMADAS_PISTA, VIEWBOX_PISTA, pathDaVolta, pathsDeZebraDaPista } from '../src/ui/pista-camadas';
import { cores, coresLight, type ModoTema, type NomeCor, paleta } from '../src/ui/tokens';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Pista do preview: Interlagos, a mais compacta — cabe inteira no painel. */
const PISTA_ID = 'pista-interlagos';

/** camelCase -> kebab-case, igual ao do app. */
function kebab(nome: string): string {
  return nome.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Bloco de custom properties de um modo, pra escopar num seletor. */
function varsDoModo(modo: ModoTema): string {
  const pal = paleta(modo);
  return (Object.keys(cores) as NomeCor[]).map((n) => `    --${kebab(n)}: ${pal[n]};`).join('\n');
}

/**
 * A pilha de camadas de produção, pintada com `var(--token)` em vez de hex —
 * assim o MESMO markup responde ao tema do painel que o contém. É o que prova
 * visualmente que a pista é mode-invariante: os dois lados têm que sair
 * idênticos.
 */
function camadasSvg(): string {
  const zebras = pathsDeZebraDaPista(PISTA_ID);
  return CAMADAS_PISTA.map((camada) => {
    const comum =
      `stroke="var(--${kebab(camada.cor)})" stroke-width="${camada.largura}" fill="none" stroke-linejoin="round"` +
      (camada.tracejado ? ` stroke-dasharray="${camada.tracejado}"` : '') +
      (camada.deslocamentoTracejado !== undefined ? ` stroke-dashoffset="${camada.deslocamentoTracejado}"` : '');
    if (camada.alvo === 'volta') {
      return `<path d="${pathDaVolta(PISTA_ID)}" ${comum} stroke-linecap="round" />`;
    }
    return zebras.map((z) => `<path d="${z.d}" ${comum} stroke-linecap="butt" />`).join('');
  }).join('');
}

const PECAS = [
  { nome: 'Asa flexível', cat: 'Aerodinâmica', raridade: 'comum', nota: '72' },
  { nome: 'Difusor soprado', cat: 'Aerodinâmica', raridade: 'raro', nota: '81' },
  { nome: 'Câmbio sem costura', cat: 'Transmissão', raridade: 'epico', nota: '88' },
  { nome: 'Suspensão ativa', cat: 'Chassi', raridade: 'lendario', nota: '94' },
  { nome: 'Controle de tração', cat: 'Eletrônica', raridade: 'proibido', nota: '97' },
  { nome: 'Fundo escalonado', cat: 'Aerodinâmica', raridade: 'comum', nota: '69' },
];

/** Tela de draft: cards de peça (bordas de raridade), botão primário, painel de erro. */
function telaDraft(): string {
  const cards = PECAS.map(
    (p) => `
        <button type="button" class="card raridade-${p.raridade}">
          <span class="card__nome">${p.nome}</span>
          <span class="card__cat">${p.cat}</span>
          <span class="card__nota">${p.nota}</span>
        </button>`,
  ).join('');

  return `
    <section class="tela">
      <header class="tela__topo">
        <h2>Rodada 3 — escolha a peça</h2>
        <span class="equipe-ano">Ferrari 2004</span>
      </header>

      <div class="grade-pecas">${cards}</div>

      <div class="erro">Essa peça já foi levada por outro jogador.</div>

      <div class="acoes">
        <button type="button" class="botao-primario">Confirmar escolha</button>
        <button type="button" class="botao-secundario">Passar a vez</button>
      </div>
    </section>`;
}

/** Tela de corrida: painel do traçado + classificação ao vivo com badges. */
function telaCorrida(): string {
  const linhas = [
    { pos: 1, nome: 'M. Schumacher', gap: 'líder', badge: '', humano: false },
    { pos: 2, nome: 'VOCÊ', gap: '+1.284', badge: '', humano: true },
    { pos: 3, nome: 'J. P. Montoya', gap: '+4.902', badge: 'PIT', humano: false },
    { pos: 4, nome: 'K. Räikkönen', gap: '+8.117', badge: '', humano: false },
    { pos: 5, nome: 'R. Barrichello', gap: '+12.44', badge: 'DNF', humano: false },
  ]
    .map(
      (l) => `
          <li class="linha${l.humano ? ' linha-humano' : ''}">
            <span class="pos">${l.pos}</span>
            <span class="nome">${l.nome}</span>
            ${l.badge === 'PIT' ? '<span class="badge badge-pit">PIT</span>' : ''}
            ${l.badge === 'DNF' ? '<span class="badge badge-dnf">DNF</span>' : ''}
            <span class="gap">${l.gap}</span>
          </li>`,
    )
    .join('');

  return `
    <section class="tela">
      <header class="tela__topo">
        <h2>Interlagos — volta 31/71</h2>
        <span class="volta-rapida">⚡ volta rápida 1:11.473</span>
      </header>

      <div class="painel-tracado">
        <svg viewBox="${VIEWBOX_PISTA}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Traçado de Interlagos">
          <rect class="chao" x="-120" y="-120" width="1400" height="900" />
          ${camadasSvg()}
          <circle class="carro carro--bot" cx="300" cy="180" r="13" />
          <circle class="carro carro--bot" cx="620" cy="120" r="13" />
          <circle class="carro carro--humano" cx="470" cy="150" r="15" />
        </svg>
      </div>

      <ol class="classificacao">${linhas}</ol>

      <div class="semaforo">
        <span class="luz luz--verde"></span> largada liberada
      </div>
    </section>`;
}

/** Um painel completo (um tema), com a marcação IDÊNTICA à do outro. */
function painel(modo: ModoTema): string {
  const rotulo = modo === 'dark' ? 'DARK — padrão' : 'LIGHT — novo';
  return `
  <div class="painel painel--${modo}">
    <div class="painel__rotulo">${rotulo}</div>
    <div class="painel__conteudo">
      ${telaDraft()}
      ${telaCorrida()}
    </div>
  </div>`;
}

/** Amostras da paleta, pra o dev ver os hex e as tintas lado a lado. */
function amostras(): string {
  const grupos: Array<[string, NomeCor[]]> = [
    ['Superfícies', ['fundo', 'fundoElevado', 'fundoAfundado', 'borda', 'bordaInterativa']],
    ['Texto', ['texto', 'textoSuave', 'textoEscuro']],
    ['Acentos (preenchimento — IGUAIS nos dois modos)', ['primaria', 'acento', 'sucesso', 'erro']],
    ['Tintas (mode-scoped)', ['primariaTexto', 'acentoTexto', 'sucessoTexto', 'erroTexto']],
    ['Raridade', ['raridadeComum', 'raridadeRaro', 'raridadeEpico', 'raridadeLendario', 'raridadeProibido']],
    [
      'Pista (mode-invariante)',
      ['pistaChao', 'pistaEscape', 'pistaTerreno', 'pistaServico', 'pistaMuro', 'pistaAsfalto', 'pistaLimite', 'pistaZebraA', 'pistaZebraB', 'carroBot'],
    ],
  ];

  return grupos
    .map(([titulo, nomes]) => {
      const chips = nomes
        .map((n) => {
          const d = paleta('dark')[n];
          const l = paleta('light')[n];
          const muda = d !== l;
          return `
        <div class="chip">
          <div class="chip__cores">
            <span class="chip__amostra" style="background:${d}"></span>
            <span class="chip__amostra" style="background:${l}"></span>
          </div>
          <div class="chip__nome">${n}${muda ? ' <em>*</em>' : ''}</div>
          <div class="chip__hex">${d}${muda ? `<br />${l}` : ''}</div>
        </div>`;
        })
        .join('');
      return `<h3>${titulo}</h3><div class="chips">${chips}</div>`;
    })
    .join('');
}

describe('preview da PALETA (portão visual do 7.8)', () => {
  it('escreve preview/paleta.html com draft e corrida nos dois temas', () => {
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Paleta grafite/F1 — dark e light lado a lado (PR 7.8)</title>
<style>
  /* Os dois temas escopados por painel. Mesmos nomes de token do app. */
  .painel--dark {
${varsDoModo('dark')}
  }
  .painel--light {
${varsDoModo('light')}
  }

  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; background: #101010; color: #e8e8e8;
         font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  p.sub { margin: 0 0 18px; font-size: 14px; line-height: 1.55; max-width: 92ch; color: #a8a8a8; }
  p.sub code { color: #ffb800; }

  .lado-a-lado { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  @media (max-width: 900px) { .lado-a-lado { grid-template-columns: 1fr; } }

  .painel { border-radius: 12px; overflow: hidden; border: 1px solid #333; }
  .painel__rotulo { padding: 8px 14px; font: 700 12px/1.4 ui-monospace, monospace;
                    letter-spacing: 2px; background: #1c1c1c; color: #9a9a9a; border-bottom: 1px solid #333; }
  .painel__conteudo { background: var(--fundo); color: var(--texto); padding: 18px; display: grid; gap: 18px; }

  /* ---- Componentes: um só bloco, servindo os dois painéis via var() ---- */
  .tela { background: var(--fundo-elevado); border: 1px solid var(--borda);
          border-radius: var(--raio-lg); padding: var(--espaco-lg); }
  .tela__topo { display: flex; justify-content: space-between; align-items: baseline;
                gap: var(--espaco-md); margin-bottom: var(--espaco-md); flex-wrap: wrap; }
  .tela h2 { font-size: 15px; margin: 0; color: var(--texto); }
  .equipe-ano { font-size: 13px; font-weight: 700; color: var(--acento-texto); }
  .volta-rapida { font-size: 13px; font-weight: 700; color: var(--raridade-lendario-texto); }

  .grade-pecas { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                 gap: var(--espaco-sm); }
  .card { display: grid; gap: 2px; text-align: left; padding: var(--espaco-sm) var(--espaco-md);
          background: var(--fundo-afundado); color: var(--texto); cursor: pointer;
          border: 2px solid var(--borda); border-left-width: 5px; border-radius: var(--raio-sm); }
  .card__nome { font-size: 13px; font-weight: 700; }
  .card__cat { font-size: 11px; color: var(--texto-suave); }
  .card__nota { font-size: 11px; color: var(--texto-suave); }
  .raridade-comum { border-left-color: var(--raridade-comum); }
  .raridade-raro { border-left-color: var(--raridade-raro); }
  .raridade-epico { border-left-color: var(--raridade-epico); }
  .raridade-lendario { border-left-color: var(--raridade-lendario); }
  .raridade-proibido { border-left-color: var(--raridade-proibido); }

  .erro { margin-top: var(--espaco-md); padding: var(--espaco-sm) var(--espaco-md);
          background: var(--fundo-afundado); border: 3px solid var(--erro-texto);
          color: var(--erro-texto); border-radius: var(--raio-sm); font-size: 13px; }

  .acoes { display: flex; gap: var(--espaco-sm); margin-top: var(--espaco-md); flex-wrap: wrap; }
  .botao-primario { padding: 10px 18px; min-height: var(--alvo-toque); cursor: pointer;
                    font-weight: 700; font-size: 14px; border: none; border-radius: var(--raio-sm);
                    background: var(--primaria); color: var(--texto-escuro); }
  .botao-secundario { padding: 10px 18px; min-height: var(--alvo-toque); cursor: pointer;
                      font-size: 14px; border-radius: var(--raio-sm); background: transparent;
                      border: 2px solid var(--borda-interativa); color: var(--texto); }

  /* O painel do traçado é a ILHA ESCURA: em light mode ele NÃO clareia. */
  .painel-tracado { border: 1px solid var(--borda); border-radius: var(--raio-md);
                    overflow: hidden; background: var(--pista-chao); }
  .painel-tracado svg { display: block; width: 100%; height: auto; }
  .chao { fill: var(--pista-chao); }
  .carro--bot { fill: var(--carro-bot); }
  .carro--humano { fill: var(--primaria); }

  .classificacao { list-style: none; margin: var(--espaco-md) 0 0; padding: 0; display: grid; gap: 3px; }
  .linha { display: flex; align-items: center; gap: var(--espaco-sm); font-size: 13px;
           padding: 6px var(--espaco-sm); background: var(--fundo-afundado);
           border-radius: var(--raio-sm); color: var(--texto); }
  .linha-humano { border-left: 4px solid var(--primaria); padding-left: calc(var(--espaco-sm) - 4px); }
  .linha .pos { min-width: 20px; font-weight: 700; color: var(--texto-suave); }
  .linha .nome { flex: 1; }
  .linha .gap { font-family: ui-monospace, monospace; font-size: 12px; color: var(--texto-suave); }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: var(--raio-pill);
           color: var(--texto-escuro); }
  .badge-pit { background: var(--raridade-lendario); }
  .badge-dnf { background: var(--erro); }

  .semaforo { margin-top: var(--espaco-md); font-size: 13px; color: var(--sucesso-texto);
              display: flex; align-items: center; gap: var(--espaco-sm); }
  .luz { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  .luz--verde { background: var(--sucesso); }

  /* ---- Amostras ---- */
  .amostras { margin-top: 28px; padding-top: 18px; border-top: 1px solid #333; }
  .amostras h3 { font-size: 13px; margin: 18px 0 8px; color: #cfcfcf; }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; }
  .chip { width: 152px; border: 1px solid #333; border-radius: 8px; overflow: hidden; background: #171717; }
  .chip__cores { display: flex; height: 34px; }
  .chip__amostra { flex: 1; }
  .chip__nome { padding: 5px 8px 0; font: 600 11px/1.3 ui-monospace, monospace; color: #ddd; }
  .chip__nome em { color: #ffb800; font-style: normal; }
  .chip__hex { padding: 0 8px 6px; font: 10px/1.4 ui-monospace, monospace; color: #8d8d8d; }
</style>
</head>
<body>
<h1>Paleta grafite/F1 — PR 7.8</h1>
<p class="sub">
  A MESMA marcação nos dois painéis; a única variável é o conjunto de custom properties.
  Metade de cima: <strong>draft</strong>. Metade de baixo: <strong>corrida</strong> (Interlagos, geometria e
  camadas de produção).
  <br />
  Repare que o <strong>painel do traçado não clareia</strong> no tema claro: os tokens
  <code>pista*</code> são mode-invariantes de propósito — a regra 1 da Fase 7 (asfalto é a superfície mais
  clara) é impossível sobre uma base clara, porque o teto de luminância do asfalto é 0,0397 e a base clara
  está em 0,877.
  <br />
  Nas amostras, <code>*</code> marca o token que muda entre os modos; quadrado da esquerda = dark, direita = light.
  <strong>Os três acentos da marca não têm asterisco</strong> — só as tintas têm.
</p>

<div class="lado-a-lado">
  ${painel('dark')}
  ${painel('light')}
</div>

<div class="amostras">
  <h2 style="font-size:16px;margin:0 0 4px">Tokens</h2>
  ${amostras()}
</div>
</body>
</html>
`;

    const destino = join(__dirname, '..', 'preview', 'paleta.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, html, 'utf8');

    // Guardas do próprio preview: se o gerador escrever um arquivo vazio ou
    // sem um dos temas, o dev abriria uma página que não responde a pergunta.
    expect(html).toContain('painel--dark');
    expect(html).toContain('painel--light');
    expect(html.length).toBeGreaterThan(8000);

    // A pista tem que sair IDÊNTICA nos dois painéis — é o invariante que o
    // preview existe pra demonstrar, e vale checá-lo em vez de confiar no olho.
    for (const nome of Object.keys(coresLight)) {
      expect(nome.startsWith('pista'), `${nome} é de pista e não pode ser mode-scoped`).toBe(false);
    }

    console.log(`\n  preview escrito: ${destino}\n`);
  });
});
