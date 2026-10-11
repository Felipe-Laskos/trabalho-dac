import { Injectable, inject } from '@angular/core';
import type {Gerente, GerenteUpdate, GerentesList } from '../models/gerente.model';

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

  atualizar(href: string, dados: GerenteUpdate ): Promise<Gerente> {
    const payload: GerenteUpdate = { nome: dados.nome, telefone: dados.telefone };
    return this.api.put<Gerente>(href, payload);
  }
}