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

**Situação em 2026-11-06: nenhum som está no jogo ainda.** Estas são as gravações AVALIADAS na
rodada de escolha do PR 3, todas publicadas no [Freesound](https://freesound.org) sob **Creative
Commons 0 (domínio público)**, <https://creativecommons.org/publicdomain/zero/1.0/>. A CC0 não exige
atribuição; a lista existe para registrar a origem. Licença, título e autor foram conferidos na
página de cada som em 2026-11-06. **Depois da escolha, a lista fica só com as que entrarem.**

Os originais ficam só na máquina do dev (`referencias/sons/originais/`, fora do git). As variações
saem deles por `scripts/sons/tratar-sons.ts`, que confere o MD5 de cada original (fixado no próprio
script) antes de tratar; o trecho usado e o tratamento de cada variação vão para um manifesto gerado
em `preview/sons/`, também fora do git.

| Freesound | Título | Autor |
|---|---|---|
| [150337](https://freesound.org/s/150337/) | F1practice3MelbGP2012DR066.wav | Ears68 |
| [150338](https://freesound.org/s/150338/) | F-1-race-cars-restart-1stLap-Turn11-DR081.wav | Ears68 |
| [213976](https://freesound.org/s/213976/) | Rough Idle-V-8HotRod-Startup-Idle-and Burnout-editedDR082.wav | Ears68 |
| [350677](https://freesound.org/s/350677/) | Car race, Nordschleife, VLN, several cars passing by, tyre squeal 02 | Dominik_W |
| [235261](https://freesound.org/s/235261/) | Long Beach Indy Car 2014-04-13.aif | Josh Herman |
| [444877](https://freesound.org/s/444877/) | Goodwood Trackday starts 2.wav | richwise |
| [444879](https://freesound.org/s/444879/) | Goodwood Trackday flybys.wav | richwise |
| [478546](https://freesound.org/s/478546/) | Formula 1 racing | LordFluffeh |
| [18896](https://freesound.org/s/18896/) | sportscar2.aif | Heigh-hoo |
| [14833](https://freesound.org/s/14833/) | backstraight.aif | Heigh-hoo |
| [339703](https://freesound.org/s/339703/) | Audi V8 Acceleration Sound | FFKoenigsegg20012017 |
| [641155](https://freesound.org/s/641155/) | Racing Lap Sounds | mitchgardner1 |
| [585215](https://freesound.org/s/585215/) | Car Engine: Maserati GranTurismo Switch to Sport Mode and Launch | myeclecticself |
| [386326](https://freesound.org/s/386326/) | Impact wrench - Ingersoll Rand 5040t - Start against metal 4 | ldezem |
| [349398](https://freesound.org/s/349398/) | Air Impact Wrench | sevenbsb |
| [71739](https://freesound.org/s/71739/) | Chrysler LHS tire squeal 04 (04-25-2009).wav | audible-edge |
| [209965](https://freesound.org/s/209965/) | Car out of the track.flac | jrosin |
| [852408](https://freesound.org/s/852408/) | the engine finally stalled | monosfera |
| [105351](https://freesound.org/s/105351/) | BACKFIRE.ogg | CeebFrack |
| [437995](https://freesound.org/s/437995/) | G13-13-Rattling Car Won_t Start.wav | craigsmith |
| [164623](https://freesound.org/s/164623/) | Air_escaping.wav | deleted_user_2104797 |
| [462862](https://freesound.org/s/462862/) | Passing Car (Wet road) | Breviceps |
| [200272](https://freesound.org/s/200272/) | Rain heavy 2 (rural) | jmbphilmes |
| [507902](https://freesound.org/s/507902/) | Heavy Rain Sound - Inu Etc.mp3 | inuetc |
| [333404](https://freesound.org/s/333404/) | Cheer 2.wav | jayfrosting |
| [130568](https://freesound.org/s/130568/) | RoaringCrowd.wav | benfree |
| [160493](https://freesound.org/s/160493/) | Large crowd applause.wav | Bansemer |

O 641155 foi baixado e ficou fora das variações de 2026-11-06. O 444878 ("Goodwood Trackday starts
1") estava previsto e não foi baixado: os arquivos locais `largada 1.wav` e `largada 2.wav` têm o
mesmo MD5 do 444877 (`9135b72badbbc00236be38d8bc1157f2`), são cópias dele e não são usados.
