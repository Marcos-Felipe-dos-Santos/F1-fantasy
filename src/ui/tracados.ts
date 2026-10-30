/**
 * Silhuetas de traçado por pista (PR 2.8; REDESENHADAS no PR 7.7): cada entrada
 * é uma polilinha própria nas coordenadas do viewBox do replay, desenhada a
 * partir da GEOMETRIA verificável de cada circuito — sequência de curvas,
 * sentido de giro, proporção reta/curva, elementos-assinatura — descrita em
 * `referencias/REFERENCIA_TRACADOS.md`. A geometria de um circuito é fato; o
 * que não se copia é a ARTE de mapa nenhum, e nenhuma foi decalcada (GDD §14.2).
 * Era: layout MODERNO de todas, com o Nürburgring como GP-Strecke.
 *
 * O que as dez respeitam, medido antes de entrar (o `tracados.test.ts` trava a
 * parte automatizável):
 * - **sentido de giro NA TELA** conforme a referência — horário em Monza,
 *   Mônaco, Spa, Silverstone, Red Bull Ring, Montreal e Nürburgring GP;
 *   anti-horário em Interlagos e Imola; Suzuka mistura os dois, por ser o 8;
 * - **separação ≥ `LARGURA_ASFALTO` (34 u) entre trechos distantes NO ARCO** —
 *   medida em arco, nunca em índice: dois pontos perto no espaço E no arco são
 *   entrada e saída de uma hairpin (legítimo), perto no espaço e LONGE no arco
 *   são duas retas paralelas que viram um borrão só na tela;
 * - **raio de curvatura ≥ 20 u** e nenhuma auto-interseção acidental (a de
 *   Suzuka é intencional e acontece em vértice compartilhado);
 * - **escala UNIFORME por pista**: cada silhueta é ajustada à moldura
 *   preservando o aspecto real do circuito. Esticar em x e y independentemente
 *   encheria melhor a tela e destruiria o "estreito e comprido" de Montreal ou
 *   o formato compacto de Interlagos, que são justamente o que se reconhece.
 *
 * Onde a escala obrigou a escolher, a ESTILIZAÇÃO ganhou da fidelidade: a regra
 * dos 360 px manda que elemento ilegível não entre, então aperto real que
 * viraria borrão foi aberto (o miolo de Interlagos, a garganta do ômega da
 * Mercedes Arena) e hairpin foi levemente exagerada. O que nunca se mexeu foi a
 * ORDEM e o SENTIDO das curvas, que é o que carrega o reconhecimento.
 *
 * Todas as polilinhas são FECHADAS implicitamente: o último ponto liga de volta
 * ao primeiro (ver `pontoNoTracado`), sem repetir o primeiro ponto no fim.
 *
 * PR 2b: os traçados redesenhados neste PR são DERIVADOS da linha central real
 * (bacinger/f1-circuits, MIT), simplificados e com as chicanes estilizadas; a
 * posição aproximada das pit lanes vem do OpenStreetMap (ODbL), sem copiar
 * pontos. Avisos de licença em `THIRD_PARTY_NOTICES.md`.
 */

import type { Ponto, TracadoImutavel } from './fluxo-corrida';
import { TRACADO_GENERICO } from './fluxo-corrida';

/**
 * Mônaco (3,337 km, o menor do calendário) — HORÁRIO. Irregular e
 * "amassada" contornando o porto: nenhuma reta longa e nenhuma curva ampla. Os
 * identificadores são o gancho da hairpin do Grand Hotel, na ponta direita, e o
 * zigue-zague da piscina, no meio. O túnel é um ARCO à direita, não uma reta
 * — desenhá-lo reto descaracteriza.
 *
 * PR 2b: derivada da linha central real. Na escala da moldura o real é um
 * novelo (a volta corre a ~35 u da ida quase inteira), então o trecho de
 * volta (túnel → Rascasse) foi deslocado pra baixo e pra direita e a hairpin
 * do Grand Hotel foi aberta. A perna da Piscina foi afastada mais 8-10 u
 * pra caber a saída do box depois da Sainte Dévote. Ordem e sentido das
 * curvas intocados.
 */
const TRACADO_MONACO: TracadoImutavel = [
  // Reta dos boxes (largada) → Sainte Dévote → subida do Beau Rivage.
  { x: 148, y: 233 },
  { x: 173, y: 201 },
  { x: 204, y: 168 },
  { x: 220, y: 154 },
  { x: 251, y: 135 },
  { x: 272, y: 116 },
  { x: 289, y: 123 },
  { x: 348, y: 164 },
  { x: 423, y: 202 },
  // Massenet → Casino → Mirabeau.
  { x: 459, y: 227 },
  { x: 534, y: 252 },
  { x: 594, y: 289 },
  { x: 621, y: 297 },
  { x: 650, y: 292 },
  { x: 668, y: 277 },
  { x: 683, y: 243 },
  { x: 679, y: 208 },
  { x: 691, y: 188 },
  { x: 710, y: 182 },
  // Hairpin do Grand Hotel (o gancho), ABERTA: no real as duas pernas ficam
  // a ~18 u, um borrão só a 360px.
  { x: 838, y: 152 },
  { x: 826, y: 182 },
  { x: 806, y: 212 },
  { x: 800, y: 242 },
  { x: 818, y: 264 },
  { x: 842, y: 252 },
  { x: 854, y: 222 },
  // Portier → túnel (o arco à direita).
  { x: 874, y: 202 },
  { x: 906, y: 206 },
  { x: 924, y: 228 },
  { x: 898, y: 282 },
  { x: 813, y: 333 },
  { x: 791, y: 375 },
  { x: 760, y: 385 },
  // Nouvelle Chicane → Tabac → Piscina → Rascasse. Todo este trecho de volta
  // foi DESLOCADO pra baixo e pra direita em relação ao real (até ~45 u): na
  // posição real ele corre a ~35 u da subida e da reta dos boxes.
  { x: 692, y: 393 },
  { x: 649, y: 385 },
  { x: 579, y: 364 },
  { x: 550, y: 351 },
  { x: 476, y: 307 },
  { x: 458, y: 320 },
  { x: 439, y: 293 },
  { x: 332, y: 216 },
  { x: 276, y: 233 },
  { x: 255, y: 250 },
  { x: 234, y: 268 },
  { x: 226, y: 300 },
  { x: 186, y: 377 },
  { x: 172, y: 388 },
  { x: 140, y: 426 },
  { x: 134, y: 458 },
  { x: 126, y: 498 },
  // Anthony Noghes → reta dos boxes.
  { x: 69, y: 465 },
  { x: 56, y: 444 },
  { x: 67, y: 426 },
  { x: 73, y: 375 },
  { x: 82, y: 352 },
  { x: 119, y: 277 },
];
/**
 * Spa-Francorchamps (7,004 km, o maior) — HORÁRIO. Triângulo muito alongado e
 * irregular: La Source (hairpin) na base esquerda, Eau Rouge/Raidillon como "S"
 * curto subindo, a reta do Kemmel em diagonal até Les Combes no vértice de
 * cima, e o lado direito descendo por Rivage, Pouhon, Fagnes e Stavelot até
 * Blanchimont fechar na reta dos boxes. O "S" de Eau Rouge é curto de propósito
 * — a fama dele vem do desnível, que não aparece em silhueta.
 */
const TRACADO_SPA: TracadoImutavel = [
  // Reta dos boxes → La Source (hairpin no canto esquerdo).
  { x: 244, y: 420 },
  { x: 180, y: 460 },
  { x: 122, y: 490 },
  { x: 94, y: 506 },
  { x: 84, y: 474 },
  { x: 106, y: 436 },
  // Eau Rouge / Raidillon: "S" curto e apertado subindo.
  { x: 142, y: 382 },
  { x: 184, y: 338 },
  { x: 212, y: 306 },
  { x: 238, y: 284 },
  { x: 272, y: 250 },
  { x: 320, y: 224 },
  // Reta do Kemmel — a mais longa, em diagonal.
  { x: 374, y: 186 },
  { x: 428, y: 148 },
  // Les Combes: degrau no vértice de cima.
  { x: 470, y: 118 },
  { x: 514, y: 100 },
  { x: 594, y: 70 },
  { x: 670, y: 46 },
  { x: 718, y: 36 },
  { x: 756, y: 64 },
  // Rivage: volta longa e fechada na ponta de cima.
  { x: 800, y: 56 },
  { x: 848, y: 84 },
  { x: 886, y: 132 },
  { x: 896, y: 188 },
  { x: 860, y: 218 },
  { x: 810, y: 208 },
  // Descida por Pouhon (duplo ápice).
  { x: 742, y: 218 },
  { x: 682, y: 234 },
  { x: 638, y: 250 },
  // Fagnes: cobra dir-esq.
  { x: 670, y: 284 },
  { x: 718, y: 306 },
  { x: 762, y: 328 },
  { x: 810, y: 358 },
  // Stavelot, ponta inferior direita.
  { x: 852, y: 392 },
  { x: 876, y: 436 },
  { x: 882, y: 478 },
  { x: 854, y: 526 },
  { x: 806, y: 564 },
  // Blanchimont — reta longa de volta.
  { x: 724, y: 520 },
  { x: 654, y: 452 },
  { x: 602, y: 398 },
  { x: 556, y: 370 },
  { x: 514, y: 358 },
  // Bus Stop: chicane que fecha a volta.
  { x: 434, y: 376 },
  { x: 362, y: 398 },
  { x: 324, y: 424 },
  { x: 294, y: 414 },
];
/**
 * Silverstone (5,891 km) — HORÁRIO. Larga e aberta, dois lóbulos ligados por
 * retas longas. Dois elementos carregam o reconhecimento: The Loop, o único
 * ~180°, que faz um dente visível no meio; e Maggotts-Becketts-Chapel, cinco
 * mudanças de direção em alta velocidade atravessando o topo — precisa ler como
 * SERPENTE, não como curva única.
 *
 * PR 2b: derivada da linha central real. Na escala da moldura o Loop corria
 * colado em Becketts/Chapel (folga −12 u na base), então Maggotts-Becketts-
 * Chapel subiram ~14 u (há folga na moldura, a real é limitada pela largura).
 * Village, Luffield, Copse e Stowe desbastadas. Ordem e sentido intocados.
 */
const TRACADO_SILVERSTONE: TracadoImutavel = [
  // Hamilton Straight (reta dos boxes) â†’ Abbey / Farm.
  { x: 722, y: 530 },
  { x: 527, y: 424 },
  { x: 508, y: 400 },
  { x: 502, y: 330 },
  { x: 493, y: 300 },
  // Village â†’ The Loop (o grampo Ã  esquerda) â†’ Aintree.
  { x: 418, y: 228 },
  { x: 406, y: 210 },
  { x: 420, y: 196 },
  { x: 460, y: 182 },
  { x: 462, y: 160 },
  { x: 412, y: 152 },
  { x: 370, y: 162 },
  { x: 282, y: 297 },
  // Wellington Straight desemboca em Brooklands â†’ Luffield, arco longo e lento.
  { x: 193, y: 433 },
  { x: 191, y: 453 },
  { x: 205, y: 476 },
  { x: 258, y: 478 },
  { x: 274, y: 500 },
  { x: 262, y: 526 },
  { x: 238, y: 529 },
  // Woodcote â†’ reta National, subindo pela esquerda atÃ© Copse.
  { x: 170, y: 506 },
  { x: 132, y: 479 },
  { x: 110, y: 446 },
  { x: 58, y: 249 },
  { x: 57, y: 224 },
  { x: 72, y: 200 },
  { x: 100, y: 180 },
  { x: 150, y: 159 },
  { x: 198, y: 145 },
  // Maggotts-Becketts-Chapel, erguidos ~14 u pra abrir o vÃ£o atÃ© o Loop.
  { x: 296, y: 116 },
  { x: 338, y: 82 },
  { x: 357, y: 80 },
  { x: 400, y: 88 },
  { x: 422, y: 84 },
  { x: 456, y: 56 },
  { x: 482, y: 46 },
  { x: 502, y: 56 },
  { x: 532, y: 96 },
  // Hangar Straight â†’ Stowe.
  { x: 548, y: 108 },
  { x: 825, y: 214 },
  { x: 895, y: 246 },
  { x: 920, y: 272 },
  { x: 918, y: 305 },
  // Vale â†’ Club, fechando na reta dos boxes.
  { x: 866, y: 354 },
  { x: 786, y: 452 },
  { x: 804, y: 484 },
  { x: 790, y: 510 },
  { x: 760, y: 530 },
];
/**
 * Suzuka (5,807 km) — o ÚNICO 8 do calendário, e ASSIMÉTRICO: o laço dos Esses
 * + reta principal é bem maior que o da hairpin + Spoon, e o cruzamento NÃO fica
 * no centro geométrico (desenhar um 8 simétrico e regular é o erro fatal aqui).
 *
 * A polilinha CRUZA a si mesma de propósito — é a ponte real, onde a reta
 * traseira passa por cima de Degner 2. O cruzamento é um VÉRTICE COMPARTILHADO
 * EXATO (o mesmo ponto aparece duas vezes no array): `cruzamentosMidSegmento`
 * em `tracados.test.ts` só perdoa auto-interseção em vértice, e `pontoNoTracado`
 * percorre a polilinha por comprimento de arco na ordem sequencial, então os
 * carros passam "por cima" no desenho sem que o movimento mude.
 *
 * PR 2b: derivada da linha central real. O cruzamento fica no trecho em que a
 * ligação já SOBE pra hairpin (~55° com a reta traseira): mais raso, os dois
 * trechos correriam colados além do círculo isento da ponte. Degner foi
 * afastada do 130R, a aproximação do Spoon erguida e a crista dos Esses
 * baixada 6 u pro box do lado real (ver os comentários e `BOXES_POR_PISTA`).
 */
const TRACADO_SUZUKA: TracadoImutavel = [
  // Reta principal (topo) → curvas 1-2 na ponta direita.
  { x: 727, y: 186 },
  { x: 898, y: 230 },
  { x: 916, y: 250 },
  { x: 922, y: 276 },
  { x: 904, y: 297 },
  // Esses: serpente de quatro curvas.
  { x: 819, y: 271 },
  { x: 788, y: 289 },
  { x: 762, y: 284 },
  { x: 738, y: 272 },
  { x: 712, y: 266 },
  { x: 684, y: 278 },
  { x: 659, y: 283 },
  { x: 638, y: 268 },
  // Dunlop → Degner 1 → Degner 2. Degner foi afastada ~22-30 u pra direita e o
  // 130R/Casio ~18-25 u pra esquerda: no real os dois trechos correm a ~25-30 u.
  { x: 625, y: 222 },
  { x: 605, y: 220 },
  { x: 583, y: 225 },
  { x: 567, y: 232 },
  { x: 545, y: 250 },
  { x: 537, y: 276 },
  { x: 528, y: 352 },
  { x: 498, y: 392 },
  { x: 462, y: 398 },
  // ↓ CRUZAMENTO — mesmo ponto da segunda passagem (passagem de BAIXO).
  { x: 430, y: 372 },
  // Ligação → hairpin em V: a perna de entrada vem em DIAGONAL desde o
  // cruzamento e a de saída desce quase reta, como a real (paralelas, liam
  // como um pirulito).
  { x: 400, y: 346 },
  { x: 374, y: 312 },
  { x: 356, y: 280 },
  { x: 344, y: 254 },
  { x: 331, y: 236 },
  { x: 318, y: 250 },
  { x: 317, y: 284 },
  { x: 330, y: 330 },
  // 200R → Spoon. A aproximação do Spoon foi ERGUIDA ~28 u pra descolar da reta
  // traseira, que no real corre a ~25 u abaixo dela.
  { x: 322, y: 346 },
  { x: 306, y: 356 },
  { x: 280, y: 362 },
  { x: 254, y: 370 },
  { x: 226, y: 377 },
  { x: 192, y: 378 },
  { x: 158, y: 368 },
  { x: 111, y: 350 },
  { x: 83, y: 351 },
  { x: 64, y: 372 },
  { x: 57, y: 404 },
  { x: 66, y: 432 },
  { x: 81, y: 441 },
  // Reta traseira — passa POR CIMA da ligação Degner 2 → hairpin.
  { x: 125, y: 445 },
  { x: 181, y: 443 },
  { x: 236, y: 431 },
  // ↓ CRUZAMENTO — mesmo ponto da primeira passagem (passagem de CIMA).
  { x: 430, y: 372 },
  // 130R → Casio Triangle → última curva.
  { x: 455, y: 347 },
  { x: 470, y: 318 },
  { x: 474, y: 276 },
  { x: 479, y: 238 },
  { x: 494, y: 214 },
  { x: 508, y: 200 },
  { x: 520, y: 176 },
  { x: 546, y: 160 },
  { x: 575, y: 155 },
  { x: 606, y: 156 },
];
/**
 * Interlagos (4,309 km) — ANTI-HORÁRIO. Anel externo grande (reta principal
 * descendo, S do Senna, Curva do Sol e a Reta Oposta em diagonal) com o miolo
 * sinuoso preso a ele. Compacta: é a única das dez que não enche a moldura na
 * horizontal, porque o traçado real é quase quadrado e a escala é UNIFORME —
 * esticar pra preencher distorceria a proporção que faz a pista ser ela mesma.
 *
 * PR 2b: derivada da linha central real, com os dois picos do miolo
 * abaixados pra não encostar na Subida dos Boxes.
 */
const TRACADO_INTERLAGOS: TracadoImutavel = [
  // Reta principal descendo (largada) → S do Senna.
  { x: 293, y: 263 },
  { x: 186, y: 389 },
  { x: 173, y: 416 },
  { x: 184, y: 438 },
  { x: 222, y: 444 },
  { x: 236, y: 458 },
  { x: 240, y: 485 },
  { x: 250, y: 515 },
  { x: 272, y: 542 },
  { x: 300, y: 558 },
  { x: 348, y: 563 },
  { x: 419, y: 541 },
  // Fim da Reta Oposta → Descida do Lago.
  { x: 735, y: 423 },
  { x: 752, y: 404 },
  { x: 748, y: 380 },
  { x: 724, y: 328 },
  { x: 700, y: 304 },
  { x: 643, y: 292 },
  // Ferradura → miolo. Os dois picos do miolo ficam
  // ABAIXADOS em relação ao real: na posição real, a ponta de cada um encosta
  // na Subida dos Boxes (trechos distintos a ~30 u; a cerca exige de 45 a 61 u
  // entre eixos, conforme haja zebra de um lado, dos dois ou de nenhum).
  { x: 448, y: 288 },
  { x: 420, y: 274 },
  { x: 404, y: 250 },
  { x: 401, y: 226 },
  { x: 420, y: 200 },
  { x: 440, y: 184 },
  { x: 466, y: 164 },
  { x: 494, y: 170 },
  { x: 506, y: 198 },
  { x: 528, y: 204 },
  { x: 548, y: 190 },
  { x: 556, y: 150 },
  { x: 568, y: 124 },
  { x: 588, y: 114 },
  { x: 612, y: 106 },
  { x: 630, y: 116 },
  { x: 618, y: 140 },
  { x: 616, y: 170 },
  { x: 630, y: 196 },
  { x: 656, y: 216 },
  // Cotovelo → Junção → Subida dos Boxes, de volta à reta.
  { x: 690, y: 221 },
  { x: 788, y: 217 },
  { x: 804, y: 204 },
  { x: 802, y: 180 },
  { x: 786, y: 125 },
  { x: 743, y: 82 },
  { x: 681, y: 45 },
  { x: 645, y: 37 },
  { x: 604, y: 42 },
  { x: 550, y: 63 },
  { x: 452, y: 103 },
  { x: 400, y: 140 },
];
/**
 * Nürburgring GP-Strecke (5,148 km) — HORÁRIO. NÃO é a Nordschleife (20,8 km,
 * ~73 curvas): ela não sobrevive à escala, e a troca foi decisão do dev.
 *
 * Dois elementos-assinatura: a Mercedes Arena, um laço em ômega que sai da reta,
 * dobra sobre si mesmo e volta — sem ele o traçado vira genérico —, e a
 * Dunlop-Kehre, o único hairpin, fazendo o gancho no lado oposto.
 */
const TRACADO_NURBURGRING: TracadoImutavel = [
  // Reta principal (direita → esquerda) → Yokohama-S.
  { x: 768, y: 212 },
  { x: 686, y: 240 },
  { x: 602, y: 264 },
  { x: 536, y: 276 },
  // Haug-Haken → Mercedes Arena: o ômega, laço que dobra sobre si mesmo.
  // Fica TODO à direita de x≈330: a subida da Michelin (T10) corre por ali
  // e as duas se cruzavam.
  { x: 496, y: 296 },
  { x: 474, y: 274 },
  { x: 470, y: 234 },
  { x: 486, y: 200 },
  { x: 524, y: 188 },
  { x: 556, y: 200 },
  { x: 570, y: 174 },
  { x: 556, y: 140 },
  { x: 520, y: 124 },
  { x: 474, y: 124 },
  { x: 434, y: 140 },
  { x: 410, y: 180 },
  { x: 410, y: 228 },
  // Reta do estádio, saindo do laço.
  { x: 414, y: 280 },
  { x: 400, y: 340 },
  { x: 370, y: 390 },
  // Ford-Kurve → Dunlop-Kehre (hairpin em descida).
  { x: 358, y: 440 },
  { x: 378, y: 488 },
  { x: 324, y: 522 },
  { x: 238, y: 538 },
  { x: 152, y: 548 },
  { x: 86, y: 548 },
  { x: 56, y: 518 },
  { x: 90, y: 486 },
  { x: 162, y: 472 },
  // Subida → Michael-Schumacher-S.
  { x: 234, y: 452 },
  { x: 272, y: 406 },
  { x: 318, y: 340 },
  { x: 370, y: 256 },
  // Michelin / Warsteiner / ADVAN.
  { x: 348, y: 194 },
  { x: 338, y: 164 },
  { x: 384, y: 124 },
  { x: 456, y: 88 },
  { x: 544, y: 52 },
  // Reta traseira (Tiergarten).
  { x: 630, y: 64 },
  { x: 708, y: 108 },
  { x: 752, y: 128 },
  // NGK-Schikane em "Z" → Coca-Cola Kurve.
  { x: 778, y: 94 },
  { x: 812, y: 68 },
  { x: 854, y: 74 },
  { x: 894, y: 102 },
  { x: 924, y: 132 },
  { x: 900, y: 170 },
  { x: 838, y: 194 },
];
/**
 * Imola (4,909 km, layout pós-1995) — ANTI-HORÁRIO. Alongada e serpenteante.
 * As três chicanes (Tamburello, Villeneuve, Variante Alta) aparecem como
 * recortes ANGULOSOS — arredondá-las descaracteriza na hora. Tosa é o vértice
 * mais fechado e marca a dobra do traçado; a dupla Rivazza faz o gancho duplo.
 *
 * PR 2b: derivada da linha central real. Na escala da moldura nenhum trecho
 * cola; o trabalho foi desbastar as chicanes, Tosa e Rivazza. Ordem e sentido
 * das curvas intocados.
 */
const TRACADO_IMOLA: TracadoImutavel = [
  // Reta principal (topo, direita → esquerda).
  { x: 734, y: 109 },
  { x: 583, y: 118 },
  { x: 483, y: 103 },
  { x: 427, y: 102 },
  // Variante Tamburello.
  { x: 325, y: 117 },
  { x: 272, y: 134 },
  { x: 260, y: 162 },
  // Variante Villeneuve.
  { x: 206, y: 200 },
  { x: 138, y: 398 },
  // Tosa: o vértice mais fechado, dobra do traçado.
  { x: 147, y: 438 },
  { x: 59, y: 530 },
  { x: 66, y: 552 },
  { x: 88, y: 553 },
  // Piratella → Acque Minerali.
  { x: 236, y: 524 },
  { x: 277, y: 526 },
  { x: 340, y: 533 },
  { x: 368, y: 506 },
  { x: 380, y: 462 },
  { x: 377, y: 432 },
  // Variante Alta.
  { x: 354, y: 346 },
  { x: 382, y: 300 },
  { x: 417, y: 307 },
  // Descida até Rivazza.
  { x: 623, y: 293 },
  { x: 638, y: 306 },
  { x: 728, y: 261 },
  { x: 762, y: 235 },
  // Rivazza, o gancho duplo, e a volta pra reta.
  { x: 842, y: 148 },
  { x: 924, y: 101 },
  { x: 920, y: 84 },
  { x: 904, y: 54 },
  { x: 884, y: 46 },
  { x: 757, y: 103 },
];
/**
 * Red Bull Ring (4,318 km, 10 curvas) — HORÁRIO. O mais SIMPLES do conjunto:
 * praticamente um triângulo irregular, com três lados quase retos separados por
 * freadas duras e muito espaço vazio. Se ficar "cheio de curvas", deixa de ser
 * Red Bull Ring — é por isso que esta é a silhueta com menos pontos de todas.
 */
const TRACADO_RED_BULL_RING: TracadoImutavel = [
  // Reta principal → T1 (Niki Lauda), canto de baixo.
  { x: 686, y: 446 },
  { x: 610, y: 514 },
  { x: 556, y: 546 },
  { x: 510, y: 534 },
  // Reta longa em subida, lado esquerdo.
  { x: 410, y: 450 },
  { x: 308, y: 372 },
  { x: 222, y: 310 },
  // T3 (Remus), ponto mais alto do traçado.
  { x: 102, y: 220 },
  { x: 66, y: 216 },
  { x: 56, y: 184 },
  // Reta do topo.
  { x: 180, y: 138 },
  { x: 322, y: 96 },
  { x: 452, y: 62 },
  // T4 (Schlossgold) → o dente central.
  { x: 540, y: 54 },
  { x: 564, y: 86 },
  { x: 512, y: 138 },
  { x: 440, y: 186 },
  { x: 358, y: 234 },
  { x: 308, y: 260 },
  { x: 334, y: 308 },
  { x: 392, y: 356 },
  { x: 450, y: 386 },
  { x: 494, y: 358 },
  { x: 500, y: 296 },
  { x: 518, y: 244 },
  // Curvas fluidas voltando pela direita.
  { x: 594, y: 192 },
  { x: 688, y: 144 },
  { x: 778, y: 108 },
  { x: 842, y: 104 },
  { x: 900, y: 150 },
  { x: 924, y: 222 },
  { x: 888, y: 296 },
  { x: 816, y: 356 },
  { x: 748, y: 404 },
];
/**
 * Montreal (4,361 km) — HORÁRIO. Polígono muito estreito e
 * alongado, porque a ilha artificial impõe isso: quase não há curvas amplas, e o
 * padrão dominante é reta → freada → reta. O lado da bacia olímpica é
 * notavelmente retilíneo e é ele que dá a leitura de "estreito e comprido";
 * L'Épingle (hairpin) fecha a ponta oposta à largada e a chicane do Muro dos
 * Campeões vem logo antes da linha.
 */
const TRACADO_MONTREAL: TracadoImutavel = [
  // Reta principal → Senna S: grampo na ponta direita. Os dois braços
  // correm separados e a ponta tem raio de verdade — apertada, ela virava
  // um bico de 69° que a guarda dos 45°/vértice reprova.
  { x: 730, y: 322 },
  { x: 788, y: 328 },
  { x: 844, y: 330 },
  { x: 876, y: 332 },
  { x: 908, y: 342 },
  { x: 924, y: 362 },
  { x: 906, y: 384 },
  { x: 872, y: 392 },
  { x: 832, y: 394 },
  { x: 794, y: 414 },
  // Descida em zigue-zague (as chicanes do setor 1) pelo lado de baixo.
  // Cada ponta leva três pontos: com dois, a virada concentra num vértice e
  // a curva suavizada sai com bico de 57°.
  { x: 764, y: 446 },
  { x: 734, y: 458 },
  { x: 706, y: 446 },
  { x: 694, y: 422 },
  { x: 668, y: 412 },
  { x: 638, y: 430 },
  { x: 618, y: 452 },
  { x: 590, y: 446 },
  { x: 572, y: 424 },
  { x: 556, y: 442 },
  { x: 550, y: 470 },
  // Trecho da bacia olímpica — praticamente reto, é o que dá a leitura.
  { x: 496, y: 452 },
  { x: 420, y: 414 },
  { x: 346, y: 376 },
  { x: 280, y: 344 },
  { x: 320, y: 312 },
  { x: 268, y: 280 },
  { x: 194, y: 238 },
  // L'Épingle: hairpin fechando a ponta esquerda. Os braços ficam a ~40 u:
  // colados, o asfalto de um cobre o eixo do outro e a hairpin some.
  { x: 130, y: 202 },
  { x: 86, y: 180 },
  { x: 60, y: 168 },
  { x: 56, y: 144 },
  { x: 82, y: 130 },
  { x: 120, y: 136 },
  // Reta do Casino — longa, de volta pelo topo.
  { x: 192, y: 146 },
  { x: 280, y: 158 },
  { x: 376, y: 178 },
  { x: 476, y: 204 },
  { x: 560, y: 226 },
  // Chicane final (Muro dos Campeões).
  { x: 598, y: 240 },
  { x: 590, y: 268 },
  { x: 564, y: 288 },
  { x: 612, y: 302 },
  { x: 678, y: 322 },
];

/** Traçado por pista (id do dataset ⇒ polilinha); Monza reaproveita `TRACADO_GENERICO` (já é a Monza redesenhada). */
export const TRACADOS_POR_PISTA: Readonly<Record<string, TracadoImutavel>> = {
  'pista-monaco': TRACADO_MONACO,
  'pista-spa': TRACADO_SPA,
  'pista-monza': TRACADO_GENERICO,
  'pista-silverstone': TRACADO_SILVERSTONE,
  'pista-suzuka': TRACADO_SUZUKA,
  'pista-interlagos': TRACADO_INTERLAGOS,
  'pista-nurburgring': TRACADO_NURBURGRING,
  'pista-imola': TRACADO_IMOLA,
  'pista-red-bull-ring': TRACADO_RED_BULL_RING,
  'pista-montreal': TRACADO_MONTREAL,
};

/** Traçado da pista `pistaId`, ou `TRACADO_GENERICO` como fallback pra um id sem silhueta própria (ex.: pista futura ainda não desenhada). */
export function tracadoDaPista(pistaId: string): TracadoImutavel {
  return TRACADOS_POR_PISTA[pistaId] ?? TRACADO_GENERICO;
}

/**
 * PIT LANE declarada (PR 2b). Frações da volta medidas por arco do traçado
 * SUAVIZADO a partir do vértice 0, no sentido de corrida; geometria e desenho
 * em `box.ts`. Entrada, saída e lado vêm da pit lane real (OpenStreetMap), só
 * como posição aproximada.
 */
export interface BoxDeclarado {
  /** Onde a rampa de entrada começa (fração da volta, 0..1). */
  readonly entrada: number;
  /** Onde a rampa de saída termina. Menor que `entrada` = o box cruza a largada. */
  readonly saida: number;
  /** +1 / −1: lado do deslocamento em relação à normal (−ty, tx) da tangente. */
  readonly lado: 1 | -1;
  readonly afastamento: number;
  /**
   * Modelo de RAMPAS (sem `livre`): arco em que o deslocamento vai de 0 ao
   * afastamento nas pontas. Modelo LIVRE: arco da ponta isenta em cada junção
   * (o trecho do caminho livre que ainda nasce da pista).
   */
  readonly rampa: number;
  /**
   * Modelo LIVRE (PR 2b, decisão do Marcos em 2026-10-29): `entrada`/`saida`
   * passam a delimitar só o trecho PARALELO, e entrada e saída viram caminhos
   * livres, de `juncaoEntrada` (fração da volta onde o box nasce da pista)
   * pelos `pontosEntrada` até o início do paralelo, e do fim do paralelo pelos
   * `pontosSaida` até `juncaoSaida`. Tangentes à pista nas junções.
   */
  readonly livre?: {
    readonly juncaoEntrada: number;
    readonly pontosEntrada: readonly Ponto[];
    readonly pontosSaida: readonly Ponto[];
    readonly juncaoSaida: number;
  };
  /** `false` = sem garagens (degrau 2 da escada do box). Padrão: com. */
  readonly garagens?: boolean;
  /** Largura da superfície do box, se diferente de `LARGURA_BOX` (degrau 4 da escada). */
  readonly larguraBox?: number;
}

export const BOXES_POR_PISTA: Readonly<Record<string, BoxDeclarado>> = {
  // Do lado de dentro da reta principal, da saída da Parabólica até antes do Rettifilo.
  'pista-monza': { entrada: 0.9026, saida: 0.0318, lado: 1, afastamento: 48, rampa: 60 },
  // MODELO LIVRE (PR 2b). Lado real (dentro). Paralelo só na reta principal; a
  // entrada nasce na reta (a Subida dos Boxes real não cabe: o corredor até o miolo
  // tem ~57 u e o caminho precisa de ~82); a saída atravessa o miolo vazio e cai
  // na Reta Oposta, DEPOIS do S do Senna, como a real. Degrau 1 da escada.
  'pista-interlagos': {
    entrada: 0.99,
    saida: 0.035,
    lado: -1,
    afastamento: 48,
    rampa: 60,
    livre: {
      juncaoEntrada: 0.97,
      pontosEntrada: [],
      pontosSaida: [{ x: 290, y: 420 }, { x: 390, y: 452 }, { x: 450, y: 482 }],
      juncaoSaida: 0.23,
    },
  },
  // MODELO LIVRE. Lado real (dentro), entre a reta dos boxes e a Piscina. Entrada
  // depois da Rascasse; saída DEPOIS da Sainte Dévote, pelo vão entre ela e a
  // Piscina (a perna da Piscina foi afastada 8-10 u pra isso: degrau 5, aprovado
  // pelo Marcos em 2026-10-29).
  'pista-monaco': {
    entrada: 0.95,
    saida: 0.99,
    lado: 1,
    afastamento: 48,
    rampa: 60,
    livre: {
      juncaoEntrada: 0.925,
      pontosEntrada: [],
      pontosSaida: [{ x: 236, y: 202 }, { x: 302, y: 174 }],
      juncaoSaida: 0.095,
    },
  },
  // MODELO LIVRE. Lado real (dentro, do lado dos Esses), decisão do Marcos
  // (2026-10-29). Degraus 2 (sem garagens), 3 (afastamento mínimo), 4 (box de
  // 12 u = 3,8 px a 360px) e 5 (crista dos Esses baixada 6 u): com garagens e
  // afastamento 46, faltavam 22,6 u. Paralelo curto, onde o vão é maior.
  'pista-suzuka': {
    entrada: 0.99,
    saida: 0.03,
    lado: 1,
    afastamento: 35,
    rampa: 60,
    livre: { juncaoEntrada: 0.975, pontosEntrada: [], pontosSaida: [], juncaoSaida: 0.045 },
    garagens: false,
    larguraBox: 12,
  },
  // MODELO LIVRE. Lado real (dentro da Hamilton Straight). A entrada nasce antes
  // da Vale e passa por dentro dela e da Club, como a real; a saída sobe por
  // dentro da Abbey e entra na pista antes da Farm. Degrau 1 da escada.
  'pista-silverstone': {
    entrada: 0.026,
    saida: 0.065,
    lado: 1,
    afastamento: 48,
    rampa: 60,
    livre: {
      juncaoEntrada: 0.893,
      pontosEntrada: [{ x: 818, y: 332 }, { x: 762, y: 398 }, { x: 722, y: 448 }],
      pontosSaida: [{ x: 556, y: 350 }],
      juncaoSaida: 0.118,
    },
  },
  // MODELO LIVRE. Lado real (por fora da reta principal, em cima). A entrada nasce
  // logo depois da Rivazza e sobe por cima dela; a saída desce e entra na pista
  // antes da Tamburello. Degrau 1 da escada.
  'pista-imola': {
    entrada: 0.97,
    saida: 0.115,
    lado: 1,
    afastamento: 48,
    rampa: 60,
    livre: {
      juncaoEntrada: 0.94,
      pontosEntrada: [{ x: 825, y: 22 }],
      pontosSaida: [{ x: 410, y: 58 }, { x: 358, y: 62 }],
      juncaoSaida: 0.18,
    },
  },
};

/**
 * VIADUTO declarado (PR 2b): cruzamento real do traçado, desenhado como ponte
 * (`viaduto.ts`). `centro` é o vértice compartilhado; `controleBaixo` e
 * `controleCima` são os índices desse vértice na passagem de baixo e na de
 * cima. A cerca de folga só isenta o círculo em volta de `centro`.
 */
export interface ViadutoDeclarado {
  readonly centro: Ponto;
  readonly controleBaixo: number;
  readonly controleCima: number;
}

export const VIADUTOS_POR_PISTA: Readonly<Record<string, readonly ViadutoDeclarado[]>> = {
  // Reta traseira (#47) passa POR CIMA da ligação Degner 2 → hairpin (#22).
  'pista-suzuka': [{ centro: { x: 430, y: 372 }, controleBaixo: 22, controleCima: 47 }],
};
