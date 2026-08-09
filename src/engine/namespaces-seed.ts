/**
 * Registro dos NAMESPACES de seed do projeto (risco aprovado da Fase 3).
 *
 * Toda aleatoriedade do jogo sai de `deriveSeed(seed, rotulo)`. Dois rótulos
 * iguais em lugares diferentes = dois sub-streams que se acreditam
 * independentes e não são: as mesmas sequências saem dos dois, correlacionando
 * coisas que deveriam ser independentes. Não quebra teste nenhum — é o tipo de
 * defeito que só aparece como "esse jogo parece viciado".
 *
 * A Fase 3 tornou isso concreto: o modo online acrescenta rótulos derivados da
 * mesma seed, e um `online:*` colidindo com um rótulo de engine faria a partida
 * online divergir da offline sem nenhum sintoma. A regra aprovada é: **todo
 * rótulo do online começa com `online:`**, e o registro abaixo existe pra que a
 * colisão seja erro de teste, não descoberta em produção.
 *
 * Este módulo é só DADO — nenhuma função de jogo depende dele em runtime. Ele
 * existe pro teste (`namespaces-seed.test.ts`), que também varre o código-fonte
 * atrás de rótulo não registrado.
 */

/** Um namespace de seed e quem é dono dele. */
export interface NamespaceSeed {
  /** Prefixo até o primeiro `:`, ou o rótulo inteiro quando não há `:`. */
  prefixo: string;
  dono: string;
}

/**
 * Todos os namespaces em uso. **Rótulo novo entra aqui antes de entrar no
 * código** — o teste de varredura reprova o que não estiver nesta lista.
 */
export const NAMESPACES_SEED: readonly NamespaceSeed[] = [
  { prefixo: 'bots', dono: 'engine/bots.ts — perfis dos bots (atribuirPerfis)' },
  { prefixo: 'draft', dono: 'engine/draft.ts + draft-utils.ts + bots.ts — sorteios, peças, ordem, decisões de bot' },
  { prefixo: 'calendario', dono: 'engine/campeonato.ts — calendário sorteado (PR 8.1)' },
  { prefixo: 'camp', dono: 'engine/campeonato.ts — seed por etapa (seedDaEtapa)' },
  { prefixo: 'corrida', dono: 'engine/corrida.ts — stream por carro e clima' },
  { prefixo: 'quali', dono: 'engine/quali.ts — stream por carro na classificação' },
  { prefixo: 'narracao', dono: 'ui/narracao.ts — HASH de variedade, não stream (PR narração rica)' },
  { prefixo: 'pit', dono: 'scripts/alavancas.ts — harness de balanceamento' },
  { prefixo: 'grid', dono: 'scripts/balance.ts — harness' },
  { prefixo: 'paradas', dono: 'scripts/balance.ts — harness' },
  { prefixo: 'online', dono: 'net/ — Fase 3; TODO rótulo do online usa este prefixo' },
  { prefixo: 'teste', dono: 'testes — ordem de chegada e permutações; nunca em produção' },
];

/** Prefixo reservado ao modo online. */
export const PREFIXO_ONLINE = 'online';

/** O namespace de um rótulo: o pedaço antes do primeiro `:`, ou o rótulo inteiro. */
export function namespaceDoRotulo(rotulo: string): string {
  const separador = rotulo.indexOf(':');
  return separador === -1 ? rotulo : rotulo.slice(0, separador);
}
