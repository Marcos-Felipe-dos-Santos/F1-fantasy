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
 */

import type { TracadoImutavel } from './fluxo-corrida';
import { TRACADO_GENERICO } from './fluxo-corrida';

/**
 * Mônaco (3,337 km, o menor do calendário) — HORÁRIO. Irregular e
 * "amassada" contornando o porto: nenhuma reta longa e nenhuma curva ampla. Os
 * identificadores são o gancho da hairpin do Grand Hotel, na ponta direita, e o
 * zigue-zague da piscina, à esquerda. O túnel é um ARCO à direita, não uma reta
 * — desenhá-lo reto descaracteriza.
 */
const TRACADO_MONACO: TracadoImutavel = [
  { x: 120, y: 228 },
  { x: 178, y: 186 },
  { x: 240, y: 140 },
  { x: 288, y: 112 },
  { x: 320, y: 118 },
  { x: 346, y: 142 },
  { x: 392, y: 176 },
  { x: 456, y: 218 },
  { x: 520, y: 252 },
  { x: 570, y: 276 },
  { x: 618, y: 298 },
  { x: 644, y: 282 },
  { x: 662, y: 246 },
  { x: 692, y: 222 },
  { x: 754, y: 210 },
  { x: 822, y: 202 },
  { x: 870, y: 198 },
  { x: 906, y: 212 },
  { x: 924, y: 246 },
  { x: 910, y: 272 },
  { x: 874, y: 276 },
  { x: 844, y: 286 },
  { x: 822, y: 312 },
  { x: 780, y: 340 },
  { x: 724, y: 378 },
  { x: 654, y: 390 },
  { x: 580, y: 364 },
  { x: 512, y: 328 },
  { x: 460, y: 314 },
  { x: 406, y: 282 },
  { x: 356, y: 236 },
  { x: 326, y: 200 },
  { x: 288, y: 216 },
  { x: 260, y: 246 },
  { x: 258, y: 278 },
  { x: 238, y: 314 },
  { x: 228, y: 354 },
  { x: 194, y: 360 },
  { x: 166, y: 368 },
  { x: 148, y: 402 },
  { x: 146, y: 450 },
  { x: 154, y: 488 },
  { x: 118, y: 478 },
  { x: 78, y: 460 },
  { x: 56, y: 440 },
  { x: 64, y: 398 },
  { x: 86, y: 338 },
  { x: 104, y: 278 },
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
 */
const TRACADO_SILVERSTONE: TracadoImutavel = [
  // Hamilton Straight → Abbey / Farm.
  { x: 624, y: 502 },
  { x: 556, y: 460 },
  { x: 486, y: 420 },
  { x: 458, y: 370 },
  { x: 468, y: 318 },
  { x: 430, y: 264 },
  // Village → The Loop (o único ~180°, apêndice visível).
  { x: 390, y: 226 },
  { x: 402, y: 190 },
  { x: 430, y: 164 },
  { x: 462, y: 170 },
  { x: 462, y: 142 },
  { x: 424, y: 132 },
  { x: 384, y: 152 },
  // Wellington Straight, em diagonal.
  { x: 316, y: 236 },
  { x: 250, y: 324 },
  { x: 194, y: 398 },
  // Brooklands → Luffield: arco longo e lento, ~170°. A volta passa ABAIXO
  // da chegada da Wellington, senão as duas se cruzam.
  { x: 200, y: 448 },
  { x: 246, y: 480 },
  { x: 294, y: 486 },
  { x: 302, y: 524 },
  { x: 250, y: 542 },
  { x: 174, y: 524 },
  // Woodcote → National straight, pro lado esquerdo.
  { x: 118, y: 486 },
  { x: 80, y: 432 },
  // Lateral esquerda subindo até Copse.
  { x: 62, y: 354 },
  { x: 56, y: 260 },
  { x: 72, y: 186 },
  { x: 128, y: 132 },
  // Maggotts-Becketts-Chapel: cinco mudanças de direção em alta.
  { x: 206, y: 108 },
  { x: 294, y: 96 },
  { x: 350, y: 70 },
  { x: 412, y: 86 },
  { x: 484, y: 54 },
  { x: 558, y: 114 },
  // Hangar Straight, descendo pela direita.
  { x: 672, y: 182 },
  { x: 792, y: 248 },
  { x: 890, y: 298 },
  // Stowe → Vale → Club, fechando na reta principal.
  { x: 924, y: 342 },
  { x: 908, y: 402 },
  { x: 842, y: 442 },
  { x: 774, y: 474 },
  { x: 758, y: 510 },
  { x: 714, y: 546 },
  { x: 664, y: 532 },
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
 */
const TRACADO_SUZUKA: TracadoImutavel = [
  // Reta principal (topo) → curvas 1-2 na ponta direita.
  { x: 740, y: 158 },
  { x: 824, y: 174 },
  { x: 902, y: 196 },
  { x: 924, y: 238 },
  { x: 910, y: 274 },
  { x: 866, y: 282 },
  // Esses: quatro curvas encadeadas, serpente.
  { x: 814, y: 262 },
  { x: 774, y: 288 },
  { x: 736, y: 260 },
  { x: 692, y: 282 },
  { x: 652, y: 282 },
  // Dunlop → Degner 1 → Degner 2.
  { x: 608, y: 252 },
  { x: 588, y: 218 },
  { x: 556, y: 268 },
  { x: 524, y: 348 },
  { x: 488, y: 388 },
  // ↓ CRUZAMENTO — mesmo ponto da segunda passagem, mais abaixo.
  { x: 452, y: 376 },
  // Ligação → hairpin (pico agudo).
  { x: 406, y: 368 },
  { x: 374, y: 316 },
  { x: 352, y: 262 },
  { x: 330, y: 224 },
  { x: 302, y: 260 },
  { x: 322, y: 318 },
  // 200R → Spoon (duplo ápice) na ponta esquerda. A ida corre ACIMA da reta
  // traseira: coladas, as duas viram uma faixa só na tela.
  { x: 312, y: 342 },
  { x: 262, y: 366 },
  { x: 202, y: 360 },
  { x: 144, y: 342 },
  { x: 104, y: 340 },
  { x: 64, y: 376 },
  { x: 56, y: 434 },
  { x: 98, y: 468 },
  { x: 172, y: 452 },
  // Reta traseira — passa POR CIMA de Degner 2.
  { x: 312, y: 418 },
  // ↓ CRUZAMENTO — mesmo ponto da primeira passagem.
  { x: 452, y: 376 },
  // 130R → Casio Triangle → última curva. Sobe DIRETO: desviar pra direita
  // aqui punha a reta traseira em cima de Degner 1 (segundo cruzamento).
  { x: 480, y: 326 },
  { x: 488, y: 276 },
  { x: 506, y: 224 },
  { x: 520, y: 188 },
  { x: 538, y: 154 },
  { x: 574, y: 132 },
  { x: 628, y: 138 },
  { x: 682, y: 148 },
];
/**
 * Interlagos (4,309 km) — ANTI-HORÁRIO. Anel externo grande (reta principal
 * descendo, S do Senna, Curva do Sol e a Reta Oposta em diagonal) com o miolo
 * sinuoso preso a ele. Compacta: é a única das dez que não enche a moldura na
 * horizontal, porque o traçado real é quase quadrado e a escala é UNIFORME —
 * esticar pra preencher distorceria a proporção que faz a pista ser ela mesma.
 */
const TRACADO_INTERLAGOS: TracadoImutavel = [
  { x: 306, y: 284 },
  { x: 280, y: 330 },
  { x: 252, y: 378 },
  { x: 224, y: 426 },
  { x: 216, y: 462 },
  { x: 244, y: 486 },
  { x: 276, y: 500 },
  { x: 298, y: 530 },
  { x: 318, y: 552 },
  { x: 354, y: 564 },
  { x: 402, y: 562 },
  { x: 486, y: 522 },
  { x: 570, y: 480 },
  { x: 646, y: 438 },
  { x: 690, y: 402 },
  { x: 704, y: 370 },
  { x: 688, y: 334 },
  { x: 654, y: 302 },
  { x: 582, y: 286 },
  { x: 498, y: 284 },
  // Miolo (Ferradura → Junção): sete curvas lentas alternando. A
  // ALTERNÂNCIA é o que identifica Interlagos, então ela fica; o aperto
  // real do emaranhado, não — a 360 px vira borrão. Dois picos bem
  // separados no lugar dos dedos colados.
  { x: 424, y: 300 },
  { x: 390, y: 266 },
  { x: 402, y: 224 },
  { x: 446, y: 202 },
  { x: 492, y: 224 },
  { x: 514, y: 160 },
  { x: 536, y: 112 },
  { x: 576, y: 124 },
  { x: 584, y: 184 },
  { x: 598, y: 224 },
  { x: 634, y: 174 },
  { x: 654, y: 118 },
  { x: 690, y: 154 },
  { x: 702, y: 210 },
  { x: 738, y: 224 },
  { x: 764, y: 184 },
  { x: 758, y: 134 },
  { x: 738, y: 90 },
  { x: 694, y: 56 },
  { x: 624, y: 36 },
  { x: 536, y: 52 },
  { x: 450, y: 90 },
  { x: 370, y: 142 },
  { x: 332, y: 216 },
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
 */
const TRACADO_IMOLA: TracadoImutavel = [
  // Reta principal (topo, direita → esquerda).
  { x: 704, y: 130 },
  { x: 634, y: 134 },
  { x: 574, y: 140 },
  // Variante Tamburello: chicane como degrau.
  { x: 492, y: 134 },
  { x: 418, y: 124 },
  { x: 352, y: 112 },
  { x: 300, y: 118 },
  // Variante Villeneuve.
  { x: 272, y: 134 },
  { x: 286, y: 166 },
  { x: 250, y: 172 },
  { x: 204, y: 178 },
  // Descida pra Tosa — o vértice mais fechado, extremo esquerdo.
  { x: 170, y: 228 },
  { x: 144, y: 302 },
  { x: 130, y: 372 },
  { x: 156, y: 402 },
  { x: 192, y: 402 },
  // Piratella, no alto do lado esquerdo.
  { x: 184, y: 446 },
  { x: 144, y: 482 },
  { x: 92, y: 508 },
  { x: 56, y: 516 },
  // Acque Minerali.
  { x: 78, y: 550 },
  { x: 138, y: 554 },
  { x: 204, y: 528 },
  { x: 252, y: 514 },
  // Variante Alta: chicane no ponto alto.
  { x: 304, y: 508 },
  { x: 352, y: 494 },
  { x: 392, y: 466 },
  // Rivazza 1 + 2: gancho duplo, quatro esquerdas.
  { x: 400, y: 428 },
  { x: 366, y: 392 },
  { x: 338, y: 336 },
  { x: 364, y: 292 },
  { x: 404, y: 274 },
  // Reta de volta pro fundo do traçado.
  { x: 480, y: 274 },
  { x: 554, y: 272 },
  { x: 614, y: 272 },
  { x: 622, y: 314 },
  { x: 662, y: 326 },
  // Subida ao topo direito.
  { x: 730, y: 282 },
  { x: 790, y: 228 },
  { x: 842, y: 172 },
  { x: 890, y: 134 },
  { x: 924, y: 100 },
  // Variante Gresini: alça que fecha na reta principal.
  { x: 918, y: 64 },
  { x: 882, y: 46 },
  { x: 830, y: 60 },
  { x: 776, y: 98 },
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
 * Montreal / Gilles Villeneuve (4,361 km) — HORÁRIO. Polígono muito estreito e
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
