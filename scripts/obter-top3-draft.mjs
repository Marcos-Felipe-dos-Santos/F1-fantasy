import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';

const raizPadrao = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function rodadaFinalResultados(paginas, ano) {
  let offset = 0;
  let total;
  const rodadas = new Set();
  if (!paginas.length) throw new Error(`Resultados ausentes: ${ano}`);
  for (const dados of paginas) {
    const mr = dados?.MRData;
    const corridas = mr?.RaceTable?.Races;
    const quantidade = Number(mr?.total);
    const limite = Number(mr?.limit);
    if (mr?.RaceTable?.season !== String(ano) || !Array.isArray(corridas)
      || !Number.isSafeInteger(quantidade) || quantidade < 1
      || !Number.isSafeInteger(limite) || limite < 1
      || Number(mr.offset) !== offset || offset >= quantidade
      || (total !== undefined && total !== quantidade)) {
      throw new Error(`Paginação/temporada de resultados inválida: ${ano}`);
    }
    total = quantidade;
    let registros = 0;
    for (const corrida of corridas) {
      if (corrida.season !== String(ano) || !/^\d+$/.test(corrida.round)
        || Number(corrida.round) < 1 || !Array.isArray(corrida.Results)
        || !corrida.Results.length) throw new Error(`Corrida inválida: ${ano}`);
      registros += corrida.Results.length;
      rodadas.add(Number(corrida.round));
    }
    if (registros !== Math.min(limite, total - offset)) {
      throw new Error(`Página incompleta de resultados: ${ano}`);
    }
    offset += registros;
  }
  const final = Math.max(...rodadas);
  if (offset !== total || rodadas.size !== final) {
    throw new Error(`Resultados incompletos: ${ano}`);
  }
  return final;
}

export async function executar({ raiz = raizPadrao, offline = process.argv.includes('--offline'),
  anos = Array.from({ length: 68 }, (_, i) => 1958 + i) } = {}) {
  const cache = join(raiz, '.wrangler/draft-top3');
  const base = 'https://api.jolpi.ca/ergast/f1/';
  // Só pares equipe/ano são retidos; o dataset nunca é impresso ou modificado.
  const pares = JSON.parse(await readFile(join(raiz, 'src/data/equipe-anos.json'), 'utf8'))
    .map(({ equipe, ano }) => ({ equipe, ano }));
  const temporadas = [];
  const falhas = [];
  const semCorrespondencia = [];
  let ultimoAcesso = 0;

  function validar(dados, ano, rodadaEsperada) {
    const mr = dados?.MRData;
    const listas = mr?.StandingsTable?.StandingsLists;
    if (mr?.StandingsTable?.season !== String(ano) || listas?.length !== 1
      || listas[0].season !== String(ano) || !/^\d+$/.test(listas[0].round)
      || Number(listas[0].round) !== rodadaEsperada || Number(mr.offset) !== 0
      || Number(mr.total) !== listas[0].ConstructorStandings?.length) {
      throw new Error(`Standings finais incompletos ou temporada incorreta: ${ano}`);
    }
    const top3 = [1, 2, 3].map(rank => {
      const registros = listas[0].ConstructorStandings.filter(x => Number(x.position) === rank);
      const r = registros[0];
      if (registros.length !== 1 || !r.Constructor?.constructorId || !r.Constructor.name
        || !/^\d+(\.\d+)?$/.test(r.points)) throw new Error(`Top3 inválido: ${ano}/${rank}`);
      return { rank, pontos: r.points, constructorId: r.Constructor.constructorId, nome: r.Constructor.name };
    });
    return { rodadaFinal: Number(listas[0].round), top3 };
  }

  async function obter(ano, fonte) {
    const diretorio = join(raiz, 'scripts/cache/jolpica', String(ano));
    const arquivos = (await readdir(diretorio)).filter(n => /^results-p\d+\.json$/.test(n))
      .sort((a, b) => Number(a.match(/p(\d+)/)[1]) - Number(b.match(/p(\d+)/)[1]));
    if (arquivos.some((n, i) => n !== `results-p${i}.json`)) {
      throw new Error(`Páginas de resultados ausentes: ${ano}`);
    }
    const paginas = await Promise.all(arquivos.map(async n => JSON.parse(await readFile(join(diretorio, n), 'utf8'))));
    const rodadaEsperada = rodadaFinalResultados(paginas, ano);
    const caminho = join(cache, `${ano}.json`);
    try {
      const dados = JSON.parse(await readFile(caminho, 'utf8'));
      return { ...validar(dados, ano, rodadaEsperada), origem: 'cache' };
    } catch (erro) {
      if (erro.code !== 'ENOENT') console.error(`${ano}: cache rejeitado: ${erro.message}`);
    }
    if (offline) throw new Error('Cache válido ausente; --offline impede acesso à rede');
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      let atraso = 2000 * 2 ** tentativa;
      try {
        await esperar(Math.max(0, 1200 - (Date.now() - ultimoAcesso)));
        ultimoAcesso = Date.now();
        const resposta = await fetch(fonte, { signal: AbortSignal.timeout(20000) });
        if (!resposta.ok) {
          const erro = new Error(`HTTP ${resposta.status}`);
          erro.definitivo = resposta.status !== 429 && resposta.status < 500;
          const retry = resposta.headers.get('retry-after');
          const segundos = Number(retry);
          const ms = Number.isFinite(segundos) ? segundos * 1000 : Date.parse(retry) - Date.now();
          if (ms > 0) atraso = Math.min(30000, Math.max(atraso, ms));
          throw erro;
        }
        const dados = await resposta.json();
        const validado = validar(dados, ano, rodadaEsperada);
        await writeFile(caminho, `${JSON.stringify(dados)}\n`);
        return { ...validado, origem: 'rede' };
      } catch (erro) {
        console.error(`${ano}: tentativa ${tentativa + 1}/3: ${erro.message}`);
        if (erro.definitivo || tentativa === 2) throw erro;
        await esperar(atraso);
      }
    }
  }

  await mkdir(cache, { recursive: true });
  for (const ano of anos) {
    const fonte = `${base}${ano}/constructorStandings.json?limit=100`;
    try {
      const { rodadaFinal, top3, origem } = await obter(ano, fonte);
      for (const entrada of top3) {
        const candidatos = pares.filter(p => p.ano === ano && p.equipe === entrada.nome);
        entrada.equipe = candidatos.length === 1 ? candidatos[0].equipe : null;
        if (!entrada.equipe) semCorrespondencia.push({ ano, ...entrada,
          equipesDisponiveis: pares.filter(p => p.ano === ano).map(p => p.equipe) });
      }
      temporadas.push({ ano, fonte, rodadaFinal, top3 });
      console.log(`${ano}: ${origem}; ${top3.map(x => `${x.rank} ${x.nome}=${x.equipe ?? 'SEM CORRESPONDÊNCIA'}`).join('; ')}`);
    } catch (erro) {
      falhas.push({ ano, fonte, erro: erro.message });
      // Evita martelar o serviço em indisponibilidade persistente; próxima execução retoma cache.
      for (const restante of anos.filter(x => x > ano)) {
        falhas.push({ ano: restante, fonte: `${base}${restante}/constructorStandings.json?limit=100`,
          erro: `Não solicitado: coleta interrompida após falha em ${ano}` });
      }
      break;
    }
  }

  const cobertura = {
    fonte: 'Jolpica — classificação final do campeonato de construtores (não soma de corridas)',
    intervalo: [1958, 2025], antesDe1958: 'Sem campeonato de construtores; sem bônus top3',
    temporadasObtidas: temporadas.length, temporadasEsperadas: anos.length,
    correspondencias: temporadas.length * 3 - semCorrespondencia.length,
    criterioConciliacao: 'Nome oficial idêntico ao nome local na mesma temporada; sem inferência por linhagem',
    semCorrespondencia, falhas,
    completo: temporadas.length === anos.length && !semCorrespondencia.length && !falhas.length,
  };
  if (!cobertura.completo) {
    await writeFile(join(cache, 'diagnostico-parcial.json'), `${JSON.stringify({ cobertura, temporadas }, null, 2)}\n`);
    throw new Error(`Coleta incompleta: ${falhas.length} falhas; ${semCorrespondencia.length} sem correspondência`);
  }
  await mkdir(join(raiz, 'scripts/derived'), { recursive: true });
  // Uma linha por temporada mantém a tabela pequena e fácil de auditar.
  await writeFile(join(raiz, 'scripts/derived/draft-top3.json'),
    `{\n  "proposta": true,\n  "antesDe1958": "Sem bônus top3",\n  "temporadas": [\n${
      temporadas.map(t => `    ${JSON.stringify(t)}`).join(',\n')
    }\n  ]\n}\n`);
  await writeFile(join(raiz, 'docs/draft-top3-cobertura.json'), `${JSON.stringify(cobertura, null, 2)}\n`);
  console.log(JSON.stringify({ temporadas: temporadas.length, semCorrespondencia: semCorrespondencia.length, falhas: falhas.length }));
  return cobertura;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  executar().catch(erro => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}
