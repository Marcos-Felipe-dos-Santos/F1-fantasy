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
