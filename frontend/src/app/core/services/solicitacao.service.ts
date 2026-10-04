import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { RejeicaoInput, Solicitacao, SolicitacoesList } from '../models/solicitacao.model';
import { AutocadastroInput } from '../models/cliente.model';
import { caminhoDoHref } from '../../shared/util/hateoas.util';

@Injectable({
  providedIn: 'root',
})
export class SolicitacaoService {
  private readonly api = inject(ApiService);

  criar(dados: AutocadastroInput): Promise<Solicitacao> {
    return this.api.post<Solicitacao>('/solicitacoes', dados);
  }

  listar(): Promise<SolicitacoesList> {
    return this.api.get<SolicitacoesList>('/solicitacoes');
  }

  rejeitar(href: string, dados: RejeicaoInput): Promise<Solicitacao> {
  return this.api.post<Solicitacao>(caminhoDoHref(href), dados);
  }
}
