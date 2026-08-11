/**
 * Pré-voo do `npm run sala` (PR 3.3.4): a porta do worker está livre?
 *
 * 🔴 **O modo de falha que isto mata.** Quando a 8787 já está ocupada, o
 * `wrangler dev` NÃO falha: ele sobe em silêncio na 8788 e imprime
 * "Ready on http://127.0.0.1:8788" no meio de vinte linhas de banner. Só que o
 * proxy do Vite aponta pra **8787, fixa** (`ALVO_WORKER_DEV`), então o app
 * conversa com uma porta vazia.
 *
 * O sintoma é pior que um erro: se nada escuta na 8787, o proxy devolve 500 e
 * ao menos aparece a mensagem de "servidor está rodando?"; mas se o que sobrou
 * ali for um `workerd` meio-morto — que ACEITA a conexão e nunca responde — o
 * `fetch` do "Criar sala" fica pendurado e o botão diz **"Criando…" pra
 * sempre**, sem erro, sem log, sem pista. Aconteceu de verdade nesta bancada,
 * com um `workerd.exe` órfão em LISTENING que não respondia a `curl`.
 *
 * Falhar aqui, antes de subir, troca meia hora de diagnóstico por uma linha.
 *
 * Não usa dependência: `node:net` tenta ESCUTAR na porta, que é o mesmo que o
 * wrangler fará. Testar com uma conexão de saída não serviria — não distingue
 * "livre" de "ocupada por processo que não aceita".
 */

import { createServer } from 'node:net';
import { ALVO_WORKER_DEV } from '../src/net/rotas.ts';

const { hostname: HOST, port: PORTA } = new URL(ALVO_WORKER_DEV);

function portaLivre(host: string, porta: number): Promise<boolean> {
  return new Promise((resolve) => {
    const servidor = createServer();
    servidor.once('error', () => resolve(false));
    servidor.once('listening', () => servidor.close(() => resolve(true)));
    // `exclusive` impede que o SO compartilhe a porta e devolva um falso "livre".
    servidor.listen({ host, port: porta, exclusive: true });
  });
}

const livre = await portaLivre(HOST, Number(PORTA));

if (!livre) {
  process.stderr.write(
    [
      '',
      `[31m✖ A porta ${PORTA} está OCUPADA — o worker da sala não pode subir aí.[0m`,
      '',
      '  Por que isto é um erro e não um aviso: o `wrangler dev` cairia sozinho',
      `  na porta seguinte (8788), mas o proxy do Vite aponta pra ${PORTA}, FIXA.`,
      '  O app conversaria com uma porta vazia e "Criar sala" ficaria em',
      '  "Criando…" pra sempre, sem erro nenhum na tela.',
      '',
      '  Quase sempre é um `wrangler dev` anterior que não morreu por inteiro.',
      '  No PowerShell:',
      '',
      `      netstat -ano | findstr :${PORTA}`,
      '      taskkill /IM workerd.exe /F',
      '',
      '  Detalhe e diagnóstico completo: docs/jogar-em-rede.md',
      '',
    ].join('\n'),
  );
  process.exit(1);
}
