/**
 * SMOKE do online contra o worker DE VERDADE (PR 3.2).
 *
 * O harness (`src/net/harness.test.ts`) cobre a lógica: 22 clientes, latência,
 * reordenação, duplicação, desconexão — tudo determinístico e dentro do
 * `npm test`. O que ele NÃO cobre é justamente o que não dá pra simular: o
 * WebSocket de verdade, o `partyserver` roteando, o Durable Object persistindo
 * e o workerd executando a engine. É o que este script mede.
 *
 * Fora do `npm test` de propósito: precisa de um servidor no ar.
 *
 *   Terminal 1:  npx wrangler dev
 *   Terminal 2:  node scripts/smoke-online.mjs
 *
 * Usa o WebSocket global do Node (>= 22) — zero dependência nova.
 */

const BASE = process.env.SALA_BASE ?? '127.0.0.1:8787';
const SALA = process.env.SALA_NOME ?? `smoke-${Date.now()}`;
const URL_WS = `ws://${BASE}/parties/sala/${SALA}`;

const falhas = [];
const ok = (r) => console.log(`  [OK]    ${r}`);
const falha = (r, d) => {
  falhas.push(r);
  console.log(`  [FALHA] ${r}${d ? ` -- ${d}` : ''}`);
};

function conectar(nome) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL_WS);
    const recebidas = [];
    const esperas = [];

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      recebidas.push(msg);
      for (let i = esperas.length - 1; i >= 0; i--) {
        if (esperas[i].filtro(msg)) {
          esperas[i].resolve(msg);
          esperas.splice(i, 1);
        }
      }
    });
    ws.addEventListener('error', (e) => reject(new Error(`${nome}: socket: ${e.message ?? e}`)));
    ws.addEventListener('open', () => resolve(cliente));

    const cliente = {
      nome,
      ws,
      recebidas,
      enviar: (o) => ws.send(JSON.stringify(o)),
      fechar: () => ws.close(),
      esperar: (filtro, ms = 8000) =>
        new Promise((res, rej) => {
          const achada = recebidas.find(filtro);
          if (achada) return res(achada);
          const t = setTimeout(() => rej(new Error(`${nome}: timeout`)), ms);
          esperas.push({
            filtro,
            resolve: (m) => {
              clearTimeout(t);
              res(m);
            },
          });
        }),
    };
  });
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\nSMOKE do online -- ${URL_WS}\n`);

  const a = await conectar('A');
  const b = await conectar('B');
  ok('duas conexões abertas');

  a.enviar({ tipo: 'entrar', nome: 'Ana' });
  const souA = await a.esperar((m) => m.tipo === 'voce-e');
  b.enviar({ tipo: 'entrar', nome: 'Beto' });
  const souB = await b.esperar((m) => m.tipo === 'voce-e');

  if (souA.jogadorId === 'humano-01' && souB.jogadorId === 'humano-02') {
    ok(`ids alocados pelo servidor: ${souA.jogadorId}, ${souB.jogadorId}`);
  } else {
    falha('ids alocados', `${souA.jogadorId} / ${souB.jogadorId}`);
  }

  // A tem que ENXERGAR a entrada de B — prova que os dois caem no mesmo DO.
  const viuB = await a.esperar(
    (m) => m.tipo === 'estado' && m.estado.jogadores.some((j) => j.id === souB.jogadorId),
  );
  ok(`A enxerga B na sala (${viuB.estado.jogadores.length} jogadores) -- mesmo Durable Object`);

  // A seed mestra NUNCA pode aparecer no fio.
  const bruto = JSON.stringify(viuB);
  if (bruto.includes('seedMestre')) falha('VAZOU seedMestre no broadcast');
  else ok('seedMestre não aparece no broadcast (só seedDraft derivada)');

  // Personificação: B tenta iniciar sem ser anfitrião.
  b.enviar({ tipo: 'iniciar' });
  const recusa = await b.esperar((m) => m.tipo === 'erro');
  if (recusa.erro === 'nao-e-anfitriao') ok('não-anfitrião é recusado ao iniciar');
  else falha('recusa de anfitrião', recusa.erro);

  // Comando lixo não derruba o servidor.
  a.enviar({ tipo: 'xpto-invalido' });
  const lixo = await a.esperar((m) => m.tipo === 'erro' && m.erro === 'comando-invalido');
  if (lixo) ok('comando desconhecido vira erro, não queda');

  // Prontos e início: a sala congela o roster de 22 e abre o draft.
  a.enviar({ tipo: 'pronto', pronto: true });
  b.enviar({ tipo: 'pronto', pronto: true });
  await pausa(200);
  a.enviar({ tipo: 'iniciar' });
  const iniciada = await a.esperar((m) => m.tipo === 'estado' && m.estado.fase === 'iniciada');

  if (iniciada.estado.roster?.length === 22) ok('roster congelado com 22 jogadores');
  else falha('roster congelado', `${iniciada.estado.roster?.length}`);

  if (iniciada.estado.draft?.fase === 'sorteios') ok('draft aberto na fase sorteios');
  else falha('draft aberto', `${iniciada.estado.draft?.fase}`);

  const seqAntes = iniciada.estado.seq;

  // Uma jogada real, com a coordenada de turno.
  a.enviar({
    tipo: 'escolher',
    escolha: { tipo: 'componente', slot: 'chassi' },
    turnoEsperado: iniciada.estado.draft.rodada[souA.jogadorId],
  });
  const apos = await a.esperar(
    (m) => m.tipo === 'estado' && (m.estado.draft?.log.length ?? 0) > 0,
  );
  if (apos.estado.draft.rodada[souA.jogadorId] === 2) ok('escolha aceita: rodada avançou');
  else falha('escolha aceita', JSON.stringify(apos.estado.draft.rodada[souA.jogadorId]));

  if (apos.estado.seq > seqAntes) ok(`seq avançou em comando de draft (${seqAntes} -> ${apos.estado.seq})`);
  else falha('seq não avançou em comando de draft', `${seqAntes} -> ${apos.estado.seq}`);

  // Idempotência sobre o socket real: o MESMO comando de novo é recusado.
  a.enviar({
    tipo: 'escolher',
    escolha: { tipo: 'componente', slot: 'chassi' },
    turnoEsperado: iniciada.estado.draft.rodada[souA.jogadorId],
  });
  const dup = await a.esperar((m) => m.tipo === 'erro' && m.erro === 'turno-divergente');
  if (dup) ok('comando duplicado é recusado (turno-divergente)');

  // Recuperação de identidade.
  b.enviar({ tipo: 'quem-sou' });
  const dinovo = await b.esperar((m) => m.tipo === 'voce-e' && m.jogadorId === souB.jogadorId);
  if (dinovo) ok('quem-sou devolve a identidade');

  // Persistência: uma conexão nova recebe o estado corrente.
  const c = await conectar('C');
  const snapshotC = await c.esperar((m) => m.tipo === 'estado');
  if (snapshotC.estado.draft?.log.length >= 1) ok('conexão nova recebe o estado já em andamento');
  else falha('snapshot pra conexão nova', JSON.stringify(snapshotC.estado.draft?.log.length));

  a.fechar();
  b.fechar();
  c.fechar();
  await pausa(200);

  console.log('');
  if (falhas.length === 0) {
    console.log('SMOKE OK -- todos os cheques passaram.\n');
    process.exitCode = 0;
  } else {
    console.log(`SMOKE FALHOU -- ${falhas.length} cheque(s): ${falhas.join(', ')}\n`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`\nERRO: ${e.message}`);
  console.error('O servidor está no ar? Rode `npx wrangler dev` em outro terminal.\n');
  process.exitCode = 1;
});
