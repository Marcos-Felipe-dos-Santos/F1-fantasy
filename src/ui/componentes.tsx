/**
 * Cards reutilizáveis da UI (PR 1.7a). Componentes de apresentação puros:
 * recebem dados já resolvidos pela engine/dataset e disparam callbacks —
 * nunca decidem regra de jogo.
 */

import type { Raridade } from '../engine/types';
import type { SlotVisivel } from './loadout-view';

/** Rótulos curtos das notas, como no GDD §6 — toda nota é qualidade (99 = melhor). */
const ROTULOS_NOTA: Record<string, string> = {
  rit: 'RIT',
  quali: 'QUALI',
  cons: 'CONS',
  ult: 'ULT',
  def: 'DEF',
  chu: 'CHU',
  pneu: 'PNEU',
  larg: 'LARG',
  sf: 'SF',
  aero: 'AERO',
  mec: 'MEC',
  ppeso: 'PPESO',
  conf: 'CONF',
  freio: 'FREIO',
  motor: 'MOTOR',
  confMotor: 'CONF_MOTOR',
  call: 'CALL',
  sangf: 'SANGF',
  pitTempo: 'PIT_TEMPO',
  pitErro: 'PIT_ERRO',
};

/** Rótulo curto de um atributo (nota ou alvo de peça). Cai pro nome em maiúsculo se desconhecido. */
export function rotuloAtributo(chave: string): string {
  return ROTULOS_NOTA[chave] ?? chave.toUpperCase();
}

/**
 * Cast de exibição: as interfaces de notas da engine (`NotasPiloto`,
 * `NotasChassi`, etc.) não têm índice de string explícito, mas todos os seus
 * campos são `Nota` (number) — mesma convenção usada em `engine/bots.ts`
 * (`notasDoSlot`/`media`). Só usado pra alimentar `TabelaNotas`; nunca decide
 * nada de regra de jogo.
 */
export function comoNotas(notas: object): Record<string, number> {
  return notas as unknown as Record<string, number>;
}

/** Escala de raridade das peças icônicas (§7): emoji + rótulo pt-BR + classe CSS. */
const INFO_RARIDADE: Record<Raridade, { emoji: string; classe: string; rotulo: string }> = {
  comum: { emoji: '🟢', classe: 'raridade-comum', rotulo: 'Comum' },
  raro: { emoji: '🔵', classe: 'raridade-raro', rotulo: 'Raro' },
  epico: { emoji: '🟣', classe: 'raridade-epico', rotulo: 'Épico' },
  lendario: { emoji: '🟡', classe: 'raridade-lendario', rotulo: 'Lendário' },
  proibido: { emoji: '☠️', classe: 'raridade-proibido', rotulo: 'Proibido' },
};

interface TabelaNotasProps {
  notas: Record<string, number>;
  /** Se informado, mostra "base → efetiva" nas notas que mudaram (bônus de peça aplicado). */
  notasBase?: Record<string, number>;
}

/** Grade de notas (0-99) de um componente, com rótulos curtos do GDD §6. */
export function TabelaNotas({ notas, notasBase }: TabelaNotasProps) {
  return (
    <dl className="tabela-notas">
      {Object.entries(notas).map(([chave, valor]) => {
        const base = notasBase?.[chave];
        const mudou = base !== undefined && base !== valor;
        return (
          <div className="tabela-notas__item" key={chave}>
            <dt>{rotuloAtributo(chave)}</dt>
            <dd>{mudou ? `${base} → ${valor}` : valor}</dd>
          </div>
        );
      })}
    </dl>
  );
}

interface CardComponenteProps {
  /** Rótulo do slot (ex.: "Piloto", "Chassi"). */
  rotulo: string;
  /** Nome do registro (piloto, estrategista) — omitido pra chassi/motor/pit, que não têm nome próprio. */
  nome?: string;
  notas: Record<string, number>;
  notasBase?: Record<string, number>;
  /** `false` = slot já preenchido em rodada anterior: card esmaecido, não clicável. Default `true`. */
  disponivel?: boolean;
  onClick?: () => void;
}

/** Card de um componente do carro (piloto/chassi/motor/estrategista/pit). Clicável só se disponível e com onClick. */
export function CardComponente({
  rotulo,
  nome,
  notas,
  notasBase,
  disponivel = true,
  onClick,
}: CardComponenteProps) {
  const clicavel = disponivel && onClick !== undefined;
  const classes = [
    'card',
    'card-componente',
    clicavel ? 'card--clicavel' : '',
    !disponivel ? 'card--desabilitado' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const conteudo = (
    <>
      <div className="card__cabecalho">
        <span className="card__rotulo">{rotulo}</span>
        {!disponivel && <span className="card__tag">já preenchido</span>}
      </div>
      {nome && <div className="card__nome">{nome}</div>}
      <TabelaNotas notas={notas} notasBase={notasBase} />
    </>
  );

  if (clicavel) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {conteudo}
      </button>
    );
  }
  return <div className={classes}>{conteudo}</div>;
}

interface CardPecaProps {
  peca: {
    nome: string;
    categoria: string;
    raridade: Raridade;
    atributosAlvo: string[];
    bonus: number;
    risco: number;
  };
  onClick?: () => void;
}

/** Card de uma peça icônica (§7): raridade com cor/emoji, atributos-alvo, bônus e risco. */
export function CardPeca({ peca, onClick }: CardPecaProps) {
  const info = INFO_RARIDADE[peca.raridade];
  const clicavel = onClick !== undefined;
  const classes = ['card', 'card-peca', info.classe, clicavel ? 'card--clicavel' : ''].join(' ');

  const conteudo = (
    <>
      <div className="card__cabecalho">
        <span className="card-peca__raridade">
          {info.emoji} {info.rotulo}
        </span>
      </div>
      <div className="card__nome">{peca.nome}</div>
      <div className="card-peca__categoria">{peca.categoria}</div>
      <div className="card-peca__alvo">Alvo: {peca.atributosAlvo.map(rotuloAtributo).join(', ')}</div>
      <div className="card-peca__bonus-risco">
        <span>Bônus +{peca.bonus}</span>
        <span>Risco {peca.risco}</span>
      </div>
    </>
  );

  if (clicavel) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {conteudo}
      </button>
    );
  }
  return <div className={classes}>{conteudo}</div>;
}

/** Painel lateral com o loadout parcial do humano: slots já preenchidos, nome + equipe/ano de origem. */
export function LoadoutParcial({ slots }: { slots: SlotVisivel[] }) {
  return (
    <aside className="loadout-parcial">
      <h3>Seu carro (parcial)</h3>
      {slots.length === 0 ? (
        <p className="loadout-parcial__vazio">Nenhum componente escolhido ainda.</p>
      ) : (
        <ul>
          {slots.map((slot) => (
            <li key={slot.rotulo}>
              <span className="loadout-parcial__rotulo">{slot.rotulo}</span>
              <span className="loadout-parcial__nome">{slot.nome}</span>
              <span className="loadout-parcial__origem">{slot.origem}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
