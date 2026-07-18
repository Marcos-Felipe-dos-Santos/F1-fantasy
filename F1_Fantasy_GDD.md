# F1 Fantasy — Game Design Document (v1.0)

> Jogo de simulação/draft de F1 para navegador, inspirado nos jogos virais "7x1" e "38 a 0". Pilotos, equipes e peças icônicas de 1950 a 2025. Grid de 22 carros, multiplayer online, local e single.

---

## 1. Pilares

- **Sorte no sorteio, habilidade na montagem.** Sorteios individuais dão a base (piloto, motor de eras aleatórias); as escolhas livres (estrategista, pit, peça) são pura decisão.
- **Frankenstein de épocas.** O carro final mistura componentes de anos e equipes diferentes.
- **Escassez na peça icônica.** Toda peça tem 2 cópias. No máximo 2 jogadores correm com a mesma.
- **Risco sem punição cruel.** Peças fortes trazem chance de problema técnico na corrida, nunca eliminação do campeonato.
- **Mesma engine nos 3 modos.** Single, local e online rodam a mesma simulação determinística. A rede é só uma casca por cima.

---

## 2. Modos

| Modo | Humanos | Preenchimento | Funcionamento |
|---|---|---|---|
| **Single** | 1 | 21 bots | 100% local, sem rede. |
| **Local** | 2 a 4 | 18 a 20 bots | Hotseat (passa o dispositivo). |
| **Online** | Até 22 | Vagas vazias = bots | Sala com código. Montagem simultânea com trava ao vivo. |

Grid sempre com **22 carros**.

---

## 3. Fluxo de jogo

O carro é montado em dois tipos de etapa: **sorteios individuais** (a sorte decide a era) e **escolhas livres** (a habilidade decide o componente).

### 🎰 Sorteio individual de Ano + Equipe (um por componente, independente por jogador):
- **Piloto** — cai um ano+equipe → escolhe **1 dos 2 titulares** daquele time naquele ano.
- **Motor** — cai um ano+equipe → usa o motor daquela equipe/ano.

Como cada sorteio é independente, há chance de repetir o mesmo ano+equipe — e chance de cair combinações completamente díspares (ex: piloto Red Bull 2023 + motor Toleman 1981). Nenhum jogador consegue "estocar" tudo de uma equipe dominante.

### 🎯 Escolha livre (sem sorteio, pura decisão):
- **Estrategista** — pool de arquétipos (O Gênio do Undercut, O Pânico, O Conservador, O Cavalo Doido, O Apostador…). Carrega os atributos **CALL** e **SANGF** (§6).
- **Equipe de Pit Stop** — pool (rápida-e-arriscada, lenta-e-segura, equilibrada…). Carrega os atributos **PIT_TEMPO** e **PIT_ERRO** (§6).

### 🏁 Peça icônica (por último):
Escolhe **1 peça** do catálogo (§7), de qualquer época. Este é o único passo com **pool compartilhado e escassez** (2 cópias por peça, trava ao vivo no online). Os sorteios de piloto/motor são individuais e não competem entre jogadores.

### Resultado
O carro final é um mosaico de eras — piloto de um ano, motor de outro — com estrategista e pit escolhidos a dedo e coroado por uma peça icônica.

---

## 4. Seleção no online

Os **sorteios de componentes são individuais** (cada jogador rola os seus). A parte simultânea e disputada é só a **escolha da peça icônica**:

- Todos escolhem ao mesmo tempo, dentro de uma janela (60-90s).
- Cada peça tem **2 cópias**; quando as duas são pegas, ela **trava e fica cinza pra todos na hora** (broadcast em tempo real).
- Quem não confirmar a tempo recebe uma peça automática.
- **Espiar amigos** — depois de fechar sua montagem, se houver tempo, dá pra ver os carros dos outros. No **Modo Cego** mostra só as escolhas (nomes), nunca as notas.

A **classificação** é automática e roda pra todos de uma vez quando a montagem fecha.

---

## 5. Modo de visibilidade das notas

Opção da sala, antes de começar:

- **Modo Craque** 👁️ — notas visíveis. Otimização pura.
- **Modo Cego** 🎲 — esconde tudo: notas, raridade, cor, nenhuma dica visual. Só aparece o nome do piloto, equipe, ano e peça. Quem conhece história de F1 se dá bem; quem não conhece, escolhe no escuro.

Mesma engine; muda só o quanto a UI revela.

---

## 6. Sistema de notas

Escala **0-99, normalizadas por época** — um Lotus 1978 nota 90 compete de igual com um Red Bull 2023 nota 90.

### Piloto
| Atributo | Descrição |
|---|---|
| RIT | Ritmo de corrida |
| QUALI | Ritmo de volta única |
| CONS | Consistência (chance de erro/rodada) |
| ULT | Ultrapassagem (ataque) |
| DEF | Defesa de posição |
| CHU | Performance na chuva |
| PNEU | Gestão de pneu / degradação |
| LARG | Largada / reação na luz |
| SF | Sangue-frio sob pressão |

### Carro/Equipe (por ano)
| Atributo | Descrição |
|---|---|
| AERO | Downforce (curva rápida e média) |
| MEC | Grip mecânico (curva lenta) |
| MOTOR | Potência (reta) |
| PPESO | Peso / agilidade |
| CONF | Confiabilidade (chance de quebra) |
| FREIO | Frenagem |

### Estrategista (escolha livre)
| Atributo | Descrição |
|---|---|
| CALL | Qualidade das decisões (undercut/overcut, chamada de chuva) |
| SANGF | Frieza sob safety car / pressão |

### Equipe de Pit Stop (escolha livre)
| Atributo | Descrição |
|---|---|
| PIT_TEMPO | Velocidade da parada |
| PIT_ERRO | Chance de erro (pneu solto, etc.) |

### Peça icônica
| Campo | Descrição |
|---|---|
| ATRIBUTO_ALVO | Qual(is) habilidade(s) do carro ela turbina |
| BÔNUS | +X no atributo (tamanho vem da raridade, §7) |
| RISCO | Contribuição ao risco técnico (só nas mais fortes, §8) |

---

## 7. Catálogo de peças

Cada jogador leva **1 peça** = **bônus fixo em 1 ou mais habilidades** (+X num atributo). A raridade define o tamanho do bônus. **Todas com 2 cópias.**

### Escala de raridade
| Raridade | Bônus | Risco técnico |
|---|---|---|
| 🟢 Comum | pequeno (~+4) | nenhum |
| 🔵 Raro | médio (~+7) | nenhum |
| 🟣 Épico | grande (~+11) | baixo |
| 🟡 Lendário | enorme (~+15) | médio |
| ☠️ Proibido | absurdo (~+20) | alto |

### Catálogo por categoria

**Aerodinâmica**
- Efeito solo Lotus 79 → AERO
- Duplo difusor Brawn → AERO
- Difusor soprado Red Bull → MEC
- F-duct McLaren → MOTOR (reta)
- Asa flexível → AERO

**Chassi / Suspensão**
- Amortecedor de massa Renault → MEC
- Suspensão ativa Williams FW15 ☠️ → AERO + MEC
- Seis rodas Tyrrell P34 → FREIO

**Motor**
- Turbo modo-quali BMW anos 80 ☠️ → MOTOR
- ERS turbinado → MOTOR
- Escapamento Coanda → MEC

**Pneu / Freio / Direção**
- DAS Mercedes → QUALI + PNEU
- Blown axle → FREIO
- Freio-direção McLaren ☠️ → MEC

**Gambiarras**
- Carro-ventoinha Brabham BT46B ☠️ → MEC
- DRS destravado ☠️ → MOTOR

**Roubos & Polêmicas**
- Truque do fluxo de combustível (inspirado na polêmica Ferrari 2019) ☠️ → MOTOR
- Controle de tração escondido (inspirado em Benetton 1994) ☠️ → LARG + MEC
- Tanque de combustível secreto (inspirado em BAR 2005) ☠️ → PPESO
- Lastro de chumbo removível (inspirado em Tyrrell 1984) 🟡 → PPESO

**Genéricas de época (Comum/Raro)**
- Bargeboards → AERO
- Mapa de motor → MOTOR
- Composto macio → PNEU
- Geometria ajustada → MEC

Os "Roubos & Polêmicas" são referências às controvérsias famosas da F1, tratadas como folclore do jogo — não como afirmação de fato provado.

O +X exato de cada peça fica no arquivo de dados e passa pelo script de balanceamento.

---

## 8. Risco técnico

Peças fortes somam ao **Índice de Suspeita** do carro. Isso **não** tira ninguém do campeonato. Gera, só naquela corrida:
- Chance de **problema técnico** (parada extra, perda de tempo, no pior caso DNF mecânico).
- Chance de **investigação dos comissários** (penalidade de segundos no tempo final).

O campeonato nunca para. O pior é uma corrida ruim.

---

## 9. Pistas (10)

| Pista | Perfil | Ultrapassagem |
|---|---|---|
| Mônaco | Técnica, rua, zero reta | 🔴 Difícil |
| Spa-Francorchamps | Alta velocidade, curvas rápidas, clima instável | 🟡 Média |
| Monza | Templo da velocidade, retas longas | 🟢 Fácil |
| Silverstone | Curvas rápidas, AERO pesa | 🟡 Média |
| Suzuka | Técnica, testa consistência | 🔴 Difícil |
| Interlagos | Clima imprevisível, corridas caóticas | 🟢 Fácil |
| Nürburgring (Nordschleife) | Perigo puro, mista, clima | 🟡 Média |
| Imola | Técnica, histórica | 🔴 Difícil |
| Red Bull Ring | Curta, freadas e retas, premia ULT | 🟢 Fácil |
| Montreal (Gilles Villeneuve) | Stop-and-go, freada pesada, Muro dos Campeões | 🟢 Fácil |

Cada pista tem: pesos de AERO / MEC / MOTOR, dificuldade de ultrapassagem, chance de chuva, nº de voltas (10-15).

Cobertura: potência/retas (Monza, RBR, Spa, Montreal), curva de alta (Silverstone, Suzuka, Spa, Nürburgring), técnica/curva lenta (Mônaco, Suzuka, Imola, Montreal), clima (Spa, Interlagos, Nürburgring, Montreal), rua/muros (Mônaco, Montreal, Nürburgring). Pistas difíceis de ultrapassar = 3 de 10.

---

## 10. Corrida

- **Classificação:** 1 volta única, (QUALI + variância) define o grid. Sem pontos.
- **Corrida:** 10-15 voltas. Cada volta = tempo das notas ponderadas pela pista + variância + rolagem de incidentes (CONS, CONF, clima, risco técnico).
- **Visual:** traçado em SVG, carrinhos como **capacetes estilizados** correndo pelo traçado.
- **Botão Acelerar:** assistir em tempo normal ou pular pro resultado.
- **Pontuação:** sistema oficial FIA (25-18-15-12-10-8-6-4-2-1).
- **Volta mais rápida:** ponto extra vai pra quem cravar a volta mais rápida do **grid inteiro**, mesmo que seja o 22º colocado.
- **Anos:** 1950 a 2025. 2026 fica de fora (temporada incompleta).
- **Seed compartilhada:** permite futuro "Desafio do Dia" (mesma corrida pra todos).

---

## 11. Visual e capacetes

Cada jogador é representado por um **capacete estilizado** na pista.

- **Editor simples:** padrão base (listras, split, chamas, estrelas…) + paleta de cores.
- **Presets clássicos:** capacetes evocando épocas/estilos famosos ("amarelo Brasil", "vermelho clássico", "azul-e-branco retrô") — **inspiração, não cópia**.
- Questões de direito de imagem/marca estão em apuração (§14.2). O design é agnóstico a nome: a engine não depende disso.

---

## 12. Bots

Comportamento definido pela **seed** da partida (mesma seed = mesmo grid de bots, reproduzível). Cada bot é:
- 🥱 **De passeio** — quase aleatório, dá pontos de graça.
- 🔥 **Pra ganhar** — otimiza: mira nas melhores peças que sobraram, monta coerente com a pista.

Proporção de "pra ganhar" = dificuldade (ex: 20% fácil, 60% difícil).

---

## 13. Stack técnico

### Princípio de escala
A corrida é **determinística por seed**. O servidor nunca transmite os 22 carros em tempo real — ele só coordena lobby + montagem e distribui `seed + loadouts`. Cada cliente roda a corrida idêntica localmente. Servidor magro = escalar pra milhares de salas.

### Componentes
- **Engine de simulação:** TypeScript puro, sem dependência de UI. Determinística por seed.
- **Front-end:** React + Vite + SVG.
- **Testes:** Vitest.
- **Online:** PartyKit (Durable Objects na borda da Cloudflare). Cada sala é um DO isolado — escala horizontal automática, sem Redis/load balancer, grátis na conta Cloudflare, hibernação (paga só conexão ativa).

---

## 14. Riscos

1. **Volume de dados + Modo Cego.** Notas de 1950-2025 = milhares de valores. Plano: gerar com IA, ancoradas em fatos verificáveis (posição no campeonato, vitórias, poles), com spot-check manual. Script de balanceamento obrigatório antes de publicar. Se as notas forem boas, o Modo Cego funciona de graça (quem conhece a história sabe escolher no escuro).
2. **Direito de imagem.** Nomes de pilotos/equipes reais e liveries exatas são risco jurídico. Em apuração. A engine é agnóstica a nome — dá pra plugar a decisão jurídica depois sem retrabalho.
3. **Peça forte quebrando o jogo.** Se o bônus da peça for maior que a diferença entre carro top e mediano, a peça decide sozinha. Mitigação: balance-harness + risco técnico calibrado.
4. **Variância de sorte entre sorteios.** Piloto e motor são sorteados independentemente — um jogador pode ter azar nos dois. Mitigação: medir no balance-harness se a "sorte total do sorteio" explica demais do resultado; se sim, aumentar peso das escolhas de habilidade.
5. **Trapaça no cliente.** Simulação determinística no cliente = brecha. Pra jogo casual entre amigos, ok. Pra ranking competitivo, validação no servidor (rodar a corrida da seed e conferir). Ranking fica pra depois.
6. **Condição de corrida na última cópia.** Dois jogadores clicam na 2ª cópia ao mesmo tempo. Mitigação: trava autoritativa no servidor (quem chega primeiro leva).
7. **Bots.** Bot "pra ganhar" burro fica fácil; bom demais frustra. Precisa de tuning iterativo.
8. **Escopo pra uma pessoa.** 76 anos de dados + netcode + capacetes + balanceamento é muito. Mitigação: roadmap em fatias, cada uma jogável sozinha.

---

## 15. Roadmap

1. **Fase 0 — Scaffold.** Vite + React + TS + Vitest, RNG semeado, tipos base.
2. **Fase 1 — Engine + modo Single.** Draft, classificação, corrida, incidentes, balance-harness, UI mínima com 1 pista + carros animados + 21 bots. Valida balanceamento.
3. **Fase 2 — Modo Local.** Hotseat 2-4, Modo Craque/Cego.
4. **Fase 3 — Online (PartyKit).** Sala com código, trava ao vivo, espiar amigos, corrida no cliente, bots por seed.
5. **Fase 4 — Polimento.** Capacetes, card compartilhável, dataset completo 1950-2025, Desafio do Dia.
