/** Migração reversa de uma via; ensaio por padrão, --aplicar para gravar. */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { TabelaDeNomes } from './anonimizar.ts';
import type { UniversoDeNomes } from './anonimizar-fixture.ts';
import { FATOS_AGREGADOS, FIXTURE_EQUIPE_ANOS, TABELA_NOMES } from './caminhos-dataset.ts';
import {
  idsDaEquipeAno,
  serializarDerivado,
  slug,
  verificarColisaoDeIds,
  type EquipeAnoDerivado,
} from './derivar-notas.ts';

function indiceUnico<T>(pares: readonly (readonly [string, T])[]): Map<string, T> {
  const mapa = new Map<string, T>();
  for (const [chave, valor] of pares) {
    if (mapa.has(chave)) throw new Error(`Mapa reverso ambíguo: ${chave}`);
    mapa.set(chave, valor);
  }
  return mapa;
}

export function restaurarFixture(
  fixture: readonly EquipeAnoDerivado[],
  tabela: TabelaDeNomes,
  universo: UniversoDeNomes,
): EquipeAnoDerivado[] {
  const equipes = indiceUnico(
    Object.entries(tabela.equipes).map(([id, e]) => [slug(e.codigo), id] as const),
  );
  const pilotos = indiceUnico(
    Object.entries(tabela.pilotos).map(([id, p]) => [p.codigo, id] as const),
  );
  const nomesEquipes = new Map(universo.equipes.map((e) => [e.constructorId, e.nome]));
  const nomesPilotos = new Map(universo.titulares.map((p) => [p.driverId, p.nome]));
  const resultado = fixture.map((reg) => {
    const sufixo = `-${reg.ano}-chassi`;
    if (!reg.chassi.id.endsWith(sufixo)) throw new Error(`Chassi inválido: ${reg.chassi.id}`);
    const constructorId = equipes.get(reg.chassi.id.slice(0, -sufixo.length));
    const equipe = constructorId && nomesEquipes.get(constructorId);
    if (!constructorId || !equipe) throw new Error(`Equipe fora do mapa: ${reg.chassi.id}`);
    const ids = idsDaEquipeAno(constructorId, reg.ano);
    const par = reg.pilotos.map((p) => {
      const prefixo = reg.chassi.id.slice(0, -'chassi'.length) + 'piloto-';
      if (!p.id.startsWith(prefixo)) throw new Error(`Piloto fora da equipe: ${p.id}`);
      const driverId = pilotos.get(p.id.slice(prefixo.length));
      const nome = driverId && nomesPilotos.get(driverId);
      if (!driverId || !nome) throw new Error(`Piloto fora do mapa: ${p.id}`);
      return { ...p, id: ids.piloto(driverId), nome };
    }) as EquipeAnoDerivado['pilotos'];
    return {
      ...reg,
      equipe,
      pilotos: par,
      chassi: { ...reg.chassi, id: ids.chassi },
      motor: { ...reg.motor, id: ids.motor },
      pit: { ...reg.pit, id: ids.pit },
      estrategista: {
        ...reg.estrategista,
        id: ids.estrategista,
        nome: `Estrategista ${equipe} ${reg.ano}`,
      },
    };
  });
  verificarColisaoDeIds(resultado);
  return resultado;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const entrada = JSON.parse(readFileSync(FIXTURE_EQUIPE_ANOS, 'utf8'));
  const saida = restaurarFixture(
    entrada,
    JSON.parse(readFileSync(TABELA_NOMES, 'utf8')),
    JSON.parse(readFileSync(FATOS_AGREGADOS, 'utf8')),
  );
  if (process.argv.includes('--aplicar'))
    writeFileSync(FIXTURE_EQUIPE_ANOS, serializarDerivado(saida));
  console.log(
    `${saida.length} registros restaurados; ${process.argv.includes('--aplicar') ? 'gravado' : 'ensaio sem escrita'}.`,
  );
}
