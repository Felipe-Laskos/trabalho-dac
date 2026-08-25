export type TipoUsuario = 'CLIENTE' | 'GERENTE';

export interface LoginInput {
  email: string;
  senha: string;
}

export interface Usuario {
  cpf: string;
  nome: string;
  email: string;
}

export interface LoginResponse {
  auth: boolean;
  token: string;
  tipo: TipoUsuario;
  usuario: Usuario;
}
