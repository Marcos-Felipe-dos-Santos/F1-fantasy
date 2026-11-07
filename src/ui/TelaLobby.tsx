/**
 * Lobby da sala online (PR 3.3). Componente de apresentação: recebe o estado
 * público da sala e dispara callbacks — nenhuma regra de jogo mora aqui.
 *
 * O que ele precisa comunicar bem, porque é o que confunde no online:
 * - **quem sou eu** na lista (o servidor aloca `humano-01..22`, não o jogador);
 * - **quem é o anfitrião**, já que só ele inicia;
 * - **por que o botão de iniciar está desabilitado** — faltam prontos ou falta
 *   gente. Botão cinza sem explicação é o que faz o jogador achar que travou.
 * - **o estado da conexão**, porque o online cai e a pessoa precisa saber que o
 *   jogo está tentando voltar sozinho em vez de estar quebrado.
 */

import type { EstadoConexao } from '../net/conexao';
import { MIN_HUMANOS, QTD_JOGADORES, type EstadoSalaPublico } from '../net/tipos';
import { codigoLegivel } from '../net/codigo-sala';
import './online.css';

interface TelaLobbyProps {
  sala: EstadoSalaPublico | null;
  euSou: string | null;
  estadoConexao: EstadoConexao;
  erro: string | null;
  nome: string;
  onNomeChange: (nome: string) => void;
  onEntrar: () => void;
  onPronto: (pronto: boolean) => void;
  onIniciar: () => void;
  onConfigurarFormato?: (nEtapas: 1 | 5 | 10) => void;
  onSair: () => void;
  onVoltar: () => void;
  /** Link para copiar e mandar pros amigos. */
  urlDaSala: string;
}

const ROTULO_CONEXAO: Record<EstadoConexao, string> = {
  conectando: '🟡 conectando…',
  aberta: '🟢 conectado',
  reconectando: '🟠 reconectando…',
  fechada: '⚪ desconectado',
};

/** Por que ainda não dá pra iniciar. `null` = dá. */
function motivoParaNaoIniciar(sala: EstadoSalaPublico): string | null {
  if (sala.jogadores.length < MIN_HUMANOS) {
    const faltam = MIN_HUMANOS - sala.jogadores.length;
    return `Faltam ${faltam} jogador${faltam > 1 ? 'es' : ''} pra começar.`;
  }
  const naoProntos = sala.jogadores.filter((j) => !j.pronto);
  if (naoProntos.length > 0) {
    return `Esperando ${naoProntos.map((j) => j.nome).join(', ')} ficar${naoProntos.length > 1 ? 'em' : ''} pronto${naoProntos.length > 1 ? 's' : ''}.`;
  }
  return null;
}

export function TelaLobby({
  sala,
  euSou,
  estadoConexao,
  erro,
  nome,
  onNomeChange,
  onEntrar,
  onPronto,
  onIniciar,
  onConfigurarFormato,
  onSair,
  onVoltar,
  urlDaSala,
}: TelaLobbyProps) {
  const eu = sala?.jogadores.find((j) => j.id === euSou) ?? null;
  const souAnfitriao = euSou !== null && sala?.anfitriaoId === euSou;
  const motivo = sala !== null ? motivoParaNaoIniciar(sala) : null;
  const podeIniciar = souAnfitriao && motivo === null;

  return (
    <div className="tela-lobby">
      <header className="tela-lobby__topo">
        <h1>Sala online</h1>
      </header>

      <section className="card online__card" aria-label="Dados da sala">
        <div className="online__painel-topo">
          <div>
            <p className="online__rotulo">Código da sala</p>
            <p className="tela-sala__codigo">
              {sala !== null ? codigoLegivel(sala.salaId) : 'Aguardando sala…'}
            </p>
          </div>
          <span className="tela-lobby__conexao" role="status">
            {ROTULO_CONEXAO[estadoConexao]}
          </span>
        </div>
        <p className="tela-lobby__link">
          Link da sala: <code>{urlDaSala}</code>
        </p>
      </section>

      {erro !== null && <p className="tela-lobby__erro">⚠️ {erro}</p>}

      {eu === null ? (
        <form
          className="card online__card tela-lobby__entrada"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (nome.trim().length > 0) onEntrar();
          }}
        >
          <h2>Entre no grid</h2>
          <label className="form-inicio__campo">
            Seu nome
            <input
              type="text"
              value={nome}
              maxLength={20}
              onChange={(evento) => onNomeChange(evento.target.value)}
              placeholder="como os outros vão te ver"
              autoFocus
            />
          </label>
          <button type="submit" className="botao-primario" disabled={nome.trim().length === 0}>
            Entrar na sala
          </button>
        </form>
      ) : (
        <>
          <section className="card online__card" aria-label="Formato da partida">
            <h2>Formato da partida</h2>
            <label className="form-inicio__campo">
              {souAnfitriao ? 'Escolha como vocês vão correr' : 'Escolhido pelo anfitrião'}
              <select
                aria-label="Formato da partida"
                value={sala?.nEtapas ?? 5}
                disabled={!souAnfitriao || !onConfigurarFormato || estadoConexao !== 'aberta'}
                onChange={(evento) => {
                  const n = Number(evento.target.value);
                  if (n === 1 || n === 5 || n === 10) onConfigurarFormato?.(n);
                }}
              >
                <option value={1}>Corrida única</option>
                <option value={5}>Campeonato curto · 5 etapas</option>
                <option value={10}>Campeonato completo · 10 etapas</option>
              </select>
            </label>
            <p className="tela-sala__dica">Ao mudar o formato, todos precisam confirmar que estão prontos novamente.</p>
          </section>
          <section className="card online__card" aria-label="Jogadores na sala">
            <h2>Jogadores</h2>
            <ul className="tela-lobby__jogadores">
              {sala!.jogadores.map((jogador) => (
                <li
                  key={jogador.id}
                  className={jogador.id === euSou ? 'tela-lobby__jogador--eu' : undefined}
                >
                  <div className="online__identidade">
                    <strong>{jogador.nome}</strong>
                    {jogador.id === euSou && (
                      <span className="online__badge" aria-label="Seu jogador (você)">
                        Você
                      </span>
                    )}
                    {jogador.id === sala!.anfitriaoId && (
                      <span className="online__badge">👑 Anfitrião</span>
                    )}
                  </div>
                  <span
                    className={
                      jogador.pronto ? 'online__status online__status--pronto' : 'online__status'
                    }
                  >
                    {jogador.pronto ? '✅ Pronto' : '⌛ Aguardando pronto'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="tela-lobby__contagem">
              {sala!.jogadores.length} de {QTD_JOGADORES} · as vagas restantes viram bots.
            </p>
          </section>

          <div className="tela-lobby__acoes">
            <button
              type="button"
              className={souAnfitriao || eu.pronto ? 'botao-secundario' : 'botao-primario'}
              onClick={() => onPronto(!eu.pronto)}
            >
              {eu.pronto ? 'Não estou pronto' : 'Estou pronto'}
            </button>
            {souAnfitriao && (
              <button
                type="button"
                className="botao-primario"
                onClick={onIniciar}
                disabled={!podeIniciar}
              >
                Começar o draft
              </button>
            )}
            <button type="button" className="botao-secundario online__sair" onClick={onSair}>
              Sair da sala
            </button>
          </div>

          {/* Nunca deixar o botão cinza sem dizer por quê. */}
          {souAnfitriao && motivo !== null && <p className="tela-lobby__motivo">{motivo}</p>}
          {!souAnfitriao && (
            <p className="tela-lobby__motivo">
              Só o anfitrião 👑 começa o draft.{motivo !== null ? ` ${motivo}` : ''}
            </p>
          )}
        </>
      )}

      <button type="button" className="botao-secundario tela-lobby__voltar" onClick={onVoltar}>
        ← Voltar ao início
      </button>
    </div>
  );
}
