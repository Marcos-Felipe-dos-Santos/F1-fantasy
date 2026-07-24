/**
 * Overrides curados de ULT e CHU (PR 4.7, trilha "Dataset histórico 1950-2025",
 * `PROGRESS.md` seção "Próximos").
 *
 * CURADORIA EXPLÍCITA (PR 4.7) — decidida pelo dev, NÃO derivada de fatos;
 * ULT e CHU têm origem diferente do resto do dataset.
 *
 * Motivo (ULT): a métrica derivada de ULT (`posGanhasAjustadasMediana` —
 * ver `derivar-notas.ts`) mede "remontada" (ganho de posição recontado só
 * entre quem terminou), não "ataque"/talento de ultrapassagem — um piloto
 * dominante que já larga na frente (ex.: Verstappen 2023, largando em média
 * P3 e vencendo 19 de 22 corridas) tem POUCA posição pra ganhar, então sai
 * mal na métrica (67, contra 94 de Pérez na mesma temporada/carro). ULT
 * também alimenta o futuro modelo de bloqueio da corrida (Modo Cego) — um
 * Verstappen com ULT baixo, preso atrás de carros lentos, quebraria a
 * intuição de quem conhece F1 real, justo o que o Modo Cego depende pra
 * funcionar. Corrigido aqui por curadoria explícita, não por ajuste de
 * fórmula (a fórmula continua honesta pro resto dos 700+ pilotos-ano fora
 * desta lista).
 *
 * Motivo (CHU): CHU hoje é constante neutra (`NOTA_CHU_V1 = 50`) pra TODOS
 * os pilotos — nenhum fato disponível na Jolpica/Ergast diferencia
 * desempenho sob chuva (não há flag de condição de pista por corrida no
 * dataset atual). Sem override, todo piloto de chuva lendário (Senna,
 * Schumacher) fica indistinguível de qualquer outro na categoria.
 *
 * O override vale pra TODOS os equipe/anos do piloto (carreira inteira) —
 * decisão explícita do dev: não há dado por temporada que justifique variar
 * o override ano a ano, e a lista já é curadoria de julgamento, não
 * estatística.
 *
 * Chave = driverId Jolpica/Ergast (mesmo id de `TitularAnoFatos.driverId`
 * em `agregar-fatos.ts` / `fatos-agregados.json`). Todos os ids abaixo foram
 * validados contra os titulares reais de `scripts/derived/fatos-agregados.json`
 * (ver guarda anti-typo/anti-morto em `overrides-curados.test.ts`).
 *
 * Valores dentro de [28,96] — mesma faixa-alvo (`FAIXA_PADRAO`) da derivação
 * estatística em `derivar-notas.ts`.
 */

// ---------------------------------------------------------------------------
// Tiers ULT — curadoria do dev.
// ---------------------------------------------------------------------------

export const ULT_ELITE = 96;
export const ULT_FORTE = 90;
export const ULT_BOM = 84;

/** ULT curado — override de carreira inteira, vale pra todo equipe/ano do piloto. */
export const ULT_OVERRIDES: Readonly<Record<string, number>> = {
  senna: ULT_ELITE, // Ayrton Senna
  michael_schumacher: ULT_ELITE, // Michael Schumacher
  max_verstappen: ULT_ELITE, // Max Verstappen
  hamilton: ULT_ELITE, // Lewis Hamilton
  alonso: ULT_ELITE, // Fernando Alonso
  mansell: ULT_ELITE, // Nigel Mansell

  montoya: ULT_FORTE, // Juan Pablo Montoya
  raikkonen: ULT_FORTE, // Kimi Räikkönen
  moss: ULT_FORTE, // Stirling Moss
  gilles_villeneuve: ULT_FORTE, // Gilles Villeneuve
  piquet: ULT_FORTE, // Nelson Piquet
  ricciardo: ULT_FORTE, // Daniel Ricciardo
  peterson: ULT_FORTE, // Ronnie Peterson
  watson: ULT_FORTE, // John Watson
  kobayashi: ULT_FORTE, // Kamui Kobayashi
  hunt: ULT_FORTE, // James Hunt
  clark: ULT_FORTE, // Jim Clark
  stewart: ULT_FORTE, // Jackie Stewart

  perez: ULT_BOM, // Sergio Pérez
  leclerc: ULT_BOM, // Charles Leclerc
  norris: ULT_BOM, // Lando Norris
  vettel: ULT_BOM, // Sebastian Vettel
  berger: ULT_BOM, // Gerhard Berger
  andretti: ULT_BOM, // Mario Andretti
  jones: ULT_BOM, // Alan Jones
  keke_rosberg: ULT_BOM, // Keke Rosberg
  emerson_fittipaldi: ULT_BOM, // Emerson Fittipaldi
  kubica: ULT_BOM, // Robert Kubica
  fangio: ULT_BOM, // Juan Manuel Fangio
  alesi: ULT_BOM, // Jean Alesi
  hakkinen: ULT_BOM, // Mika Häkkinen
};

// ---------------------------------------------------------------------------
// Tiers CHU — curadoria do dev.
// ---------------------------------------------------------------------------

export const CHU_REGENMEISTER = 96;
export const CHU_FORTE = 88;
export const CHU_BOM = 80;

/** CHU curado — override de carreira inteira, vale pra todo equipe/ano do piloto. */
export const CHU_OVERRIDES: Readonly<Record<string, number>> = {
  senna: CHU_REGENMEISTER, // Ayrton Senna
  michael_schumacher: CHU_REGENMEISTER, // Michael Schumacher
  hamilton: CHU_REGENMEISTER, // Lewis Hamilton
  max_verstappen: CHU_REGENMEISTER, // Max Verstappen
  ickx: CHU_REGENMEISTER, // Jacky Ickx
  moss: CHU_REGENMEISTER, // Stirling Moss
  stewart: CHU_REGENMEISTER, // Jackie Stewart
  clark: CHU_REGENMEISTER, // Jim Clark

  button: CHU_FORTE, // Jenson Button
  alonso: CHU_FORTE, // Fernando Alonso
  rindt: CHU_FORTE, // Jochen Rindt
  gilles_villeneuve: CHU_FORTE, // Gilles Villeneuve
  rodriguez: CHU_FORTE, // Pedro Rodríguez
  vettel: CHU_FORTE, // Sebastian Vettel
  beltoise: CHU_FORTE, // Jean-Pierre Beltoise
  alesi: CHU_FORTE, // Jean Alesi
  barrichello: CHU_FORTE, // Rubens Barrichello
  surtees: CHU_FORTE, // John Surtees
  fangio: CHU_FORTE, // Juan Manuel Fangio
  brambilla: CHU_FORTE, // Vittorio Brambilla

  damon_hill: CHU_BOM, // Damon Hill
  kubica: CHU_BOM, // Robert Kubica
  hulkenberg: CHU_BOM, // Nico Hülkenberg
  gasly: CHU_BOM, // Pierre Gasly
  hill: CHU_BOM, // Graham Hill — id "hill" é o Graham; Damon é "damon_hill"
  stuck: CHU_BOM, // Hans-Joachim Stuck
  pryce: CHU_BOM, // Tom Pryce
  peterson: CHU_BOM, // Ronnie Peterson
  russell: CHU_BOM, // George Russell
  stroll: CHU_BOM, // Lance Stroll
};
