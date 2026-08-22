import type { Dinheiro } from './dinheiro';

export type StatusJob = 'PENDENTE' | 'CONCLUIDO' | 'FALHA';
export type ResultType = 'resource' | 'inline' | null;

export interface Job {
  jobId: string;
  status: StatusJob;
  resultType: ResultType;
  dominio: string | null;
  resourceId: string | null;
  erro: string | null;
}

export interface ResultadoRemocaoGerente {
  mensagem: string;
}

export interface RelatorioClienteLinha {
  cpf: string;
  nome: string;
  email: string;
  salario: Dinheiro;
  numeroConta: string;
  saldo: Dinheiro;
  cpfGerente: string;
  nomeGerente: string;
}

export interface ResultadoRelatorioClientes {
  clientes: RelatorioClienteLinha[];
}
