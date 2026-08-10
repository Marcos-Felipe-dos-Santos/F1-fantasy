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

  /**
   * Carrega o estado persistido. **Devolve `null` se a sala não existe** — e
   * isso tem de ser checado em TODO ponto de entrada, não só no `onConnect`:
   * um DO hiberna e acorda ao receber mensagem, e uma conexão aberta antes de
   * um reset continua viva por um instante.
   */
  private async carregar(): Promise<EstadoServidor | null> {
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
  private async criar(): Promise<boolean> {
    if ((await this.carregar()) !== null) return false;
    const semente = new Uint32Array(1);
    crypto.getRandomValues(semente);
    this.estado = criarServidor(this.name, semente[0], 'dificil');
    await this.ctx.storage.put('estado', this.estado);
    await this.ctx.storage.setAlarm(Date.now() + INTERVALO_TIQUE_MS);
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
    this.estado = null;
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

  /** Criação da sala, chamada pelo worker com o código já sorteado. */
  async onRequest(request: Request): Promise<Response> {
    if (new URL(request.url).pathname.endsWith('/criar')) {
      return new Response(null, { status: (await this.criar()) ? 201 : 409 });
    }
    return new Response('Não encontrado', { status: 404 });
  }

  async onConnect(connection: Connection): Promise<void> {
    const estado = await this.carregar();
    if (estado === null) {
      this.recusar(connection);
      return;
    }
    await this.aplicar(aoConectar(estado, connection.id));
    await this.ctx.storage.setAlarm(Date.now() + INTERVALO_TIQUE_MS);
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
    await this.aplicar(aoDesconectar(estado, connection.id, Date.now()));
    // Saiu o último? A sala não fica de pé sem ninguém.
    if ([...this.getConnections()].length === 0) await this.encerrar();
  }

  /**
   * O relógio do servidor: expiração de turno **e** ciclo de vida da sala.
   * É daqui que sai a decisão de encerrar — nunca do cliente.
   */
  async alarm(): Promise<void> {
    const estado = await this.carregar();
    if (estado === null) return;

    const agora = Date.now();
    const conexoes = [...this.getConnections()].length;
    if (decidirVida(estado, conexoes, agora).tipo === 'encerrar') {
      await this.encerrar();
      return;
    }

    await this.aplicar(aoPassarOTempo(estado, agora, PRAZO_TURNO_MS));
    await this.ctx.storage.setAlarm(agora + INTERVALO_TIQUE_MS);
  }
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
    if (url.pathname === '/criar-sala' && request.method === 'POST') {
      for (let tentativa = 0; tentativa < TENTATIVAS_CODIGO; tentativa += 1) {
        const codigo = sortearCodigo();
        const stub = env.Sala.get(env.Sala.idFromName(codigo));
        const resposta = await stub.fetch(new Request('https://sala/criar', { method: 'POST' }));
        if (resposta.status === 201) return Response.json({ codigo });
      }
      return Response.json({ erro: 'sem-codigo-livre' }, { status: 503 });
    }

    return (
      (await routePartykitRequest(request, env)) ?? new Response('Não encontrado', { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
