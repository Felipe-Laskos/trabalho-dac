import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { tokenInterceptor } from '../../core/interceptors/token.interceptor';
import { erroInterceptor } from '../../core/interceptors/erro.interceptor';

import { SolicitacaoService } from './solicitacao.service';
import { AutocadastroInput } from '../models/cliente.model';

describe('SolicitacaoService', () => {
  let service: SolicitacaoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SolicitacaoService,
        provideHttpClient(withInterceptors([tokenInterceptor, erroInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SolicitacaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it(' deve criar uma solicitação de autocadastro', async () => {
    const dados: AutocadastroInput = {
      cpf: '12345678901',
      nome: 'Maria Silva',
      email: 'maria@email.com',
      telefone: '41999999999',
      salario: '4500.00',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '100',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR',
      },
    };

    const resposta = {
      ...dados,
      status: 'PENDENTE' as const,
      motivo: null,
      dataHoraProcessamento: null,
      _links: {
        aprovacao: {
          href: '/solicitacoes/12345678901/aprovacao',
        },
      },
    };

    const promise = service.criar(dados);

    const requisicao = httpMock.expectOne('http://localhost:8000/solicitacoes');

    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(dados);

    requisicao.flush(resposta, {
      status: 201,
      statusText: 'Created',
    });

    await expect(promise).resolves.toEqual(resposta);
  });

  it('deve rejeitar quando a API retornar 400', async () => {
    const dados: AutocadastroInput = {
      cpf: '12345678901',
      nome: 'Maria Silva',
      email: 'maria@email.com',
      telefone: '41999999999',
      salario: '4500.00',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '100',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR',
      },
    };

    const promise = service.criar(dados);

    const requisicao = httpMock.expectOne('http://localhost:8000/solicitacoes');

    expect(requisicao.request.method).toBe('POST');

    requisicao.flush(
      {
        status: 400,
        mensagem: 'Dados inválidos',
      },
      {
        status: 400,
        statusText: 'Bad Request',
      },
    );

    await expect(promise).rejects.toMatchObject({
      status: 400,
    });
  });

  it('deve rejeitar quando a API retornar 409', async () => {
    const dados: AutocadastroInput = {
      cpf: '12345678901',
      nome: 'Maria Silva',
      email: 'maria@email.com',
      telefone: '41999999999',
      salario: '4500.00',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '100',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR',
      },
    };

    const promise = service.criar(dados);

    const requisicao = httpMock.expectOne('http://localhost:8000/solicitacoes');

    expect(requisicao.request.method).toBe('POST');

    requisicao.flush(
      {
        status: 409,
        mensagem: 'Já existe solicitação para este CPF.',
      },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );

    await expect(promise).rejects.toMatchObject({
      status: 409,
    });
  });
});
