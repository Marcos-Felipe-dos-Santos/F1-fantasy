import { describe, expect, it } from 'vitest';
import type { ComandoSala } from './protocolo';
import { criarSala, estadoDasSeeds, publicarSala, reduzirSala } from './sala';
import { aoReceber, aoPassarOTempo, criarServidor } from './servidor-sala';
import type { EstadoSala } from './tipos';

const seeds = { etapas: [11, 22, 33, 44, 55, 66, 77, 88, 99, 110], calendario: 321 };
const host = 'humano-01';
const outro = 'humano-02';

function aberta(): EstadoSala {
  let sala = criarSala('FORMAT', 42, 'facil', 1000, seeds, 5);
  for (const nome of ['Host', 'Outro']) {
    sala = reduzirSala(sala, { tipo: 'entrar', nome }, null, 1000, nome).estado;
  }
  for (const id of [host, outro]) {
    sala = reduzirSala(sala, { tipo: 'pronto', pronto: true }, id, 1000).estado;
  }
  return sala;
}

// Cast só na entrada não confiável: o baseline executa antes do tipo novo existir.
function configurar(sala: EstadoSala, nEtapas: unknown, id: string | null = host) {
  return reduzirSala(sala, { tipo: 'configurar-formato', nEtapas } as ComandoSala, id, 1000);
}

describe('configurar-formato', () => {
  it.each([1, 5, 10])('host escolhe %i e o snapshot publica o formato', (n) => {
    const antes = aberta();
    const { estado, erro } = configurar(antes, n);
    expect(erro).toBeNull();
    expect(estado.nEtapas).toBe(n);
    expect(publicarSala(estado).nEtapas).toBe(n);
    expect(publicarSala(estado).seedsAbertas).toEqual([]);
    expect(publicarSala(estado).seedCalendario).toBeNull();
    expect(estado.seedsEtapas).toBe(antes.seedsEtapas);
    expect(estado.seedCalendario).toBe(antes.seedCalendario);
    expect(estado.seq).toBe(antes.seq + (n === 5 ? 0 : 1));
  });

  it('mudança efetiva limpa todos os prontos sem mutar o estado anterior', () => {
    const antes = aberta();
    const copia = structuredClone(antes);
    const r = configurar(antes, 1);
    expect(r.erro).toBeNull();
    expect(r.estado.jogadores.map((j) => j.pronto)).toEqual([false, false]);
    expect(antes).toEqual(copia);
    expect(reduzirSala(r.estado, { tipo: 'iniciar' }, host, 1000).erro).toBe('nem-todos-prontos');
  });

  it.each([1, 5, 10])('mesmo valor %i é idempotente e preserva prontos e seq', (n) => {
    const antes = { ...aberta(), nEtapas: n };
    const r = configurar(antes, n);
    expect(r.erro).toBeNull();
    expect(r.estado).toBe(antes);
    expect(r.estado.jogadores.every((j) => j.pronto)).toBe(true);
  });

  it.each([null, 'inexistente', outro])('recusa remetente %s preservando identidade', (id) => {
    const antes = aberta();
    const r = configurar(antes, 1, id);
    expect(r.erro).toBe(id === outro ? 'nao-e-anfitriao' : 'jogador-desconhecido');
    expect(r.estado).toBe(antes);
  });

  it('recusa anfitrião que não existe no roster', () => {
    const antes = { ...aberta(), anfitriaoId: 'fantasma' };
    expect(configurar(antes, 1, 'fantasma')).toEqual({
      estado: antes,
      erro: 'jogador-desconhecido',
    });
  });

  it.each([undefined, null, '1', '5', true, 0, 2, 7, 11, -1, 1.5, NaN, Infinity, {}, []])(
    'recusa formato inválido %j sem alterar estado',
    (n) => {
      const antes = aberta();
      const r = configurar(antes, n);
      expect(r.erro).toBe('comando-invalido');
      expect(r.estado).toBe(antes);
    },
  );

  it.each([{ etapas: [] }, { etapas: [11, 22, 33, 44, 55] }, { etapas: undefined }])(
    'não excede seeds disponíveis $etapas',
    ({ etapas }) => {
      const antes = { ...aberta(), seedsEtapas: etapas };
      const r = configurar(antes, 10);
      expect(r.erro).toBe('comando-invalido');
      expect(r.estado).toBe(antes);
    },
  );

  it.each([1, 5, 10])('recusa %i após início, incluindo mesmo valor', (n) => {
    const antes = reduzirSala(aberta(), { tipo: 'iniciar' }, host, 1000).estado;
    const r = configurar(antes, n);
    expect(r.erro).toBe('sala-iniciada');
    expect(r.estado).toBe(antes);
  });
});

it.each([1, 5, 10])('servidor encerra exatamente na etapa %i escolhida pelo host', (n) => {
  let servidor = criarServidor('FORMAT', 42, 'facil', 1000, seeds, 5);
  const enviar = (id: string, comando: unknown) => {
    const r = aoReceber(servidor, id, JSON.stringify(comando), 1000, `token-${id}`);
    expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
    servidor = r.estado;
  };
  for (const id of ['a', 'b']) enviar(id, { tipo: 'entrar', nome: id, versaoApp: 'teste' });
  enviar('a', { tipo: 'configurar-formato', nEtapas: n });
  for (const id of ['a', 'b'])
    enviar(id, {
      tipo: 'pronto',
      pronto: true,
      revisaoFormatoEsperada:
        (servidor.sala as EstadoSala & { revisaoFormato?: number }).revisaoFormato ?? 0,
    });
  enviar('a', { tipo: 'iniciar' });
  // Expira o draft real; nenhuma fórmula de corrida é executada no servidor.
  let agora = 1_000_000;
  for (let i = 0; i < 30 && servidor.sala.draft?.fase !== 'concluido'; i++) {
    servidor = aoPassarOTempo(servidor, agora).estado;
    agora += 1_000_000;
  }
  expect(servidor.sala.draft?.fase).toBe('concluido');
  for (let k = 0; k < n; k++) {
    expect(servidor.sala.concluidaEm).toBeNull();
    expect(servidor.sala.etapaAtual).toBe(k);
    expect(publicarSala(servidor.sala).seedsAbertas).toEqual(seeds.etapas.slice(0, k + 1));
    servidor = aoPassarOTempo(servidor, agora).estado;
    agora += 1_000_000;
  }
  expect(servidor.sala.concluidaEm).not.toBeNull();
  expect(servidor.sala.etapaAtual).toBe(n - 1);
  expect(publicarSala(servidor.sala).seedsAbertas).toHaveLength(n);
});

function pronto(sala: EstadoSala, revisao: unknown, id = host) {
  return reduzirSala(
    sala,
    { tipo: 'pronto', pronto: true, revisaoFormatoEsperada: revisao } as ComandoSala,
    id,
    1000,
  );
}

it.each([false, true])(
  'pronto atrasado não confirma formato alterado; volta a cinco: %s',
  (voltar) => {
    let sala = configurar(aberta(), 10).estado;
    if (voltar) sala = configurar(sala, 5).estado;
    const revisao = voltar ? 2 : 1;
    for (const antiga of [undefined, 0, ...(voltar ? [1] : [])]) {
      for (const id of [host, outro]) {
        const r = pronto(sala, antiga, id);
        expect(r.erro).toBe('comando-invalido');
        expect(r.estado).toBe(sala);
      }
    }
    expect(reduzirSala(sala, { tipo: 'iniciar' }, host, 1000).erro).toBe('nem-todos-prontos');
    expect(publicarSala(sala)).toHaveProperty('revisaoFormato', revisao);
    for (const id of [host, outro]) {
      const r = pronto(sala, revisao, id);
      expect(r.erro).toBeNull();
      sala = r.estado;
    }
    expect(reduzirSala(sala, { tipo: 'iniciar' }, host, 1000).erro).toBeNull();
  },
);

it('legado publica revisão zero e aceita pronto sem revisão', () => {
  const sala = { ...aberta() } as EstadoSala & { revisaoFormato?: number };
  delete sala.revisaoFormato;
  expect(publicarSala(sala)).toHaveProperty('revisaoFormato', 0);
  expect(pronto(sala, undefined).erro).toBeNull();
  expect(pronto(sala, 0).erro).toBeNull();
  expect(publicarSala(configurar(sala, 10).estado)).toHaveProperty('revisaoFormato', 1);
});

it.each([null, '0', false, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  'recusa revisão inválida %j no pronto e no estado persistido',
  (revisao) => {
    const sala = aberta();
    expect(pronto(sala, revisao).erro).toBe('comando-invalido');
    const corrompida = { ...sala, revisaoFormato: revisao } as unknown as EstadoSala;
    expect(estadoDasSeeds(corrompida).tipo).toBe('corrompida');
    expect(configurar(corrompida, 10).erro).toBe('comando-invalido');
  },
);

it('configurar mesmo formato no servidor preserva referência e não difunde', () => {
  const servidor = {
    ...criarServidor('FORMAT', 42, 'facil', 1000, seeds, 5),
    sala: aberta(),
    jogadorPorConexao: { a: host },
  };
  const r = aoReceber(
    servidor,
    'a',
    JSON.stringify({ tipo: 'configurar-formato', nEtapas: 5 }),
    1000,
  );
  expect(r.estado).toBe(servidor);
  expect(r.envios).toEqual([]);
});

it('revisão no limite não pode sofrer overflow; repetição permanece idempotente', () => {
  const sala = { ...aberta(), revisaoFormato: Number.MAX_SAFE_INTEGER };
  expect(configurar(sala, 10)).toEqual({ estado: sala, erro: 'comando-invalido' });
  expect(configurar(sala, 5).estado).toBe(sala);
});
