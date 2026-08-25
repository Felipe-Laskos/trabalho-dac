import type { Links } from './comum.model';
import type { Dinheiro } from './dinheiro';

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento: string | null;
  cep: string;
  cidade: string;
  uf: string;
}

export interface AutocadastroInput {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: Dinheiro;
  endereco: Endereco;
}

export interface Cliente {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: Dinheiro;
  endereco: Endereco;
  _links: Links;
}

export interface ClienteResumo {
  cpf: string;
  nome: string;
  cidade: string;
  estado: string;
  saldo: Dinheiro;
  _links: Links;
}

export interface ClientesList {
  clientes: ClienteResumo[];
  _links: Links;
}
