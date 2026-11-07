import type { EstadoConexao } from '../net/conexao';

export interface CoordenadaComandoDraft {
  fase: string;
  turno: number;
  revisao: number;
  erros: number;
}

export function aguardaComandoDraft(
  enviado: CoordenadaComandoDraft | null,
  atual: CoordenadaComandoDraft | null,
  conexao: EstadoConexao,
): boolean {
  return (
    conexao === 'aberta' &&
    enviado !== null &&
    atual !== null &&
    enviado.fase === atual.fase &&
    enviado.turno === atual.turno &&
    enviado.revisao === atual.revisao &&
    enviado.erros === atual.erros
  );
}
