import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Solicitacao } from '../models/solicitacao.model';
import { AutocadastroInput } from '../models/cliente.model';

@Injectable({
  providedIn: 'root',
})
export class SolicitacaoService {
  private readonly api = inject(ApiService);

  criar(dados: AutocadastroInput): Promise<Solicitacao> {
    return this.api.post<Solicitacao>('/solicitacoes', dados);
  }
}
