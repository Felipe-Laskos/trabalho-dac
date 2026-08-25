export interface EnderecoAutocadastro {
  logradouro: string;
  numero: string;
  complemento: null | string;
  cep: string;
  cidade: string;
  uf: string;
}

export interface Autocadastro {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: string;
  endereco: EnderecoAutocadastro;
}

