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
        <span className="tela-lobby__conexao">{ROTULO_CONEXAO[estadoConexao]}</span>
      </header>

      <p className="tela-lobby__link">
        Link da sala: <code>{urlDaSala}</code>
      </p>

      {erro !== null && <p className="tela-lobby__erro">⚠️ {erro}</p>}

      {eu === null ? (
        <form
          className="tela-lobby__entrada"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (nome.trim().length > 0) onEntrar();
          }}
        >
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
          <ul className="tela-lobby__jogadores">
            {sala!.jogadores.map((jogador) => (
              <li
                key={jogador.id}
                className={jogador.id === euSou ? 'tela-lobby__jogador--eu' : undefined}
              >
                {jogador.pronto ? '✅' : '⌛'} {jogador.nome}
                {jogador.id === euSou && ' (você)'}
                {jogador.id === sala!.anfitriaoId && ' 👑'}
              </li>
            ))}
          </ul>
          <p className="tela-lobby__contagem">
            {sala!.jogadores.length} de {QTD_JOGADORES} · as vagas restantes viram bots.
          </p>

          <div className="tela-lobby__acoes">
            <button type="button" className="botao-primario" onClick={() => onPronto(!eu.pronto)}>
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
            <button type="button" onClick={onSair}>
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

      <button type="button" className="tela-lobby__voltar" onClick={onVoltar}>
        ← Voltar ao início
      </button>
    </div>
  );
}
