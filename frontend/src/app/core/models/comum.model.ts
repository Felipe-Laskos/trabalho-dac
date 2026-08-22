export interface Link {
  href: string;
}
export type Links = Record<string, Link>;

export interface Erro {
  status: number;
  erro: string;
  mensagem: string;
}
