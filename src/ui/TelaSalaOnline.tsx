/**
 * Entrada do modo Online (PR 3.3.2): **criar uma sala** ou **entrar na de um
 * amigo**. Componente de apresentação — nenhuma regra de jogo aqui.
 *
 * Substitui o campo "nome da sala" livre, em que `sala-1` era o default e
 * qualquer um caía na partida dos outros. Agora o código é sorteado pelo
 * servidor, tem 6 dígitos hexadecimais, e entrar exige o código exato.
 */

import { useState, type FormEvent } from 'react';
import { codigoLegivel, normalizarCodigo, TAMANHO_CODIGO } from '../net/codigo-sala';

interface TelaSalaOnlineProps {
  /** Pede ao servidor um código novo; `null` enquanto não voltou. */
  onCriar: () => void;
  onEntrar: (codigo: string) => void;
  onVoltar: () => void;
  /** Código recém-criado, para mostrar e compartilhar. */
  codigoCriado: string | null;
  criando: boolean;
  erro: string | null;
  /** Link completo da sala criada, para copiar. */
  linkDaSala: (codigo: string) => string;
}

/** Copia e devolve se deu certo — `navigator.clipboard` falha em http sem TLS. */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        // `clipboard` só funciona em contexto seguro (https ou localhost). No
        // IP da LAN ele falha — daí o aviso em vez de um clique que não faz
        // nada e ninguém entende.
        setCopiado(await copiar(texto));
      }}
    >
      {copiado ? '✅ copiado' : rotulo}
    </button>
  );
}

export function TelaSalaOnline({
  onCriar,
  onEntrar,
  onVoltar,
  codigoCriado,
  criando,
  erro,
  linkDaSala,
}: TelaSalaOnlineProps) {
  const [digitado, setDigitado] = useState('');
  const codigoValido = normalizarCodigo(digitado);

  function entrar(evento: FormEvent) {
    evento.preventDefault();
    if (codigoValido !== null) onEntrar(codigoValido);
  }

  if (codigoCriado !== null) {
    const link = linkDaSala(codigoCriado);
    return (
      <div className="tela-sala">
        <h1>Sala criada</h1>
        <p className="tela-sala__codigo">{codigoLegivel(codigoCriado)}</p>
        <p className="tela-sala__dica">
          Mande o link pros amigos — quem abrir entra direto. Ou dite o código.
        </p>
        <p className="tela-sala__link">
          <code>{link}</code>
        </p>
        <div className="tela-sala__acoes">
          <BotaoCopiar texto={link} rotulo="📋 Copiar link" />
          <BotaoCopiar texto={codigoCriado} rotulo="Copiar código" />
        </div>
        <button type="button" className="botao-primario" onClick={() => onEntrar(codigoCriado)}>
          Ir para a sala
        </button>
        <button type="button" className="tela-sala__voltar" onClick={onVoltar}>
          ← Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="tela-sala">
      <h1>Jogar online</h1>
      {erro !== null && <p className="tela-lobby__erro">⚠️ {erro}</p>}

      <div className="tela-sala__opcao">
        <h2>Criar sala</h2>
        <p className="tela-sala__dica">
          O servidor sorteia um código de {TAMANHO_CODIGO} dígitos que só quem você mandar vai
          saber.
        </p>
        <button type="button" className="botao-primario" onClick={onCriar} disabled={criando}>
          {criando ? 'Criando…' : 'Criar sala'}
        </button>
      </div>

      <form className="tela-sala__opcao" onSubmit={entrar}>
        <h2>Entrar na sala de um amigo</h2>
        <label className="form-inicio__campo">
          Código da sala
          <input
            type="text"
            value={digitado}
            onChange={(evento) => setDigitado(evento.target.value)}
            placeholder="A3F9C2"
            maxLength={TAMANHO_CODIGO + 4}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {digitado.length > 0 && codigoValido === null && (
          <p className="tela-sala__dica">
            O código tem {TAMANHO_CODIGO} dígitos de 0-9 e A-F. Maiúsculas, minúsculas, espaços e
            hífens tanto faz.
          </p>
        )}
        <button type="submit" className="botao-primario" disabled={codigoValido === null}>
          Entrar
        </button>
      </form>

      <button type="button" className="tela-sala__voltar" onClick={onVoltar}>
        ← Voltar ao início
      </button>
    </div>
  );
}
