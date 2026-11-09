import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { RelatorioService } from './relatorio.service';
import { ApiService } from './api.service';
import type { Job } from '../models/job.model';

describe('RelatorioService', () => {
  let service: RelatorioService;
  let apiMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiMock = {
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RelatorioService,
        {
          provide: ApiService,
          useValue: apiMock,
        },
      ],
    });

    service = TestBed.inject(RelatorioService);
  });

  it('deve chamar o endpoint correto para gerar o relatório de clientes', async () => {
    const job: Job = {
      jobId: '123',
      status: 'PENDENTE',
      resultType: null,
      dominio: null,
      resourceId: null,
      erro: null,
    };

    apiMock.get.mockResolvedValue(job);

    const resultado = await service.gerarClientes();

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith('/relatorios/clientes');
    expect(resultado).toEqual(job);
  });

  it('deve retornar o job recebido da API', async () => {
    const job: Job = {
      jobId: '456',
      status: 'CONCLUIDO',
      resultType: 'inline',
      dominio: null,
      resourceId: null,
      erro: null,
    };

    apiMock.get.mockResolvedValue(job);

    await expect(service.gerarClientes()).resolves.toEqual(job);
  });

  it('deve propagar o erro quando a API falhar', async () => {
    const erro = new Error('Falha ao gerar relatório.');

    apiMock.get.mockRejectedValue(erro);

    await expect(service.gerarClientes()).rejects.toBe(erro);
  });
});
