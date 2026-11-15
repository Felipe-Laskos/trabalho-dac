import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Job } from '../models/job.model';
import { ApiService } from './api.service';
import { mensagemDeErro } from './erro.util';

// o job pode ainda concluir depois do prazo: quem chama precisa distinguir isto de uma falha
export class TempoEsgotadoError extends Error {}

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly base = environment.apiUrl;
  private readonly sincronos = new Map<string, unknown>();
  private ultimoSincrono = 0;

  async iniciar(metodo: 'GET' | 'POST' | 'DELETE', caminho: string, corpo?: unknown): Promise<Job> {
    const resposta = await this.api.iniciar<Job>(metodo, caminho, corpo);

    if (resposta.status === 202) {
      return resposta.body as Job;
    }

    const jobId = `sincrono-${++this.ultimoSincrono}`;
    this.sincronos.set(jobId, resposta.body);
    return this.jobConcluido(jobId);
  }

  async aguardar(jobId: string, timeoutMs = 60_000): Promise<Job> {
    if (this.sincronos.has(jobId)) {
      return this.jobConcluido(jobId);
    }

    const inicio = Date.now();
    let intervalo = 300;

    while (true) {
      const job = await firstValueFrom(
        this.http.get<Job>(`${this.base}/jobs/${jobId}/status`),
      );

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

    if (this.sincronos.has(job.jobId)) {
      const corpo = this.sincronos.get(job.jobId) as T;
      this.sincronos.delete(job.jobId);
      return corpo;
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

  private jobConcluido(jobId: string): Job {
    return { jobId, status: 'CONCLUIDO', resultType: 'inline', dominio: null, resourceId: null, erro: null };
  }
}