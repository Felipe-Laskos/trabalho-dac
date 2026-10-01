import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Solicitacao, SolicitacoesList } from '../models/solicitacao.model';
import { AutocadastroInput } from '../models/cliente.model';

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
}
