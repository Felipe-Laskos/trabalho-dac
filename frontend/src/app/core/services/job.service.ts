import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Job } from '../models/job.model';
import { mensagemDeErro } from './erro.util';

const OPERACAO_EXPIRADA = 'A operação expirou.';

// o job pode ainda concluir depois do prazo: quem chama precisa distinguir isto de uma falha
export class TempoEsgotadoError extends Error {}

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
      let job: Job;
      try {
        job = await firstValueFrom(
          this.http.get<Job>(`${this.base}/jobs/${jobId}/status`)
        );
      } catch (erro) {
        if (erro instanceof HttpErrorResponse && erro.status === 404) {
          throw new Error(OPERACAO_EXPIRADA);
        }
        throw erro;
      }

      if (job.status !== 'PENDENTE') {
        return job;
      }

      if (Date.now() - inicio >= timeoutMs) {
        throw new TempoEsgotadoError('A operação não concluiu no tempo esperado.');
      }

      await new Promise(resolve => setTimeout(resolve, intervalo));

      intervalo = Math.min(intervalo * 1.5, 2000);
    }
  }
  
  async resultado<T>(job: Job): Promise<T> {
    if (job.status === 'FALHA') {
      throw new Error(mensagemDeErro(job));
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