import type { Links } from './comum.model';
import type { Dinheiro } from './dinheiro';

export interface Conta {
  numero: string;
  cpfCliente: string;
  cpfGerente: string;
  saldo: Dinheiro;
  dataCriacao: string;
  _links: Links;
}

export type TipoOperacao = 'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA';

export interface OperacaoInput {
  valor: Dinheiro;
}

export interface TransferenciaInput {
  contaDestino: string;
  valor: Dinheiro;
}

export interface ParteTransferencia {
  numeroConta: string;
  cpf: string;
  nome: string;
}

export interface OperacaoRealizada {
  numeroConta: string;
  tipo: TipoOperacao;
  dataHora: string;
  valor: Dinheiro;
  destino?: ParteTransferencia | null;
  _links: Links;
}

export interface Movimentacao {
  dataHora: string;
  tipo: TipoOperacao;
  valor: Dinheiro;
  origem?: ParteTransferencia | null;
  destino?: ParteTransferencia | null;
}

export interface Extrato {
  numeroConta: string;
  dataInicio: string;
  dataFim: string;
  saldoAbertura: Dinheiro;
  movimentacoes: Movimentacao[];
  _links: Links;
}
