/**
 * As rotas HTTP/WS do worker — declaradas UMA vez, e o proxy do Vite DERIVADO
 * delas (PR 3.3.3).
 *
 * 🔴 **Por que este módulo existe.** No 3.3.2 a criação de sala deixou de ser
 * rota do Durable Object e virou `POST /criar-sala` no worker. Só que o
 * `proxy` do `vite.config.ts`, escrito no 3.3.1, repassa `/parties/*` e mais
 * nada — então o `fetch` do botão "Criar sala" morria DENTRO do Vite com 404 e
 * **o worker não registrava requisição nenhuma**. A UI concluía "o servidor
 * está rodando?" e apontava pro lugar errado: o servidor estava no ar e
 * respondia normalmente na porta dele. Os 1355 testes passavam.
 *
 * 🔑 **A lição, e o que este arquivo faz com ela.** O erro não foi distração —
 * foi haver DUAS listas de rotas que precisavam concordar e nenhuma delas
 * saber da outra. Uma constante compartilhada só transformaria o esquecimento
 * em outro esquecimento. Por isso aqui a lista é a fonte única e
 * `proxyDoWorker()` **gera** o bloco do `vite.config.ts`: rota nova neste array
 * atravessa o proxy sozinha, sem ninguém lembrar de nada.
 *
 * Este módulo é importado pelo `vite.config.ts`, então **não pode importar
 * nada** — nem tipos de runtime, nem `src/`. Constantes puras só.
 */

/**
 * Cria uma sala e devolve `{ codigo }`. **POST, no worker, FORA de
 * `/parties/`** — e o "fora" é de segurança, não de arrumação: o roteador do
 * `partyserver` casa QUALQUER caminho sob `/parties/<ns>/<nome>/…` (exige `>=`,
 * não igualdade). Uma rota de criação ali dentro deixaria o cliente escolher o
 * próprio código, que foi o crítico C3 do 3.3.2. Ver `criarSeNova` em
 * `party/sala.ts`.
 */
export const ROTA_CRIAR_SALA = '/criar-sala';

/** Prefixo das rotas do `partyserver` (o WebSocket da sala). `Sala` → `sala`. */
export const PREFIXO_PARTIES = '/parties';

/** O worker em desenvolvimento (`wrangler dev` sobe aqui, só em localhost). */
export const ALVO_WORKER_DEV = 'http://127.0.0.1:8787';

export interface RotaDoWorker {
  /** Prefixo do caminho, como o Vite casa (`path.startsWith(chave)`). */
  caminho: string;
  /**
   * `true` repassa o `Upgrade: websocket`. Sem isso o proxy só encaminha HTTP
   * e a conexão cai no handshake — o socket some sem erro claro, que é o modo
   * de falha mais caro de diagnosticar desta camada.
   */
  ws: boolean;
}

/**
 * Tudo que o cliente chama no worker. **Rota nova entra AQUI** — e só aqui.
 */
export const ROTAS_DO_WORKER: readonly RotaDoWorker[] = [
  { caminho: PREFIXO_PARTIES, ws: true },
  { caminho: ROTA_CRIAR_SALA, ws: false },
];

/**
 * O `server.proxy` do Vite, gerado da lista acima. Chamado por
 * `vite.config.ts`; escrever o bloco à mão lá recria a segunda fonte de
 * verdade que causou o bug, e `proxy-vite.test.ts` reprova se isso acontecer.
 */
export function proxyDoWorker(alvo: string = ALVO_WORKER_DEV): Record<
  string,
  { target: string; changeOrigin: boolean; ws?: boolean }
> {
  const entradas = ROTAS_DO_WORKER.map((rota) => [
    rota.caminho,
    rota.ws
      ? { target: alvo, changeOrigin: true, ws: true }
      : { target: alvo, changeOrigin: true },
  ]);
  return Object.fromEntries(entradas);
}
