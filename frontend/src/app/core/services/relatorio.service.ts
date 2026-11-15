import { Injectable, inject } from '@angular/core';
import type { Job } from '../models/job.model';
import { JobService } from './job.service';

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private readonly jobs = inject(JobService);

  /** 202 + job. O resultado inline vem depois, em GET /jobs/{id}/result. */
  gerarClientes(): Promise<Job> {
    return this.jobs.iniciar('GET', '/relatorios/clientes');
  }
}
