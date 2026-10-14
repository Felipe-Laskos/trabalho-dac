import { Injectable, inject } from '@angular/core';
import type { Job } from '../models/job.model';
import type { Gerente, GerenteInput, GerenteUpdate, GerentesList } from '../models/gerente.model';
import { caminhoDoHref } from '../../shared/util/hateoas.util';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class GerenteService {
  private readonly api = inject(ApiService);

  listar(): Promise<GerentesList> {
    return this.api.get<GerentesList>('/gerentes');
  }

  buscar(cpf: string): Promise<Gerente> {
    return this.api.get<Gerente>(`/gerentes/${cpf}`);
  }

  criar(dados: GerenteInput): Promise<Job> {
    return this.api.post<Job>('/gerentes', dados);
  }

  atualizar(href: string, dados: GerenteUpdate): Promise<Gerente> {
    const payload: GerenteUpdate = { nome: dados.nome, telefone: dados.telefone };
    return this.api.put<Gerente>(href, payload);
  }

  remover(href: string): Promise<Job> {
    return this.api.delete<Job>(caminhoDoHref(href));
  }
}