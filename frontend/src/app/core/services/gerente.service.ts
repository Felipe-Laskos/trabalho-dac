import { Injectable, inject } from '@angular/core';
import type { Job } from '../models/job.model';
import type { Gerente, GerenteInput, GerenteUpdate, GerentesList } from '../models/gerente.model';
import { caminhoDoHref } from '../../shared/util/hateoas.util';
import { ApiService } from './api.service';
import { JobService } from './job.service';

@Injectable({
  providedIn: 'root',
})
export class GerenteService {
  private readonly api = inject(ApiService);
  private readonly jobs = inject(JobService);

  listar(): Promise<GerentesList> {
    return this.api.get<GerentesList>('/gerentes');
  }

  buscar(cpf: string): Promise<Gerente> {
    return this.api.get<Gerente>(`/gerentes/${cpf}`);
  }

  criar(dados: GerenteInput): Promise<Job> {
    return this.jobs.iniciar('POST', '/gerentes', dados);
  }

  atualizar(href: string, dados: GerenteUpdate): Promise<Gerente> {
    const payload: GerenteUpdate = { nome: dados.nome, telefone: dados.telefone };
    return this.api.put<Gerente>(href, payload);
  }

  remover(href: string): Promise<Job> {
    return this.jobs.iniciar('DELETE', caminhoDoHref(href));
  }
}