import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Job } from '../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  async aguardar(jobId: string, timeoutMs = 60_000): Promise<Job> {
    const inicio = Date.now();
    let intervalo = 300;

    while (true) {
      const job = await firstValueFrom(
        this.http.get<Job>(`${this.base}/jobs/${jobId}/status`)
      );

      if (job.status !== 'PENDENTE') {
        return job;
      }

      if (Date.now() - inicio >= timeoutMs) {
        throw new Error('A operação não concluiu no tempo esperado.');
      }

      await new Promise(resolve => setTimeout(resolve, intervalo));

      intervalo = Math.min(intervalo * 1.5, 2000);
    }
  }
  
  async resultado<T>(job: Job): Promise<T> {
    if (job.status === 'FALHA') {
      throw new Error(job.erro ?? 'Operação falhou');
    }

    if (job.resultType === 'resource') {
      return firstValueFrom(
        this.http.get<T>(
          `${this.base}/${job.dominio}/${job.resourceId}`
        )
      );
    }

    return firstValueFrom(
      this.http.get<T>(
        `${this.base}/jobs/${job.jobId}/result`
      )
    );
  }
}