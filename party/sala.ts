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
 * lá. Nada no grafo de imports abaixo toca `node:*`.
 */

import { routePartykitRequest, Server, type Connection } from 'partyserver';

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
import { codigoDeBytes, TAMANHO_CODIGO } from '../src/net/codigo-sala';
import { MAX_BYTES_MENSAGEM, PRAZO_TURNO_MS } from '../src/net/tipos';

interface Env {
  Sala: DurableObjectNamespace<Sala>;
}

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
    this.estado = criarServidor(codigo, semente[0], 'dificil', agora);
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

  async onConnect(connection: Connection): Promise<void> {
    const estado = await this.carregar();
    if (estado === null) {
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
    const estado = await this.carregar();
    if (estado === null) {
      // Comando em voo de uma conexão que sobreviveu ao reset.
      this.recusar(connection);
      return;
    }
    // O token de reentrada é gerado AQUI, na casca: o redutor é puro e não
    // sorteia. 128 bits de `crypto.randomUUID` — derivar de
    // `deriveSeed(seedMestre, …)` daria 32 bits, pouco para um segredo que vale
    // a identidade do jogador. Só é consumido num `entrar` aceito.
    await this.aplicar(
      aoReceber(estado, connection.id, message, Date.now(), crypto.randomUUID()),
    );
  }

  async onClose(connection: Connection): Promise<void> {
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
    const atualizado = registrarConexoes(estado, this.quantasConexoes(), agora);
    if (decidirVida(atualizado, agora).tipo === 'encerrar') {
      await this.encerrar();
      return;
    }

    // Com a partida concluída não há mais turno pra expirar: durante os 10
    // minutos da janela isso seriam ~120 escritas em storage e 120 broadcasts
    // de snapshot completo, por sala, sem nada mudar.
    const proximo =
      atualizado.sala.concluidaEm === null
        ? aoPassarOTempo(atualizado, agora, PRAZO_TURNO_MS)
        : { estado: atualizado, envios: [] };
    await this.aplicar(proximo);
    await this.ctx.storage.setAlarm(agora + INTERVALO_TIQUE_MS);
  }
}

/** O `POST /criar-sala` pode vir de outra origem — ver `VITE_WS_BASE`. */
const CABECALHOS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

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
    if (url.pathname === '/criar-sala' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CABECALHOS_CORS });
    }

    if (url.pathname === '/criar-sala' && request.method === 'POST') {
      const agora = Date.now();
      for (let tentativa = 0; tentativa < TENTATIVAS_CODIGO; tentativa += 1) {
        const codigo = sortearCodigo();
        const stub = env.Sala.get(env.Sala.idFromName(codigo));
        // RPC, não `fetch`: ver o docblock de `criarSeNova`. Uma rota HTTP no
        // DO seria alcançável de fora e deixaria qualquer um escolher o código.
        if (await stub.criarSeNova(codigo, agora)) {
          return Response.json({ codigo }, { headers: CABECALHOS_CORS });
        }
      }
      return Response.json({ erro: 'sem-codigo-livre' }, { status: 503, headers: CABECALHOS_CORS });
    }

    return (
      (await routePartykitRequest(request, env)) ?? new Response('Não encontrado', { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
