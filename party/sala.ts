/**
 * O Durable Object da sala (PR 3.2) — a casca de I/O, e só isso.
 *
 * Toda a decisão mora em `src/net/servidor-sala.ts`, que é puro e testado sem
 * rede. Aqui só acontece o que exige o runtime: aceitar socket, ler o relógio,
 * persistir e enviar bytes. É fino de propósito — o que não é testável sem rede
 * tende a não ser testado, então quase nada pode viver aqui.
 *
 * 🔒 `connection.id` é atribuído pelo `partyserver`, nunca pelo cliente: é o que
 * torna o mapa conexão→jogador confiável e o que impede personificação.
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
  type EstadoServidor,
  type ResultadoServidor,
} from '../src/net/servidor-sala';
import { MAX_BYTES_MENSAGEM, PRAZO_TURNO_MS } from '../src/net/tipos';

interface Env {
  Sala: DurableObjectNamespace<Sala>;
}

/** De quanto em quanto tempo o servidor confere prazos vencidos. */
const INTERVALO_TIQUE_MS = 5_000;

export class Sala extends Server<Env> {
  static options = { hibernate: true };

  private estado: EstadoServidor | null = null;

  /**
   * Carrega o estado persistido ou cria a sala. A `seedMestre` é gerada UMA vez
   * e gravada: regerá-la depois de um restart trocaria a partida no meio. É o
   * único ponto de aleatoriedade do servidor, e ela nunca sai daqui (o broadcast
   * leva só a `seedDraft` derivada).
   */
  private async carregar(): Promise<EstadoServidor> {
    if (this.estado !== null) return this.estado;

    const salvo = await this.ctx.storage.get<EstadoServidor>('estado');
    if (salvo !== undefined) {
      this.estado = salvo;
      return salvo;
    }

    const semente = new Uint32Array(1);
    crypto.getRandomValues(semente);
    this.estado = criarServidor(this.name, semente[0], 'dificil');
    await this.ctx.storage.put('estado', this.estado);
    return this.estado;
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

  async onStart(): Promise<void> {
    await this.carregar();
    await this.ctx.storage.setAlarm(Date.now() + INTERVALO_TIQUE_MS);
  }

  async onConnect(connection: Connection): Promise<void> {
    const estado = await this.carregar();
    await this.aplicar(aoConectar(estado, connection.id));
    // Alguém conectou: o tique pode ter parado por sala vazia.
    if (this.precisaDeTique()) await this.ctx.storage.setAlarm(Date.now() + INTERVALO_TIQUE_MS);
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
    await this.aplicar(aoReceber(estado, connection.id, message, Date.now()));
  }

  async onClose(connection: Connection): Promise<void> {
    const estado = await this.carregar();
    await this.aplicar(aoDesconectar(estado, connection.id, Date.now()));
  }

  /**
   * O relógio do servidor. É daqui que sai a expiração de turno — nunca do
   * cliente. Para de se reagendar quando não há mais o que expirar: sala
   * concluída ou sem ninguém conectado. Reagendar para sempre custaria um
   * alarme a cada 5 s por sala, eternamente.
   */
  async alarm(): Promise<void> {
    const estado = await this.carregar();
    await this.aplicar(aoPassarOTempo(estado, Date.now(), PRAZO_TURNO_MS));
    if (this.precisaDeTique()) {
      await this.ctx.storage.setAlarm(Date.now() + INTERVALO_TIQUE_MS);
    }
  }

  /** Só faz sentido tiquetaquear se há draft em andamento e alguém conectado. */
  private precisaDeTique(): boolean {
    const draft = this.estado?.sala.draft;
    if (draft === undefined || draft === null || draft.fase === 'concluido') return false;
    return [...this.getConnections()].length > 0;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ?? new Response('Não encontrado', { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
