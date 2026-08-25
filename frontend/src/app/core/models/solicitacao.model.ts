import type { AutocadastroInput } from './cliente.model';
import type { Links } from './comum.model';

export type StatusSolicitacao = 'PENDENTE' | 'APROVADA' | 'NAO_APROVADA';

export interface Solicitacao extends AutocadastroInput {
  status: StatusSolicitacao;
  motivo: string | null;
  dataHoraProcessamento: string | null;
  _links: Links;
}

export interface SolicitacoesList {
  solicitacoes: Solicitacao[];
  _links: Links;
}

export interface RejeicaoInput {
  motivo: string;
}
