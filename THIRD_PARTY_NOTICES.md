# Avisos de terceiros

## Traçados das pistas — bacinger/f1-circuits (MIT)

A partir do PR 2b, os traçados de `src/ui/tracados.ts` (e a Monza, em `TRACADO_GENERICO`,
`src/ui/fluxo-corrida.ts`) são derivados da linha central real dos circuitos publicada em
[bacinger/f1-circuits](https://github.com/bacinger/f1-circuits): alinhados, reescalados,
simplificados e com as chicanes estilizadas para a escala do jogo. Os dados de origem não
estão neste repositório.

Ressalva registrada em 2026-11-01: o bacinger/f1-circuits declara licença MIT e não cita o
OpenStreetMap; a origem anterior dos dados não está documentada (o README aponta como fonte
inicial um mapa do Google My Maps).

```
Copyright (c) 2019-2025 Tomislav Bacinger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Pit lanes — OpenStreetMap

O lado da pista, a entrada e a saída das pit lanes (`BOXES_POR_PISTA`, `src/ui/tracados.ts`)
foram posicionados de forma aproximada consultando o OpenStreetMap
(© colaboradores do OpenStreetMap, dados sob a licença ODbL, <https://www.openstreetmap.org/copyright>).
Nenhum ponto foi copiado: a pit lane do jogo é um trecho paralelo, deslocado do próprio traçado, e
caminhos de entrada e saída declarados à mão.

## Efeitos sonoros — Freesound (CC0 1.0)

Os efeitos sonoros do PR 3 são derivados de gravações publicadas no
[Freesound](https://freesound.org) sob **Creative Commons 0 (domínio público)**,
<https://creativecommons.org/publicdomain/zero/1.0/>. A CC0 não exige atribuição; a lista existe
para registrar a origem. Licença, título e autor foram conferidos na página de cada som em
2026-11-06.

A lista traz só as gravações das variações escolhidas pelo Marcos no ouvido em 2026-11-06. As
demais gravações avaliadas naquela rodada estão listadas no commit `4e28433` e não entram no jogo. Situação na
data: os sons ainda não estão em `src/`, a integração é o PR seguinte.

Os originais ficam só na máquina do dev (`referencias/sons/originais/`, fora do git). Os arquivos
saem deles por `scripts/sons/tratar-sons.ts`, que confere o MD5 de cada original (fixado no próprio
script) antes de tratar.

| Freesound | Título | Autor | Uso |
|---|---|---|---|
| [150337](https://freesound.org/s/150337/) | F1practice3MelbGP2012DR066.wav | Ears68 | motor do jogador; e a marcha lenta, se for a opção derivada (V8 de 2012, aproximação de V6 híbrido) |
| [235261](https://freesound.org/s/235261/) | Long Beach Indy Car 2014-04-13.aif | Josh Herman | pelotão |
| [200272](https://freesound.org/s/200272/) | Rain heavy 2 (rural) | jmbphilmes | chuva (mistura) |
| [507902](https://freesound.org/s/507902/) | Heavy Rain Sound - Inu Etc.mp3 | inuetc | chuva (mistura) |
| [14833](https://freesound.org/s/14833/) | backstraight.aif | Heigh-hoo | passagem |
| [462862](https://freesound.org/s/462862/) | Passing Car (Wet road) | Breviceps | spray |
| [444877](https://freesound.org/s/444877/) | Goodwood Trackday starts 2.wav | richwise | largada |
| [349398](https://freesound.org/s/349398/) | Air Impact Wrench | sevenbsb | pistola do pit |
| [71739](https://freesound.org/s/71739/) | Chrysler LHS tire squeal 04 (04-25-2009).wav | audible-edge | derrapagem |
| [437995](https://freesound.org/s/437995/) | G13-13-Rattling Car Won_t Start.wav | craigsmith | abandono |
| [160493](https://freesound.org/s/160493/) | Large crowd applause.wav | Bansemer | torcida |
