import type { Links } from './comum.model';

export interface GerenteInput {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface GerenteUpdate {
  nome: string;
  telefone: string;
}

export interface Gerente {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
  quantidadeClientes?: number | null;
  _links: Links;
}

export interface GerentesList {
  gerentes: Gerente[];
  _links: Links;
}
