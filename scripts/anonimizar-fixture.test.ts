/**
 * DIFERENCIAL DA MIGRAÇÃO DA FIXTURE — PR 7, achado da revisão.
 *
 * 🔴 **POR QUE ESTE ARQUIVO EXISTE:** `indicePorNome` e `anonimizarFixture` têm
 * **cinco `throw`** e a revisão do PR 7 mediu que **nenhum tinha teste**.
 * `fixture-semente.test.ts` prova o ARTEFATO e nem importava a função. Guarda
 * que só roda uma vez, numa migração já feita, e que nunca foi exercitada, é a
 * mesma família do `verificarColisaoDeIds` que o PR 6 achou "rodando só no
 * `main()`" — o docblock afirmava mais do que o código sustentava.
 *
 * 📌 **Separado de `fixture-semente.test.ts` pelo precedente do PR 6:** lá,
 * `anonimizar.test.ts` prova a TRANSFORMAÇÃO e `publicacao.test.ts` prova o
 * ARTEFATO, e o próprio PR 6 mediu que **nenhum cobre o buraco do outro**.
 * Mesma divisão aqui.
 *
 * 🔒 **O universo é SINTÉTICO, de 2 entradas — de propósito.** Um teste que
 * carregasse `fatos-agregados.json` e a fixture real mediria de novo o que a
 * cerca de propriedade já mede, e ficaria refém dos dados. Aqui a pergunta é
 * sobre a FUNÇÃO: ela remonta certo, e ela LANÇA quando deve.
 */
import { describe, expect, it } from 'vitest';
import type { TabelaDeNomes } from './anonimizar.ts';
import { anonimizarFixture, indicePorNome, type UniversoDeNomes } from './anonimizar-fixture.ts';
import type { EquipeAnoDerivado } from './derivar-notas.ts';

const UNIVERSO: UniversoDeNomes = {
  equipes: [{ nome: 'Escuderia Real', constructorId: 'real_team' }],
  titulares: [
    { nome: 'Piloto Um', driverId: 'um_real' },
    { nome: 'Piloto Dois', driverId: 'dois_real' },
  ],
};

const TABELA: TabelaDeNomes = {
  equipes: { real_team: { codigo: 'ficticia', nome: 'Escuderia Fictícia' } },
  pilotos: {
    um_real: { codigo: 'um_falso', nome: 'Nome Um' },
    dois_real: { codigo: 'dois_falso', nome: 'Nome Dois' },
  },
};

const notas = <T extends object>(o: T) => o;

function registro(): EquipeAnoDerivado {
  return {
    equipe: 'Escuderia Real',
    ano: 1999,
    pilotos: [
      // Ids na convenção PRÉ-4.5 da fixture, que é o caso que a função existe
      // para tratar: eles NÃO batem com o universo, e a resolução é por nome.
      { id: 'escreal-1999-piloto-um', nome: 'Piloto Um', notas: notas({ rit: 11 }) },
      { id: 'escreal-1999-piloto-dois', nome: 'Piloto Dois', notas: notas({ rit: 22 }) },
    ],
    chassi: { id: 'escreal-1999-chassi', notas: notas({ aero: 33 }) },
    motor: { id: 'escreal-1999-motor', notas: notas({ motor: 44 }) },
    estrategista: {
      id: 'escreal-1999-estrategista',
      nome: 'Estrategista Escuderia Real 1999',
      notas: notas({ call: 55 }),
    },
    pit: { id: 'escreal-1999-pit', notas: notas({ pitTempo: 66 }) },
  } as unknown as EquipeAnoDerivado;
}

describe('`anonimizarFixture` — a transformação', () => {
  it('remonta os 5 ids a partir do `codigo`, IGNORANDO os ids de entrada', () => {
    // 🔑 A anti-vacuidade que vale: os ids de entrada (`escreal-…`) não têm
    // NADA a ver com os de saída. Se a função copiasse a entrada, isto cai.
    const [r] = anonimizarFixture([registro()], TABELA, UNIVERSO);
    expect(r.chassi.id).toBe('ficticia-1999-chassi');
    expect(r.motor.id).toBe('ficticia-1999-motor');
    expect(r.estrategista.id).toBe('ficticia-1999-estrategista');
    expect(r.pit.id).toBe('ficticia-1999-pit');
    expect(r.pilotos[0].id).toBe('ficticia-1999-piloto-um_falso');
    expect(r.pilotos[1].id).toBe('ficticia-1999-piloto-dois_falso');
  });

  it('troca os nomes e RECONSTRÓI o do estrategista com o molde', () => {
    const [r] = anonimizarFixture([registro()], TABELA, UNIVERSO);
    expect(r.equipe).toBe('Escuderia Fictícia');
    expect(r.pilotos.map((p) => p.nome)).toEqual(['Nome Um', 'Nome Dois']);
    expect(r.estrategista.nome).toBe('Estrategista Escuderia Fictícia 1999');
  });

  it('preserva `ano`, a ORDEM do par de pilotos e as notas POR REFERÊNCIA', () => {
    // A ordem é o que faz `hashDaCorrida` bater; a referência é o que garante
    // que nenhuma nota foi recalculada. Ver o mutante M-parordem do PR 6.
    const entrada = registro();
    const [r] = anonimizarFixture([entrada], TABELA, UNIVERSO);
    expect(r.ano).toBe(1999);
    expect(r.pilotos[0].notas).toBe(entrada.pilotos[0].notas);
    expect(r.pilotos[1].notas).toBe(entrada.pilotos[1].notas);
    expect(r.chassi.notas).toBe(entrada.chassi.notas);
    expect(r.estrategista.notas).toBe(entrada.estrategista.notas);
  });

  it('é de UMA VIA: rodar sobre a própria saída LANÇA', () => {
    // É a propriedade que o docblock do script promete e que faz dele uma
    // migração em vez de um pipeline. Sem este caso, a promessa é prosa.
    const saida = anonimizarFixture([registro()], TABELA, UNIVERSO);
    expect(() => anonimizarFixture(saida, TABELA, UNIVERSO)).toThrow(
      /"Escuderia Fictícia" não está no universo/,
    );
  });
});

describe('`anonimizarFixture` — os quatro `throw`', () => {
  it('lança se a EQUIPE não está no universo', () => {
    const r = registro();
    r.equipe = 'Equipe Que Não Existe';
    expect(() => anonimizarFixture([r], TABELA, UNIVERSO)).toThrow(/não está no universo de nomes/);
  });

  it('lança se o PILOTO não está no universo', () => {
    const r = registro();
    r.pilotos[0].nome = 'Piloto Que Não Existe';
    expect(() => anonimizarFixture([r], TABELA, UNIVERSO)).toThrow(
      /"Piloto Que Não Existe" não está no universo/,
    );
  });

  it('lança se o `constructorId` do universo não está na TABELA', () => {
    // Universo e tabela são arquivos DIFERENTES; um pode andar sem o outro.
    const universoAMais: UniversoDeNomes = {
      ...UNIVERSO,
      equipes: [{ nome: 'Escuderia Real', constructorId: 'fora_da_tabela' }],
    };
    expect(() => anonimizarFixture([registro()], TABELA, universoAMais)).toThrow(
      /constructorId "fora_da_tabela" não está na tabela/,
    );
  });

  it('lança se o `driverId` do universo não está na TABELA', () => {
    const universoAMais: UniversoDeNomes = {
      ...UNIVERSO,
      titulares: [
        { nome: 'Piloto Um', driverId: 'fora_da_tabela' },
        { nome: 'Piloto Dois', driverId: 'dois_real' },
      ],
    };
    expect(() => anonimizarFixture([registro()], TABELA, universoAMais)).toThrow(
      /driverId "fora_da_tabela" não está na tabela/,
    );
  });
});

describe('`indicePorNome` — o assert de colisão', () => {
  it('lança quando um nome mapeia para DOIS ids — a resolução seria ambígua', () => {
    expect(() =>
      indicePorNome(
        [
          ['Homônimo', 'id_um'],
          ['Homônimo', 'id_dois'],
        ],
        'piloto',
      ),
    ).toThrow(/"Homônimo" mapeia para dois ids/);
  });

  it('NÃO lança quando o mesmo par se repete — repetição não é ambiguidade', () => {
    // A distinção é o que impede a guarda de ser um falso positivo em
    // `fatos-agregados.json`, onde o mesmo titular aparece em vários anos.
    expect(() =>
      indicePorNome(
        [
          ['Repetido', 'mesmo_id'],
          ['Repetido', 'mesmo_id'],
        ],
        'piloto',
      ),
    ).not.toThrow();
  });
});
