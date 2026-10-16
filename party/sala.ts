/**
 * O Durable Object da sala (PR 3.2; ciclo de vida no 3.3.2) — a casca de I/O.
 *
 * Toda a decisão mora em `src/net/servidor-sala.ts`, que é puro e testado sem
 * rede. Aqui só acontece o que exige o runtime: aceitar socket, ler o relógio,
 * persistir, sortear e enviar bytes. É fino de propósito — o que não é testável
 * sem rede tende a não ser testado, então quase nada pode viver aqui.
 *
 * 🔒 `connection.id` é atribuído pelo `partyserver`, nunca pelo cliente: é o que
 * torna o mapa conexão→jogador confiável e o que impede personificação.
 *
 * 🆕 **A SALA NÃO NASCE SOZINHA (3.3.2).** Antes, conectar num nome qualquer
 * criava a sala — por isso "sala não existe" não existia, e `sala-1` servia pra
 * qualquer um. Agora só o `POST /criar-sala` cria, com um código hexadecimal de
 * 6 dígitos sorteado pelo SERVIDOR. Conectar num código que não foi criado (ou
 * que já foi encerrado) devolve `sala-inexistente`.
 *
 * ⚠️ Sem `nodejs_compat` no `wrangler.jsonc`, de propósito — ver o comentário
 * lá. Nada no grafo de imports abaixo toca `node:*`, e isso é VERIFICADO a cada
 * `npm run build` por `scripts/checar-casca-sem-node.ts`. Medido no PR A do
 * spike: nem o `wrangler deploy --dry-run` (só avisa) nem o `npm run test:party`
 * (o pool resolve `node:*`) pegam um import acidental — só aquele script pega.
 */

import { routePartykitRequest, Server, type Connection, type ConnectionContext } from 'partyserver';

import {
  aoConectar,
  aoDesconectar,
  aoPassarOTempo,
  aoReceber,
  criarServidor,
  decidirVida,
  registrarConexoes,
  type EstadoServidor,
  type ResultadoServidor,
} from '../src/net/servidor-sala';
import { estadoDasSeeds } from '../src/net/sala';
import { codigoDeBytes, TAMANHO_CODIGO } from '../src/net/codigo-sala';
import { AMBIENTE_DEV, origemPermitida } from '../src/net/cors';
import { excedeuTetoDeConexoes } from '../src/net/teto-conexoes';
import { JANELA_TETO_MS, type BaldeDeTeto } from '../src/net/rate-limit';
import { avaliarTetoSincronizar } from '../src/net/teto-sincronizar';
import { avaliarTetoComandos, TETO_HASHES } from '../src/net/teto-comandos';
import { ROTA_CRIAR_SALA } from '../src/net/rotas';
import { Limite } from './limite';
import {
  MAX_BYTES_MENSAGEM,
  MAX_ETAPAS,
  N_ETAPAS_CURTA,
  PRAZO_TURNO_MS,
  SLOTS_SEEDS,
} from '../src/net/tipos';

interface Env {
  Sala: DurableObjectNamespace<Sala>;
  /** O balde do teto de criação de sala — um DO por IP. Ver `limite.ts`. */
  Limite: DurableObjectNamespace<Limite>;
  /**
   * Origens autorizadas no `POST /criar-sala`, separadas por vírgula. Vem de
   * `vars` no `wrangler.jsonc` — **nunca literal no código**, porque o domínio
   * de produção é config de deploy e o caminho de túnel/LAN muda de máquina.
   */
  ALLOWED_ORIGINS?: string;
  /**
   * O SEGUNDO sinal do curinga de CORS. Só `'development'` o habilita, e só
   * junto de `ALLOWED_ORIGINS` ausente. Ver `src/net/cors.ts` — existe para
   * que esquecer de configurar em produção NÃO caia em `*`.
   */
  ENVIRONMENT?: string;
}

/**
 * 🔒 **A classe do limitador precisa ser exportada DAQUI**, do módulo `main` do
 * `wrangler.jsonc` — é onde o runtime procura `class_name`. Defini-la em
 * `limite.ts` e re-exportar mantém este arquivo no tamanho que o docblock do
 * topo promete ("é fino de propósito") sem quebrar o binding.
 */
export { Limite };

/** De quanto em quanto tempo o servidor confere prazos e o ciclo de vida. */
const INTERVALO_TIQUE_MS = 5_000;

/** Tentativas de sortear um código livre antes de desistir. Ver o `fetch` abaixo. */
const TENTATIVAS_CODIGO = 3;

export class Sala extends Server<Env> {
  static options = { hibernate: true };

  private estado: EstadoServidor | null = null;
  /** Cinto e suspensório do `encerrar`: uma vez encerrada, não ressuscita nesta instância. */
  private encerrada = false;

  /**
   * Carrega o estado persistido. **Devolve `null` se a sala não existe** — e
   * isso tem de ser checado em TODO ponto de entrada, não só no `onConnect`:
   * um DO hiberna e acorda ao receber mensagem, e uma conexão aberta antes de
   * um reset continua viva por um instante.
   */
  private async carregar(): Promise<EstadoServidor | null> {
    if (this.encerrada) return null;
    if (this.estado !== null) return this.estado;
    const salvo = await this.ctx.storage.get<EstadoServidor>('estado');
    this.estado = salvo ?? null;
    return this.estado;
  }

  /**
   * Cria a sala, se ainda não existir. Devolve `false` quando o código já está
   * em uso — quem chama sorteia outro.
   *
   * A `seedMestre` é gerada UMA vez e gravada: regerá-la depois de um restart
   * trocaria a partida no meio. Ela nunca sai daqui (o broadcast leva só a
   * `seedDraft` derivada).
   */
  private async criar(codigo: string, agora: number): Promise<boolean> {
    if ((await this.carregar()) !== null) return false;
    const semente = new Uint32Array(1);
    crypto.getRandomValues(semente);

    // 🔑 As seeds do CAMPEONATO (3.5.1, mecanismo `B-indep`): 11 slots
    // INDEPENDENTES — `MAX_ETAPAS` etapas + o calendário. Sorteio SEPARADO do
    // da `seedMestre` acima, e o 11º slot NÃO é `seedsEtapas[0]` reusado:
    // derivá-las da mestra compraria zero contra a pendência 0(i), porque
    // recomposta a mestra pela `seedDraft` do lobby todas cairiam juntas.
    //
    // ⚠️ `Array.from` NÃO é estilo: `estadoDasSeeds` valida com `Array.isArray`
    // (`src/net/sala.ts`), e um `Uint32Array` reprova ali — a sala reidrataria
    // como CORROMPIDA e passaria a recusar todo mundo.
    // 🔑 **MEDIDO no workerd pelo PR B** (`party/seeds.test.ts`, bloco R4), não
    // argumentado: o `Uint32Array` SOBREVIVE ao round-trip do storage como
    // `Uint32Array`. Ou seja, o caminho acima é real — ele volta íntegro e
    // mesmo assim reprova no `Array.isArray`.
    //
    // 🔑 Esta nota dizia "é persistido via JSON, e um `Uint32Array` round-trip
    // vira `{"0":…}`". **Refutado pela medição da pendência 0(p) (2026-08-19):**
    // o DO é `new_sqlite_classes` e `ctx.storage.put` grava V8-serializado na
    // `_cf_KV`, não JSON — foi por isso que `scripts/despejar-seeds.ts` precisou
    // do `node:v8`. JSON nunca esteve no caminho, e o desfecho real é recusa
    // explícita, não seeds sumindo em silêncio.
    const slots = new Uint32Array(SLOTS_SEEDS);
    crypto.getRandomValues(slots);
    const todas = Array.from(slots);

    // 🔒 `N_ETAPAS_CURTA` explícito, e é a CASCA que o declara (decisão do dev,
    // 2026-08-20): todo jogo online é campeonato de 5 etapas — a corrida avulsa
    // online foi o degrau para chegar aqui, não um modo que sobrevive. O
    // parâmetro é obrigatório de propósito, para que este valor não possa ser
    // herdado de um default: é ele que decide quando o campeonato ACABA.
    this.estado = criarServidor(
      codigo,
      semente[0],
      'dificil',
      agora,
      {
        etapas: todas.slice(0, MAX_ETAPAS),
        calendario: todas[MAX_ETAPAS],
      },
      N_ETAPAS_CURTA,
    );
    await this.ctx.storage.put('estado', this.estado);
    await this.ctx.storage.setAlarm(agora + INTERVALO_TIQUE_MS);
    return true;
  }

  /**
   * Encerra a sala: descarta estado, log e código, e desconecta quem sobrou.
   *
   * ⚠️ A ordem importa e cada passo tem motivo. **Avisa antes de fechar**, pra
   * que a tela diga "esta sala foi encerrada" em vez de virar "reconectando…"
   * para sempre. **Apaga o alarme** — sem isso o próximo tique acordaria um DO
   * meio-morto e regravaria o estado, ressuscitando o código que acabou de ser
   * liberado. E zera `this.estado` na memória, porque o objeto pode continuar
   * vivo depois do `deleteAll`.
   */
  private async encerrar(): Promise<void> {
    // 🔒 PRIMEIRA linha, antes de qualquer `await`: se um comando em voo
    // pegasse `this.estado` ainda em cache, `aplicar()` regravaria o estado
    // DEPOIS do `deleteAll` — e como o alarme já foi apagado e `aplicar` nunca
    // reagenda, sobraria uma sala viva, com estado velho e sem relógio nenhum
    // para matá-la nem para expirar turno.
    this.estado = null;
    this.encerrada = true;
    for (const conexao of this.getConnections()) {
      try {
        conexao.send(JSON.stringify({ tipo: 'sala-encerrada' }));
        conexao.close(1000, 'sala encerrada');
      } catch {
        // Conexão já morta: nada a fazer, o reset segue.
      }
    }
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  private async aplicar(resultado: ResultadoServidor): Promise<void> {
    // Grava só quando o estado REALMENTE mudou. `quem-sou`, `sincronizar` e
    // toda resposta de erro devolvem o mesmo objeto (os redutores preservam a
    // identidade nas recusas, por projeto do 3.1a) — persistir em toda
    // mensagem seria amplificação de escrita de graça, e barata de explorar.
    const mudou = resultado.estado !== this.estado;
    this.estado = resultado.estado;
    if (mudou) await this.ctx.storage.put('estado', resultado.estado);
    for (const envio of resultado.envios) {
      const texto = JSON.stringify(envio.mensagem);
      if (envio.para === null) this.broadcast(texto);
      else this.getConnection(envio.para)?.send(texto);
    }
  }

  /** Avisa e fecha — o caminho de quem chegou num código que não existe. */
  private recusar(connection: Connection): void {
    connection.send(JSON.stringify({ tipo: 'erro', erro: 'sala-inexistente' }));
    connection.close(1000, 'sala inexistente');
  }

  /**
   * A sala é jogável? **Não**, se ela é pós-3.5.1 e perdeu as seeds do
   * campeonato na reidratação.
   *
   * 🔒 **Recusar é o comportamento correto, e re-semear seria o bug.** Uma
   * sala que perdeu as seeds no meio do campeonato só tem dois caminhos:
   * parar, ou sortear de novo — e sortear de novo faz o jogador correr uma
   * corrida diferente da que ele atestou, em silêncio. É o requisito (a) do
   * baseline entrando pela porta do conserto. Por isso `criar()` continua
   * sendo o ÚNICO sítio que sorteia, e ele só roda com o storage vazio
   * (`carregar() !== null` barra) — nada aqui cura, nada aqui re-semeia.
   *
   * ⚠️ Reusa `sala-inexistente` em vez de um código próprio: pro jogador o
   * desfecho é o mesmo (a sala não dá pra jogar) e um código novo no fio
   * exigiria mexer no cliente, que está fora do escopo do 3.5.1. Quem precisa
   * do detalhe é o operador, e ele tem `relatorioDeSeeds`.
   *
   * ⚠️ **Loga (aviso A6 da revisão).** Reusar `sala-inexistente` no fio é
   * aceitável; o servidor não registrar nada é que não era. Sem o log, a sala
   * recusa todo mundo e ninguém descobre por quê — `relatorioDeSeeds` só ajuda
   * quem já suspeitou. Isto aparece no `wrangler tail` e não toca no protocolo.
   */
  private jogavel(estado: EstadoServidor): boolean {
    const seeds = estadoDasSeeds(estado.sala);
    if (seeds.tipo !== 'corrompida') return true;
    console.error(
      `[sala ${estado.sala.salaId}] recusando conexões: seeds corrompidas — ${seeds.motivo}`,
    );
    return false;
  }

  /**
   * Cria a sala. **Método RPC, não rota HTTP** — e a diferença é de segurança,
   * não de estilo.
   *
   * 🔴 A primeira versão usava `onRequest`, e o roteador do `partyserver` casa
   * QUALQUER caminho sob `/parties/<ns>/<nome>/…` (ele exige `>=`, não
   * igualdade). Ou seja, `POST /parties/sala/000000/criar` chegava aqui e
   * criava a sala com o código que o atacante quisesse — derrubando de uma vez
   * "é o servidor que sorteia", a validação de formato e a privacidade do
   * código por enumeração. RPC só é alcançável de dentro do worker.
   *
   * O código vem por ARGUMENTO em vez de `this.name`: não depende de o
   * `partyserver` ter inicializado o nome numa entrada RPC.
   */
  async criarSeNova(codigo: string, agora: number): Promise<boolean> {
    return this.criar(codigo, agora);
  }

  /**
   * Ids de conexões RECUSADAS por política, aguardando o `onClose` que o
   * próprio `close()` provoca. Ver `recusarPorPolitica` e a saída cedo do
   * `onClose`.
   */
  private recusadas = new Set<string>();

  /**
   * Baldes do teto de `sincronizar`, por conexão (PR H3, item S7).
   *
   * 🔒 **SÓ EM MEMÓRIA — nunca no `ctx.storage`, e isso é o ponto.** O comando
   * que este teto limita é justamente o que devolve o snapshot inteiro; gravar
   * um balde por comando trocaria amplificação de LEITURA por amplificação de
   * ESCRITA, que `alarm()` e `registrarAtestado` já nomeiam como "barata de
   * explorar". A janela de 2 s fica muito abaixo do horizonte de despejo do DO,
   * então perder o balde num despejo é indistinguível de ele ter expirado.
   *
   * 🔒 **O mapa ENCOLHE no `onClose`** — mesma disciplina do `delete` no
   * `recusadas` logo acima. Sem isso ele seria um vazamento proporcional ao
   * churn de conexões: exatamente o defeito que este PR existe para não criar.
   */
  private baldesSincronizar = new Map<string, BaldeDeTeto>();

  /**
   * O comando é um `sincronizar` que deve ser RECUSADO por teto?
   *
   * ⚠️ **Faz um `JSON.parse` que o `aoReceber` refará.** É custo conhecido e
   * aceito: a alternativa seria mudar a assinatura de `aoReceber` para receber
   * o comando já parseado, o que arrastaria o redutor puro e os testes dele
   * para dentro deste PR. A entrada já está limitada a `MAX_BYTES_MENSAGEM`
   * pela guarda de cima, então o parse extra é O(8 KiB) no pior caso.
   *
   * 🔒 **Falha ABERTO: JSON inválido não é problema deste teto.** Quem responde
   * `comando-invalido` é o `aoReceber`, e engolir aqui o que ele deveria
   * recusar mudaria o protocolo por efeito colateral de um limitador.
   */
  private recusarSincronizar(tipo: unknown, conexaoId: string, agora: number): boolean {
    if (tipo !== 'sincronizar') return false;
    const veredicto = avaliarTetoSincronizar(this.baldesSincronizar.get(conexaoId) ?? null, agora);
    this.baldesSincronizar.set(conexaoId, veredicto.balde);
    return !veredicto.permitido;
  }

  /**
   * O `tipo` da mensagem, sem decidir nada com ele. `undefined` para JSON
   * inválido ou sem `tipo`.
   *
   * 🔒 **UM parse para os DOIS tetos — e isto REDUZIU o custo que o H3 tinha
   * assumido.** O docblock acima registrava "um `JSON.parse` a mais" como custo
   * conhecido, porque `recusarSincronizar` parseava por conta própria. Com o S3
   * precisando do mesmo `tipo` para saber quem isentar, parsear duas vezes
   * seria pagar três parses por mensagem. Agora é um, aqui, mais o do
   * `aoReceber`.
   *
   * 🔒 **Falha ABERTO: JSON inválido não é problema de teto nenhum.** Quem
   * responde `comando-invalido` é o `aoReceber`; engolir aqui o que ele deveria
   * recusar mudaria o protocolo por efeito colateral de um limitador.
   */
  private tipoDaMensagem(mensagem: string): unknown {
    try {
      return (JSON.parse(mensagem) as { tipo?: unknown }).tipo;
    } catch {
      return undefined;
    }
  }

  /**
   * Baldes do teto GERAL de comandos, por conexão (PR H4, item S3).
   *
   * 🔒 **Mapa SEPARADO do `baldesSincronizar`, de propósito.** Fundir os dois
   * faria um `sincronizar` recusado pelo teto do H3 consumir também a cota de
   * jogo, e a recusa de um limitador viraria insumo do outro — acoplamento que
   * ninguém escolheu e que nenhum teste apanharia. **É a mesma decisão que a
   * ORDEM das guardas no `onMessage` implementa** (ver `recusarPorTetoDeComandos`
   * logo abaixo): separar os mapas e isentar `sincronizar` da contagem são as
   * duas metades de uma coisa só. Mexer numa sem a outra reabre o acoplamento.
   *
   * 🔒 **SÓ EM MEMÓRIA e ENCOLHE no `onClose`** — mesma disciplina do
   * `baldesSincronizar` e do `recusadas`. Sem o `delete`, este mapa cresceria
   * com o churn de conexões: um vazamento proporcional ao abuso, que é
   * exatamente o defeito que um limitador existe para NÃO criar. Foi a mutação
   * M5 do H3 que provou que essa linha precisa de teste próprio — ela
   * sobreviveu à suíte inteira na primeira rodada.
   */
  private baldesComandos = new Map<string, BaldeDeTeto>();
  private baldesHashes = new Map<string, BaldeDeTeto>();

  private recusarHash(conexaoId: string, agora: number): boolean {
    const resultado = avaliarTetoComandos(
      this.baldesHashes.get(conexaoId) ?? null,
      agora,
      TETO_HASHES,
    );
    this.baldesHashes.set(conexaoId, resultado.balde);
    return !resultado.permitido;
  }

  /**
   * Esta conexão estourou o teto de COMANDOS DE JOGO?
   *
   * 🔴 **A redação anterior deste docblock dizia "Conta TODA mensagem", e era
   * FALSA — corrigida no lugar, achado da revisão do H4.** Ela descrevia uma
   * intenção; o código sempre contou outra coisa. Prosa em presente do
   * indicativo que não confere com o sítio é a classe que a revisão do PR 7
   * pegou duas vezes, e ela não vai para a `main`.
   *
   * 📏 **O QUE ELE CONTA, exatamente:** mensagem que é **string**, que cabe em
   * `MAX_BYTES_MENSAGEM` e que **não é `sincronizar`**. Ou seja, o comando de
   * jogo — o que chega ao `aoReceber`, aceito ou recusado por ele.
   *
   * 🔒 **AS TRÊS ISENÇÕES SÃO DELIBERADAS — decisão do dev (2026-09-02), e cada
   * uma já tem guarda PRÓPRIA antes desta:**
   * - **frame binário** — rejeitado inteiro em `typeof message !== 'string'`;
   * - **string acima do teto de bytes** — `MAX_BYTES_MENSAGEM`, que responde
   *   `escolha-grande-demais`;
   * - **`sincronizar`** — tem o teto do H3, com janela e rajada próprias.
   *
   * 🔑 **O motivo de não somar, nas palavras da decisão:** somar puniria o
   * jogador legítimo cujo cliente mandou um `sincronizar` seguido de uma
   * jogada — a recusa de um limitador viraria insumo do outro. **Os três não
   * ficam sem teto; ficam sob o teto QUE É DELES.**
   * ⚠️ **A consequência aceita, dita por inteiro:** este teto não é a defesa
   * contra enxurrada de lixo binário nem de mensagem gigante. Quem for medir a
   * superfície de flood tem de olhar as três guardas, não só esta.
   *
   * ⚠️ **Roda DEPOIS do teto de `sincronizar` e ANTES do `carregar()`.** A
   * posição é o que IMPLEMENTA as isenções acima — não é detalhe de ordem. E
   * ficar antes do `carregar()` segue o argumento das outras guardas: é O(1),
   * não lê storage, e checá-lo depois seria pagar a leitura para descartá-la.
   */
  private recusarPorTetoDeComandos(conexaoId: string, agora: number): boolean {
    const veredicto = avaliarTetoComandos(this.baldesComandos.get(conexaoId) ?? null, agora);
    this.baldesComandos.set(conexaoId, veredicto.balde);
    return !veredicto.permitido;
  }

  /**
   * Recusa por POLÍTICA (origem não autorizada ou teto de conexões estourado) —
   * e é diferente de `recusar()`, que trata sala inexistente.
   *
   * ⚠️ **NÃO É POSSÍVEL RECUSAR ANTES DO `accept()`, e isso é da plataforma,
   * não escolha.** No `partyserver@0.5.10` o `fetch` do `Server` faz
   * `accept` → `await this.onConnect(...)` → `new Response(null, {status: 101})`.
   * Quando o `onConnect` roda, o socket **já foi aceito** e o 101 já está
   * decidido — **medido: 3 upgrades ⇒ `101 101 101`, inclusive o recusado.**
   * Rejeitar antes exigiria `onBeforeConnect`, que roda no worker, FORA do DO,
   * onde `getConnections()` não existe e o teto seria inimplementável.
   *
   * 🔒 **Fecha com 4403, na faixa de aplicação (4000-4999).** `1000` é
   * "fechamento normal" e é o que `recusar()` usa para sala inexistente;
   * reusá-lo tornaria as duas recusas indistinguíveis para o cliente.
   * ⚠️ **Limitação conhecida, dita por inteiro: o cliente de hoje NÃO
   * distingue 4403** — vê um fechamento e entra em "reconectando…". Não
   * mandamos `{tipo:'erro'}` de propósito: o único código existente que serviria
   * é `sala-inexistente`, e `src/ui/useSalaOnline.ts:227` **APAGA o token de
   * reentrada** ao recebê-lo, punindo um jogador legítimo que só bateu no teto.
   * O conserto é UI e está registrado como pendência.
   */
  private recusarPorPolitica(connection: Connection, motivo: string): void {
    this.recusadas.add(connection.id);
    connection.close(4403, motivo);
  }

  async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    // O attachment sobrevive à hibernação do Durable Object.
    connection.setState({ identificarAte: Date.now() + 60_000 });
    // 🔒 AS DUAS GUARDAS VÊM ANTES DO `carregar()`, e é o mesmo argumento que o
    // PR H1 escreveu para pôr o teto de IP antes de sortear código: as duas são
    // O(1), não leem storage, e checá-las depois seria pagar o custo para então
    // recusar. Ordem: Origin → teto → estado.
    //
    // 🔑 **O `Origin` chega no `ctx.request`, MEDIDO e não suposto.** O
    // `partyserver` monta `ctx = { request }` com a requisição do upgrade.
    // Sonda de 2026-09-01: os cabeçalhos chegam intactos, e `null` quando o
    // cliente não manda nenhum.
    //
    // ⚠️ **O QUE A CHECAGEM DE ORIGEM COMPRA AQUI, dito com precisão:** ela
    // impede uma PÁGINA hospedada noutra origem de abrir a sala no navegador de
    // quem a visita. **Não impede script nenhum** — `Origin` é cabeçalho, e um
    // cliente não-navegador o forja ou o omite à vontade. Mesma ressalva que
    // `src/net/cors.ts` já carrega para o `POST /criar-sala`.
    // ⚠️ **E ela RECUSA cliente não-navegador quando há allowlist configurada**,
    // porque `Origin` ausente não está em lista nenhuma. É o caso do
    // `scripts/smoke-online.mjs:32`, que usa o `WebSocket` global do Node e não
    // manda `Origin`: hoje sobrevive porque `npm run sala` passa
    // `ENVIRONMENT:development` com allowlist vazia ⇒ curinga. Contra um deploy
    // com allowlist real, ele precisa de origem explícita.
    if (
      origemPermitida(
        ctx.request.headers.get('Origin'),
        this.env.ALLOWED_ORIGINS ?? '',
        this.env.ENVIRONMENT === AMBIENTE_DEV,
      ) === null
    ) {
      this.recusarPorPolitica(connection, 'origem nao autorizada');
      return;
    }

    // 🔒 `>` e não `>=`: a conexão que acabou de chegar JÁ está contada aqui.
    // Ver `excedeuTetoDeConexoes`, onde a medição está registrada.
    if (excedeuTetoDeConexoes(this.quantasConexoes())) {
      this.recusarPorPolitica(connection, 'sala lotada');
      return;
    }

    const estado = await this.carregar();
    if (estado === null || !this.jogavel(estado)) {
      this.recusar(connection);
      return;
    }
    const agora = Date.now();
    await this.aplicar(
      aoConectar(registrarConexoes(estado, this.quantasConexoes(), agora), connection.id),
    );
    await this.ctx.storage.setAlarm(agora + INTERVALO_TIQUE_MS);
  }

  /** Conexões abertas agora — o dado que a carência de vazio consome. */
  private quantasConexoes(): number {
    return [...this.getConnections()].length;
  }

  async onMessage(connection: Connection, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    // Teto ANTES do `JSON.parse`: `MAX_BYTES_ESCOLHA` só age depois de parsear e
    // só para `escolher`, então sem isto uma mensagem de megabytes seria
    // desserializada antes de qualquer defesa.
    if (message.length > MAX_BYTES_MENSAGEM) {
      connection.send(JSON.stringify({ tipo: 'erro', erro: 'escolha-grande-demais' }));
      return;
    }
    // 🔒 O teto de `sincronizar` vem ANTES do `carregar()`, e é o mesmo
    // argumento das duas guardas do `onConnect`: ele é O(1), não lê storage, e
    // checá-lo depois seria pagar a leitura para então descartá-la — que é
    // justamente o custo que este teto existe para não pagar.
    // ⚠️ **Recusa em SILÊNCIO, de propósito.** Responder `{tipo:'erro'}` daria
    // ao atacante uma resposta por comando (barato, mas não zero) e, no cliente
    // real, um erro que ele não sabe tratar — o mesmo raciocínio que manteve o
    // `4403` do H2 sem `{tipo:'erro'}`. O comando seguinte, fora da janela,
    // volta a ser atendido.
    const tipo = this.tipoDaMensagem(message);
    if (this.recusarSincronizar(tipo, connection.id, Date.now())) return;
    // 🔒 O teto GERAL (S3). Vem depois do de `sincronizar` para que aquele
    // comando continue governado pela sua própria janela, e antes do
    // `carregar()` pelo mesmo motivo que ele: é O(1) e não lê storage.
    //
    // ⚠️ **RESPONDE, não cala — ao contrário do teto do H3.** Lá o silêncio era
    // seguro porque o cliente real nunca manda `sincronizar`; aqui os comandos
    // são os que o jogador manda de verdade, e engolir um `escolher` faria a
    // jogada sumir enquanto o cronômetro de turno corre. O porquê inteiro está
    // no docblock de `comandos-demais`, em `src/net/protocolo.ts`.
    // 🔒 **`sincronizar` NÃO consome a cota de jogo — isenção COMPLETA, decisão
    // do dev (2026-09-02).** Sair cedo na recusa do H3 não bastava: o
    // `sincronizar` ACEITO (o primeiro de cada janela) caía aqui e consumia a
    // cota — exatamente o caso que a decisão nomeia, "um `sincronizar` seguido
    // de uma jogada". Achado ao escrever a cerca em `party/comandos.test.ts`,
    // que nasceu VERMELHA por valor.
    if (
      (tipo === 'hash' && this.recusarHash(connection.id, Date.now())) ||
      (tipo !== 'sincronizar' &&
        tipo !== 'hash' &&
        this.recusarPorTetoDeComandos(connection.id, Date.now()))
    ) {
      connection.send(JSON.stringify({ tipo: 'erro', erro: 'comandos-demais' }));
      return;
    }
    const estado = await this.carregar();
    if (estado === null || !this.jogavel(estado)) {
      // Comando em voo de uma conexão que sobreviveu ao reset — ou sala cujas
      // seeds se perderam (ver `jogavel`).
      this.recusar(connection);
      return;
    }
    // O token de reentrada é gerado AQUI, na casca: o redutor é puro e não
    // sorteia. 128 bits de `crypto.randomUUID` — derivar de
    // `deriveSeed(seedMestre, …)` daria 32 bits, pouco para um segredo que vale
    // a identidade do jogador. Só é consumido num `entrar` aceito.
    await this.aplicar(aoReceber(estado, connection.id, message, Date.now(), crypto.randomUUID()));
  }

  async onClose(connection: Connection): Promise<void> {
    this.baldesHashes.delete(connection.id);
    // ✅ **`close()` NO `onConnect` DISPARA `onClose` — MEDIDO, não suposto.**
    // Sonda de 2026-09-01: a sequência observada é `["onConnect-recusa",
    // "onClose"]`. Sem esta linha, todo socket recusado por política
    // atravessaria `aoDesconectar` + `registrarConexoes` + `aplicar` para um id
    // que **nunca passou por `aoConectar`**.
    //
    // 🔴 **E AQUI VAI A PARTE QUE EU AFIRMEI ERRADO E MEDI DEPOIS — fica
    // escrita porque a versão falsa quase entrou no lugar dela.** A primeira
    // redação dizia que a falta desta guarda custava *"uma escrita de storage
    // POR SOCKET RECUSADO"*. **Falso, e refutado por medição:** com e sem a
    // guarda, o contador de `put('estado')` dá **`1 → 1`** numa sala com
    // conexão legítima e **`0 → 0`** numa sala vazia, após 10 recusas em série.
    // 🔑 **O motivo é uma propriedade que este arquivo já documentava no
    // `alarm()`:** `registrarConexoes` **preserva a IDENTIDADE** quando
    // `vazio === jaVazio`, e `aplicar` só grava quando a referência muda. O
    // caminho da recusa nunca quebra essa igualdade de forma persistente, então
    // o `onClose` da conexão recusada é **inócuo hoje**.
    //
    // 🔒 **A guarda FICA, e o motivo é o que ela é de fato: barreira, não
    // conserto.** Ela impede que a conexão recusada seja tratada como uma
    // desconexão real — o que hoje não custa nada e passa a custar assim que
    // alguém mexer em `registrarConexoes`, no `aoDesconectar` ou no critério de
    // `aplicar`. **Não a leia como "fechou um bug medido": a mutação M4 (tirar
    // esta linha) SOBREVIVE à suíte inteira, e isso está registrado na tabela
    // de mutações em vez de maquiado com um teste que não a pega.**
    //
    // 🔒 **`delete` e não só `has`:** o `Set` tem de encolher junto, senão vira
    // vazamento de memória proporcional ao ataque — o avesso do que um
    // limitador deve fazer sob pressão.
    // O balde morre com a conexão — ver o docblock de `baldesSincronizar`.
    // Fica ANTES da saída cedo das recusadas: um socket recusado por política
    // também pode ter deixado balde para trás.
    this.baldesSincronizar.delete(connection.id);
    // O balde do teto geral (S3) morre junto, pelo mesmo motivo e no mesmo
    // lugar — ver o docblock de `baldesComandos`.
    this.baldesComandos.delete(connection.id);
    if (this.recusadas.delete(connection.id)) return;
    const estado = await this.carregar();
    if (estado === null) return;
    const agora = Date.now();
    const r = aoDesconectar(estado, connection.id, agora);
    // Só REGISTRA que ficou vazia; quem decide encerrar é o alarme, com a
    // carência. Decidir aqui foi o defeito: um F5 ou trocar de app no celular
    // estando sozinho matava a sala na hora, e a reconexão do 3.2.1 virava
    // letra morta justo no caso em que ela mais importa.
    await this.aplicar({
      ...r,
      estado: registrarConexoes(r.estado, this.quantasConexoes(), agora),
    });
  }

  /**
   * O relógio do servidor: expiração de turno **e** ciclo de vida da sala.
   * É daqui que sai a decisão de encerrar — nunca do cliente.
   */
  async alarm(): Promise<void> {
    const estado = await this.carregar();
    if (estado === null) return;

    const agora = Date.now();
    for (const conexao of [...this.getConnections<{ identificarAte?: number }>()]) {
      if (estado.jogadorPorConexao[conexao.id] !== undefined) continue;
      const prazo = conexao.state?.identificarAte;
      if (prazo === undefined) conexao.setState({ identificarAte: agora + 60_000 });
      else if (agora >= prazo) conexao.close(4408, 'prazo de identificacao vencido');
    }
    const atualizado = registrarConexoes(estado, this.quantasConexoes(), agora);
    if (decidirVida(atualizado, agora).tipo === 'encerrar') {
      await this.encerrar();
      return;
    }

    // 🔑 SEM `if` aqui — decidir é do NÚCLEO (PR 3/4). Este ponto tinha um
    // `if (concluidaEm === null)` antes de chamar `aoPassarOTempo`, com o
    // comentário de que o tique custaria "~120 escritas em storage e 120
    // broadcasts" durante a janela. **A estimativa era falsa, e agora está
    // medida** (`src/net/barreira-corrida.test.ts`): com o draft concluído,
    // `deQuemEhAVez` devolve `[]`, `aoPassarOTempo` devolve o estado com a
    // MESMA REFERÊNCIA e sem envios, e `aplicar` só grava quando a referência
    // muda. Custo real: zero escritas, zero broadcasts.
    //
    // O `if` precisava sair de qualquer forma: é `aoPassarOTempo` que avalia a
    // BARREIRA DO FIM DA CORRIDA no tique, e com o gate antigo o timeout de
    // quem nunca atesta nunca seria avaliado — a sala ficaria com
    // `concluidaEm` null até morrer pela carência de vazio.
    // 🔒 O GATE ENTRA AQUI, E SÓ AQUI (aviso A2 da revisão). `jogavel` cobria
    // `onConnect` e `onMessage`, mas não o relógio — e `aoPassarOTempo` RESOLVE
    // TURNOS VENCIDOS (`expirarNaSala`). Numa sala corrompida com o draft em
    // andamento, ninguém conseguia conectar nem mandar comando, e o tique de
    // 5 s ia expirando turno atrás de turno: **o draft se jogava inteiro
    // sozinho**, numa sala que ninguém podia ver.
    //
    // ⚠️ O gate cobre SÓ o `aoPassarOTempo`. `registrarConexoes`, `decidirVida`
    // e `encerrar` ficam de fora de propósito — a sala corrompida precisa
    // continuar podendo MORRER pela carência de vazio, senão vira zumbi que
    // recusa todo mundo e nunca libera o código.
    //
    // 🔴 **ATÉ O CONSERTO DA 0(s), O PARÁGRAFO ACIMA ERA PROMESSA QUE ESTE
    // CÓDIGO NÃO CUMPRIA — e o `else` abaixo é o que o torna verdadeiro.**
    // A pendência 0(s) foi exatamente o buraco entre a intenção e o efeito:
    // `registrarConexoes` produz um objeto NOVO com `vazioDesde = agora`, mas
    // quem PERSISTE é o `aplicar`, e ele só era chamado no ramo jogável. Numa
    // sala corrompida o campo nunca chegava ao storage, o tique seguinte relia
    // `null`, e `agora - agora = 0` para sempre: **a carência de vazio nunca
    // começava a correr.** Suspeitado por leitura em 2026-08-19, CONFIRMADO
    // por execução no PR C (`party/alarme.test.ts`, três tiques).
    //
    // 🔑 **A nuance que a medição acrescentou, e que o conserto respeita:** não
    // era "toda sala corrompida vira zumbi". Uma sala corrompida cujo
    // `vazioDesde` JÁ estava gravado sempre morreu normalmente — é o teste MD.
    // O zumbi era só quem se corrompia **enquanto ainda tinha conexões**, o
    // caso em que o campo precisaria ser escrito pela primeira vez. Por isso o
    // conserto é persistir o registro de conexões, e **não** encurtar a vida da
    // sala corrompida: um `encerrar()` incondicional aqui mataria também o caso
    // que já funcionava.
    //
    // 🔴 **A GUARDA `vazioDesde !== null` NÃO É REDUNDANTE — sem ela o conserto
    // reintroduz o zumbi pela direção OPOSTA. Foi bloqueante de revisão.**
    //
    // `registrarConexoes` muda o campo nas DUAS direções: grava `agora` quando
    // a sala fica vazia e **`null`** quando deixa de estar. Um `else` que
    // persistisse os dois sentidos gravaria `vazioDesde: null` de forma durável
    // sempre que houvesse conexão contada no tique — e numa sala corrompida
    // isso é fácil: `onConnect`/`onMessage` RECUSAM o cliente, mas o socket só
    // é fechado quando ele **manda** alguma coisa; um cliente conectado e
    // quieto continua em `getConnections()`. O efeito seria: sala corrompida
    // que antes morria no primeiro tique quieto passa a ter a carência
    // REINICIADA a cada reconexão, para sempre.
    //
    // 🔑 **É exatamente o caso que a nuance da 0(s) manda preservar** — sala
    // corrompida com `vazioDesde` já gravado sempre morreu normalmente (teste
    // MD), e o conserto quase o quebrou pelo lado oposto ao que se temia.
    // Persistir **só a direção que INICIA o relógio** conserta a 0(s) e deixa
    // a inércia anterior intacta na direção que o zeraria.
    //
    // 🔒 E é o certo semanticamente: uma sala corrompida recusa todo mundo, seu
    // único destino legítimo é morrer, então conexão contada não pode comprar
    // sobrevida para ela.
    //
    // ⚠️ **Sem amplificação de escrita, e agora a frase é verdadeira nas duas
    // direções:** `registrarConexoes` preserva a IDENTIDADE quando
    // `vazio === jaVazio` e `aplicar` só grava quando a referência muda, então
    // o `else` grava **uma vez**, na transição para vazio, e fica mudo depois.
    // (A redação anterior afirmava isso como "medido" cobrindo só metade dos
    // casos — aviso A1 da mesma revisão.)
    //
    // 🔒 **Por que aqui e não logo depois do `registrarConexoes`** (a forma
    // simétrica, considerada e descartada): lá a escrita aconteceria também na
    // sala que `decidirVida` vai encerrar no mesmo tique, e o gate deixaria de
    // ser o único ponto que decide o que fazer com a sala não jogável.
    if (this.jogavel(atualizado)) {
      await this.aplicar(aoPassarOTempo(atualizado, agora, PRAZO_TURNO_MS));
    } else if (atualizado.sala.vazioDesde !== null) {
      await this.aplicar({ estado: atualizado, envios: [] });
    }
    await this.ctx.storage.setAlarm(agora + INTERVALO_TIQUE_MS);
  }
}

/**
 * Os cabeçalhos de CORS do `POST /criar-sala`, POR REQUISIÇÃO.
 *
 * 🔴 **Era uma constante com `Access-Control-Allow-Origin: '*'` até o PR H1.**
 * Virou função porque a resposta agora depende do `Origin` que chegou e da
 * configuração do deploy — ver `src/net/cors.ts`, que é onde a regra mora.
 *
 * 🔒 **`Vary: Origin` é OBRIGATÓRIO junto do eco**, e não é ornamento: sem ele,
 * qualquer cache intermediário pode servir a uma origem a resposta liberada
 * para outra, o que anula a allowlist sem deixar rastro.
 *
 * Objeto VAZIO significa recusa — em CORS não existe negação explícita; o
 * navegador bloqueia justamente na ausência do cabeçalho.
 */
function cabecalhosCors(request: Request, env: Env): Record<string, string> {
  const permitida = origemPermitida(
    request.headers.get('Origin'),
    env.ALLOWED_ORIGINS ?? '',
    env.ENVIRONMENT === AMBIENTE_DEV,
  );
  if (permitida === null) return {};
  return {
    'Access-Control-Allow-Origin': permitida,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  };
}

/**
 * A chave do teto: o IP que a Cloudflare atribuiu à requisição.
 *
 * 🔒 **`CF-Connecting-IP` é escrito pela BORDA e sobrescreve o que o cliente
 * mandar** — é por isso que ele serve de chave e um `X-Forwarded-For` não
 * serviria (esse o cliente forja à vontade).
 *
 * 🔑 **Ausência NÃO rejeita, e a escolha é deliberada.** Atrás da Cloudflare o
 * cabeçalho está sempre lá; faltar significa caminho anormal — mas rejeitar
 * quebraria `wrangler dev` em qualquer runtime que não o preencha, e um
 * limitador que impede o dev de jogar localmente seria removido na primeira
 * sexta-feira. Cai num balde PRÓPRIO e COMPARTILHADO: continua limitado, sem
 * contaminar o balde de nenhum IP real.
 * ⚠️ **O preço, dito por inteiro:** se um dia muitas requisições legítimas
 * chegarem sem IP, elas dividem um teto só e se atrapalham. Hoje não acontece;
 * é o modo de falha a vigiar se o worker sair de trás da borda.
 */
function chaveDoTeto(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'sem-ip';
}

/** `A3F9C2` — sorteado aqui, na casca, porque `src/net/` não sorteia nada. */
function sortearCodigo(): string {
  const bytes = new Uint8Array(TAMANHO_CODIGO / 2);
  crypto.getRandomValues(bytes);
  return codigoDeBytes(bytes);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    /**
     * Cria uma sala e devolve o código. **É o servidor que sorteia** — se o
     * cliente escolhesse, escolheria `000000`, e a privacidade do código
     * acabaria no primeiro jogador esperto.
     *
     * Colisão em 16,7 milhões é desprezível, mas o retry existe e é LIMITADO:
     * três tentativas falharem não é azar, é sinal de que algo está quebrado —
     * e um laço infinito esconderia isso.
     */
    // Pré-voo do CORS: o app pode estar noutra origem quando `VITE_WS_BASE`
    // aponta o worker pra fora (o WebSocket ignora CORS, mas este `fetch` não —
    // sem isto o escape do 3.3 quebrava em silêncio, e o jogador via só "o
    // servidor está rodando?").
    if (url.pathname === ROTA_CRIAR_SALA && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cabecalhosCors(request, env) });
    }

    if (url.pathname === ROTA_CRIAR_SALA && request.method === 'POST') {
      const agora = Date.now();
      const cors = cabecalhosCors(request, env);

      // O teto ANTES de qualquer trabalho: sortear código e falar com o DO da
      // sala custa, e um limitador que só age depois de pagar o custo protege
      // o desfecho e não o recurso. Mesmo espírito do teto de bytes que
      // responde antes do `JSON.parse` em `onMessage`.
      const guarda = env.Limite.get(env.Limite.idFromName(chaveDoTeto(request)));
      if (!(await guarda.consumir(agora))) {
        return Response.json(
          { erro: 'muitas-tentativas' },
          { status: 429, headers: { ...cors, 'Retry-After': String(JANELA_TETO_MS / 1000) } },
        );
      }

      for (let tentativa = 0; tentativa < TENTATIVAS_CODIGO; tentativa += 1) {
        const codigo = sortearCodigo();
        const stub = env.Sala.get(env.Sala.idFromName(codigo));
        // RPC, não `fetch`: ver o docblock de `criarSeNova`. Uma rota HTTP no
        // DO seria alcançável de fora e deixaria qualquer um escolher o código.
        if (await stub.criarSeNova(codigo, agora)) {
          return Response.json({ codigo }, { headers: cors });
        }
      }
      return Response.json({ erro: 'sem-codigo-livre' }, { status: 503, headers: cors });
    }

    return (
      (await routePartykitRequest(request, env)) ?? new Response('Não encontrado', { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
