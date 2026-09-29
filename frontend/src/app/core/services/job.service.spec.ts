import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { vi } from 'vitest';

import { JobService } from './job.service';
import type { Job } from '../models/job.model';
import { environment } from '../../../environments/environment';

describe('JobService', () => {
  let service: JobService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        JobService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(JobService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it('deve retornar o job quando o status for CONCLUIDO', async () => {
    const job: Job = {
      jobId: '123',
      status: 'CONCLUIDO',
      resultType: 'resource',
      dominio: 'clientes',
      resourceId: '456',
      erro: null
    };

    const promise = service.aguardar('123');

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/jobs/123/status`
    );

    expect(request.request.method).toBe('GET');

    request.flush(job);

    await expect(promise).resolves.toEqual(job);
  });

  it('deve retornar o job quando o status for FALHA', async () => {
    const job: Job = {
      jobId: '123',
      status: 'FALHA',
      resultType: null,
      dominio: null,
      resourceId: null,
      erro: 'Cliente já foi aprovado.'
    };

    const promise = service.aguardar('123');

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/jobs/123/status`
    );

    request.flush(job);

    await expect(promise).resolves.toEqual(job);
  });

  it('deve continuar fazendo polling enquanto o job estiver PENDENTE', async () => {
    vi.useFakeTimers();

    const pendente: Job = {
      jobId: '123',
      status: 'PENDENTE',
      resultType: null,
      dominio: null,
      resourceId: null,
      erro: null
    };

    const concluido: Job = {
      jobId: '123',
      status: 'CONCLUIDO',
      resultType: 'resource',
      dominio: 'clientes',
      resourceId: '456',
      erro: null
    };

    const promise = service.aguardar('123');

    const primeira = httpTesting.expectOne(
      `${environment.apiUrl}/jobs/123/status`
    );

    primeira.flush(pendente);

    await vi.advanceTimersByTimeAsync(300);

    const segunda = httpTesting.expectOne(
      `${environment.apiUrl}/jobs/123/status`
    );

    segunda.flush(concluido);

    await expect(promise).resolves.toEqual(concluido);
  });

  it('deve lançar a mensagem do job quando o status for FALHA', async () => {
    const job: Job = {
      jobId: '123',
      status: 'FALHA',
      resultType: null,
      dominio: null,
      resourceId: null,
      erro: 'A solicitação já foi aprovada.'
    };

    await expect(service.resultado(job))
      .rejects
      .toThrow('A solicitação já foi aprovada.');
  });

  it('deve buscar o recurso quando resultType for resource', async () => {
    const job: Job = {
      jobId: '123',
      status: 'CONCLUIDO',
      resultType: 'resource',
      dominio: 'clientes',
      resourceId: '456',
      erro: null
    };

    const promise = service.resultado<{ cpf: string }>(job);

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/clientes/456`
    );

    expect(request.request.method).toBe('GET');

    request.flush({
      cpf: '12345678900'
    });

    await expect(promise).resolves.toEqual({
      cpf: '12345678900'
    });
  });

  it('deve buscar o resultado do job quando resultType for inline', async () => {
    const job: Job = {
      jobId: '123',
      status: 'CONCLUIDO',
      resultType: 'inline',
      dominio: null,
      resourceId: null,
      erro: null
    };

    const promise = service.resultado<{ mensagem: string }>(job);

    const request = httpTesting.expectOne(
      `${environment.apiUrl}/jobs/123/result`
    );

    expect(request.request.method).toBe('GET');

    request.flush({
      mensagem: 'Gerente removido com sucesso.'
    });

    await expect(promise).resolves.toEqual({
      mensagem: 'Gerente removido com sucesso.'
    });
  });

  it('deve lançar erro quando o job não concluir dentro do timeout', async () => {
  vi.useFakeTimers();

  const pendente: Job = {
    jobId: '123',
    status: 'PENDENTE',
    resultType: null,
    dominio: null,
    resourceId: null,
    erro: null
  };

  const promise = service.aguardar('123', 300);

  const primeira = httpTesting.expectOne(
    `${environment.apiUrl}/jobs/123/status`
  );

  primeira.flush(pendente);

  await vi.advanceTimersByTimeAsync(300);

  const segunda = httpTesting.expectOne(
    `${environment.apiUrl}/jobs/123/status`
  );

  segunda.flush(pendente);

  await expect(promise)
    .rejects
    .toThrow('A operação não concluiu no tempo esperado.');
});
});