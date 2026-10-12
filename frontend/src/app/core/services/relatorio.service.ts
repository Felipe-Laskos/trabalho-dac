import { Injectable, inject } from '@angular/core';
import type { Job } from '../models/job.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private readonly api = inject(ApiService);

  /** 202 + job. O resultado inline vem depois, em GET /jobs/{id}/result. */
  gerarClientes(): Promise<Job> {
    return this.api.get<Job>('/relatorios/clientes');
  }
}
