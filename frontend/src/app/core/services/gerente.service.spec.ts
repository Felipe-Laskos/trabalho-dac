import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GerenteService } from './gerente.service';
import { ApiService } from './api.service';
import { caminhoDoHref } from '../../shared/util/hateoas.util';

import type { Job } from '../models/job.model';
import type {
  Gerente,
  GerenteInput,
  GerenteUpdate,
  GerentesList,
} from '../models/gerente.model';

describe('GerenteService', () => {
  let service: GerenteService;

  let apiMock: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const gerente = {
    cpf: '12345678900',
    nome: 'Janaina Silva',
    email: 'janaina@email.com',
    telefone: '41999999999',
  } as unknown as Gerente;

  const job: Job = {
    jobId: '123',
    status: 'PENDENTE',
    resultType: null,
    dominio: null,
    resourceId: null,
    erro: null,
  };

  beforeEach(() => {
    apiMock = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        GerenteService,
        {
          provide: ApiService,
          useValue: apiMock,
        },
      ],
    });

    service = TestBed.inject(GerenteService);
  });

  it('deve listar os gerentes pelo endpoint correto', async () => {
    const lista = [gerente] as unknown as GerentesList;

    apiMock.get.mockResolvedValue(lista);

    const resultado = await service.listar();

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith('/gerentes');
    expect(resultado).toEqual(lista);
  });

  it('deve buscar um gerente pelo CPF', async () => {
    apiMock.get.mockResolvedValue(gerente);

    const resultado = await service.buscar('12345678900');

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith('/gerentes/12345678900');
    expect(resultado).toEqual(gerente);
  });

  it('deve criar um gerente e retornar o job', async () => {
    const dados: GerenteInput = {
      cpf: '12345678900',
      nome: 'Janaina Silva',
      email: 'janaina@email.com',
      telefone: '41999999999',
    } as GerenteInput;

    apiMock.post.mockResolvedValue(job);

    const resultado = await service.criar(dados);

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post).toHaveBeenCalledWith('/gerentes', dados);
    expect(resultado).toEqual(job);
  });

  it('deve atualizar um gerente enviando somente nome e telefone', async () => {
    const href = '/gerentes/12345678900';

    const dados = {
      nome: 'Janaina Atualizada',
      telefone: '41988887777',
      cpf: '12345678900',
      email: 'outro@email.com',
    } as GerenteUpdate;

    const gerenteAtualizado = {
      ...gerente,
      nome: 'Janaina Atualizada',
      telefone: '41988887777',
    } as Gerente;

    apiMock.put.mockResolvedValue(gerenteAtualizado);

    const resultado = await service.atualizar(href, dados);

    expect(apiMock.put).toHaveBeenCalledTimes(1);
    expect(apiMock.put).toHaveBeenCalledWith(href, {
      nome: 'Janaina Atualizada',
      telefone: '41988887777',
    });

    expect(resultado).toEqual(gerenteAtualizado);
  });

  it('deve remover um gerente utilizando o caminho do href HATEOAS', async () => {
    const href = 'http://localhost:8000/gerentes/12345678900';

    apiMock.delete.mockResolvedValue(job);

    const resultado = await service.remover(href);

    expect(apiMock.delete).toHaveBeenCalledTimes(1);
    expect(apiMock.delete).toHaveBeenCalledWith(caminhoDoHref(href));
    expect(resultado).toEqual(job);
  });

  it('deve propagar o erro quando a API falhar', async () => {
    const erro = new Error('Falha ao consultar gerentes.');

    apiMock.get.mockRejectedValue(erro);

    await expect(service.listar()).rejects.toBe(erro);
  });
});
