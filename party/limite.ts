/**
 * O Durable Object que hospeda o balde do teto (PR H1, item S1) — casca fina.
 *
 * 🔑 **UM DO POR IP, via `idFromName(ip)`. O IP É O SHARD.** Não há tabela de
 * baldes, não há particionamento a inventar e não há gargalo: requisições de
 * IPs diferentes caem em objetos diferentes, sem contenção entre si, e um IP
 * ocioso é despejado sozinho pela plataforma. Um DO único guardando um `Map`
 * de todos os IPs serializaria toda criação de sala do jogo num objeto só.
 *
 * 🔒 **O balde vive SÓ EM MEMÓRIA — decisão do dev (2026-09-01), acoplada à
 * janela de 10 s.** O DO mantém estado entre requisições enquanto vive; o
 * despejo o descarta. Com a janela abaixo do horizonte de despejo, o que se
 * perde é um balde que já teria expirado — mesmo comportamento observável, e
 * `ctx.storage` fica fora, a zero escrita por requisição.
 * ⚠️ **Isto NÃO é "o despejo não importa".** Importa se a janela crescer. Ver
 * `JANELA_TETO_MS`, onde os dois números estão amarrados.
 *
 * ⚠️ **Método RPC, não rota HTTP** — mesmo motivo do `criarSeNova` da `Sala`
 * (o C3 do 3.3.2): o roteador do `partyserver` casa qualquer caminho sob
 * `/parties/<ns>/<nome>/…`, então rota HTTP num DO é alcançável de fora. Um
 * limitador com rota própria seria um limitador que o atacante zera na mão.
 */
import { DurableObject } from 'cloudflare:workers';

import { avaliarTeto, type BaldeDeTeto } from '../src/net/rate-limit';

export class Limite extends DurableObject {
  /** `null` até a primeira requisição deste chaveador. Some no despejo. */
  private balde: BaldeDeTeto | null = null;

  /**
   * Consome uma unidade do teto. `true` ⇒ pode criar a sala.
   *
   * O `agora` vem da CASCA que chamou (o `fetch` do worker), não daqui: manter
   * a leitura do relógio num lugar só é o que permite a decisão ser pura e
   * testável sem `workerd` (ver `src/net/rate-limit.ts`).
   */
  async consumir(agora: number): Promise<boolean> {
    const veredicto = avaliarTeto(this.balde, agora);
    this.balde = veredicto.balde;
    return veredicto.permitido;
  }
}
