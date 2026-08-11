# Jogar em rede (celular, LAN, ZeroTier)

> Como abrir o jogo pra outras máquinas. Medido em 2026-08-10 na máquina do dev.

## O comando

**Dois terminais**, no PowerShell, na pasta do projeto:

```
Terminal 1:   npm run sala        (worker/Durable Object — fica em 127.0.0.1:8787)
Terminal 2:   npm run dev:rede    (app — escuta em TODAS as interfaces, porta 5173)
```

O `npm run dev:rede` imprime os endereços. Na máquina do dev hoje:

```
Local:    http://localhost:5173/
Network:  http://192.168.0.13:5173/       ← LAN (é este no celular pelo Wi-Fi)
Network:  http://10.241.222.232:5173/     ← ZeroTier
Network:  http://26.156.17.128:5173/      ← Radmin VPN
```

**Abra no celular o endereço da LAN.** Todo mundo entra pelo mesmo nome de sala.

## Por que uma porta só (e por que a primeira versão não funcionava)

`wrangler dev` sobe em **`127.0.0.1:8787`** — só localhost. Então, antes desta correção, de
outra máquina o app **carregava** (Vite exposto) mas o WebSocket **morria** (worker fechado).

E abrir o worker na rede **não teria bastado**: a URL do WebSocket era fixa
(`ws://<host>:8787`), e **cada visitante chega por um IP diferente** — LAN, ZeroTier, Radmin,
celular. Não existe endereço fixo que sirva todos.

A correção foi fazer o **Vite servir o worker**: `vite.config.ts` tem um proxy de `/parties/*`
para `127.0.0.1:8787` com `ws: true` (repassa o `Upgrade: websocket`), e
`baseParaEstaPagina` passou a derivar do **host da própria página**. Assim:

- **uma porta só** exposta (5173) — o 8787 continua fechado em localhost;
- funciona em **qualquer interface**, sem configurar nada por cliente;
- e continua funcionando em cenários futuros (túnel, outra rede) sem tocar em código.

**Medido:** o smoke completo (17 cheques, WebSocket real) passou pelas quatro rotas —
`localhost`, `192.168.0.13`, `10.241.222.232` e `26.156.17.128` — todas na porta **5173**, com o
worker ainda em `127.0.0.1`.

## Firewall do Windows

Só a **5173/TCP** precisa entrar. A 8787 não — ela nunca sai da máquina.

⚠️ **As três interfaces desta máquina estão no perfil `Public`** (verificado com
`Get-NetConnectionProfile`), que é o mais restritivo — inclusive a Ethernet da LAN. Já existem
regras "Node.js JavaScript Runtime" nesse perfil, criadas por algum aviso do Windows em execução
anterior; se o celular não conectar, é o primeiro suspeito.

Para garantir, num PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName "F1 Fantasy (Vite 5173)" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 `
  -Profile Private,Public
```

Conferir depois:

```powershell
Get-NetFirewallRule -DisplayName "F1 Fantasy (Vite 5173)" | Get-NetFirewallPortFilter
```

Remover quando não precisar mais:

```powershell
Remove-NetFirewallRule -DisplayName "F1 Fantasy (Vite 5173)"
```

## Jogar com gente FORA da rede

O `wrangler dev` tem um túnel embutido: com ele rodando, tecle **`t`** no terminal
(`[t] start tunnel`). Ele publica o worker num endereço público temporário da Cloudflare, sem
ZeroTier e sem mexer em firewall.

⚠️ **Cuidado, e é um cuidado real:** o túnel expõe **só o worker**, não o app. Para alguém de
fora jogar, o app também precisa estar acessível — e aí a URL do WebSocket deixa de ser a mesma
origem da página. É o caso que a variável `VITE_WS_BASE` cobre:

```
# PowerShell, no terminal do app
$env:VITE_WS_BASE = "wss://<o-que-o-tunel-imprimir>"
npm run dev:rede
```

Publicar o app de verdade (`npm run build` + hospedagem) é outro assunto, e o repositório é
privado — **abrir isso pra internet é decisão do dev**, pelos mesmos motivos do GDD §14.2.

## Se não conectar — diagnóstico na ordem

1. **A página abre no celular?** Não → é rede/firewall (5173), não é o jogo.
2. **Abre, mas o lobby fica "🟠 reconectando…"?** → o proxy não está repassando. Confirme que o
   `npm run sala` está rodando no outro terminal.
3. **Testar sem celular, na própria máquina:** abra `http://192.168.0.13:5173/` em vez de
   `localhost` — **o host muda, e isso já reproduz o problema**. Foi assim que esta correção foi
   validada.
4. **Teste automatizado por qualquer rota**, com os dois terminais no ar:

   ```
   $env:SALA_BASE = "192.168.0.13:5173"
   node scripts/smoke-online.mjs
   ```

   17 cheques; ele fala qual falhou.

## 🔴 "Criar sala" fica em "Criando…" pra sempre — a porta 8787 ocupada

O modo de falha mais caro de diagnosticar desta camada, porque **não produz erro nenhum**.

**O que acontece.** Se a 8787 já estiver ocupada, o `wrangler dev` não reclama: ele sobe na 8788
e imprime `Ready on http://127.0.0.1:8788` no meio de vinte linhas de banner. Mas o proxy do Vite
aponta pra **8787, fixa** (`ALVO_WORKER_DEV` em `src/net/rotas.ts`). O app passa a conversar com
uma porta vazia.

O sintoma depende do que sobrou na 8787:

| o que está na 8787 | o que o jogador vê |
|---|---|
| nada | o proxy devolve 500 → "Não deu pra criar a sala. O servidor está rodando?" |
| um `workerd` meio-morto (aceita a conexão, nunca responde) | **"Criando…" pra sempre** — sem erro, sem log, sem pista |

A segunda linha é a ruim, e é comum: um `wrangler dev` anterior que não morreu por inteiro deixa
um `workerd.exe` órfão em `LISTENING` que não responde a `curl`.

**Como está resolvido (PR 3.3.4).** O `npm run sala` agora tem um pré-voo
(`scripts/checar-porta-sala.ts`) que tenta ESCUTAR na 8787 antes de chamar o wrangler. Se a porta
não estiver livre, ele falha com `exit 1` e explica o que fazer, em vez de deixar o wrangler
escorregar de porta em silêncio. O `wrangler dev` também passou a receber `--port 8787` explícito.

**Se o pré-voo acusar**, no PowerShell:

```
netstat -ano | findstr :8787
taskkill /IM workerd.exe /F
```

E confirme que voltou:

```
curl -Method POST http://localhost:5173/criar-sala     # deve devolver {"codigo":"XXXXXX"}
```

## ⚠️ Duas abas no MESMO navegador não são dois jogadores

Limitação conhecida, registrada no PR 3.3.4 e **ainda não corrigida**.

O token de reentrada mora no `localStorage`, com chave por sala (`f1f:token-sala:<código>`). O
`localStorage` é por ORIGEM, não por aba — então duas abas do mesmo Chrome dividem o mesmo token.
Medido: com o anfitrião já dentro, abrir o link numa aba nova faz ela achar o token dele e
**reentrar como o anfitrião** — as duas abas mostrando o mesmo jogador e a sala contando 1, não 2.

Não afeta jogo real (cada pessoa está no seu navegador). Afeta o TESTE na própria máquina.

**Para testar dois jogadores sozinho:** use dois navegadores diferentes, ou uma janela anônima
para o segundo jogador. Abrir as duas abas na tela de nome **antes** de qualquer um entrar também
funciona, mas é frágil — quem entra por último sobrescreve o token guardado, e é esse que o F5
vai usar.
