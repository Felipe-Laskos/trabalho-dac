import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeGerenteComponent } from './home-gerente.component';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { JobService, TempoEsgotadoError } from '../../../core/services/job.service';
import { SolicitacaoService } from '../../../core/services/solicitacao.service';
import type { Job } from '../../../core/models/job.model';
import type { Solicitacao } from '../../../core/models/solicitacao.model';

const pendente: Solicitacao = {
  cpf: '11122233396',
  nome: 'Fulano de Tal',
  email: 'fulano@email.com',
  telefone: '41999999999',
  salario: '4500.00',
  endereco: {
    logradouro: 'Rua Exemplo',
    numero: '100',
    complemento: null,
    cep: '80000000',
    cidade: 'Curitiba',
    uf: 'PR',
  },
  status: 'PENDENTE',
  motivo: null,
  dataHoraProcessamento: null,
  _links: {
    aprovacao: { href: '/solicitacoes/11122233396/aprovacao' },
    rejeicao: { href: '/solicitacoes/11122233396/rejeicao' },
  },
};

const soAprovacao: Solicitacao = {
  ...pendente,
  cpf: '44455566601',
  nome: 'Só Aprovar',
  _links: {
    aprovacao: { href: '/solicitacoes/44455566601/aprovacao' },
  },
};

const processada: Solicitacao = {
  ...pendente,
  cpf: '12912861012',
  nome: 'Catharyna',
  status: 'APROVADA',
  dataHoraProcessamento: '2026-08-04T14:12:00',
  _links: {},
};

describe('HomeGerenteComponent', () => {
  let component: HomeGerenteComponent;
  let fixture: ComponentFixture<HomeGerenteComponent>;

  const apiMock = {
    post: vi.fn(),
  };

  const jobServiceMock = {
    aguardar: vi.fn(),
    resultado: vi.fn(),
  };

  const solicitacaoServiceMock = {
    listar: vi.fn(),
  };

  beforeEach(async () => {
    solicitacaoServiceMock.listar.mockResolvedValue({
      solicitacoes: [pendente, soAprovacao, processada],
      _links: {},
    });

    await TestBed.configureTestingModule({
      imports: [HomeGerenteComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: JobService, useValue: jobServiceMock },
        { provide: SolicitacaoService, useValue: solicitacaoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeGerenteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('carrega a lista no init', () => {
    expect(solicitacaoServiceMock.listar).toHaveBeenCalled();
    expect(component.solicitacoes().length).toBe(3);
  });

  it('mostra Aprovar só quando existe o rel aprovacao', () => {
    const html = fixture.nativeElement as HTMLElement;
    const linhas = html.querySelectorAll('tr');
    const texto = html.textContent ?? '';
    expect(texto).toContain('Aprovar');
    expect(texto).toContain('Recusar');
    expect(texto).toContain('sem ações');
    expect(linhas.length).toBeGreaterThan(1);
  });

  it('deve aprovar a solicitação após o processamento e recarregar a lista', async () => {
    const job: Job = {
      jobId: 'job-123',
      status: 'PENDENTE',
      resultType: null,
      dominio: 'clientes',
      resourceId: null,
      erro: null,
    };

    const jobConcluido: Job = {
      ...job,
      status: 'CONCLUIDO',
      resultType: 'resource',
      resourceId: pendente.cpf,
    };

    apiMock.post.mockResolvedValue(job);
    jobServiceMock.aguardar.mockResolvedValue(jobConcluido);
    jobServiceMock.resultado.mockResolvedValue({ nome: 'Fulano de Tal' });
    solicitacaoServiceMock.listar.mockResolvedValue({
      solicitacoes: [{ ...pendente, status: 'APROVADA', _links: {} }],
      _links: {},
    });

    await component.aprovar(pendente);

    expect(apiMock.post).toHaveBeenCalledWith('/solicitacoes/11122233396/aprovacao');
    expect(jobServiceMock.aguardar).toHaveBeenCalledWith('job-123');
    expect(jobServiceMock.resultado).toHaveBeenCalledWith(jobConcluido);
    expect(component.resultado()?.status).toBe('SUCESSO');
    expect(component.resultado()?.mensagem).toContain('Fulano de Tal');
    expect(solicitacaoServiceMock.listar.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('mostra a mensagem do job quando a aprovação falha', async () => {
    apiMock.post.mockResolvedValue({
      jobId: 'job-falha',
      status: 'PENDENTE',
    });
    jobServiceMock.aguardar.mockResolvedValue({
      jobId: 'job-falha',
      status: 'FALHA',
      resultType: null,
      dominio: null,
      resourceId: null,
      erro: 'A solicitação já foi aprovada.',
    });

    await component.aprovar(pendente);

    expect(jobServiceMock.resultado).not.toHaveBeenCalled();
    expect(component.resultado()?.status).toBe('FALHA');
    expect(component.resultado()?.mensagem).toBe('A solicitação já foi aprovada.');
  });

  it('mostra operação expirada quando o polling recebe 404', async () => {
    apiMock.post.mockResolvedValue({ jobId: 'sumiu', status: 'PENDENTE' });
    jobServiceMock.aguardar.mockRejectedValue(new Error('A operação expirou.'));

    await component.aprovar(pendente);

    expect(component.resultado()?.mensagem).toBe('A operação expirou.');
  });

  it('deve avisar timeout, e não falha, quando o JobService esgota o prazo', async () => {
    apiMock.post.mockResolvedValue({ jobId: 'job-123' });
    jobServiceMock.aguardar.mockRejectedValue(
      new TempoEsgotadoError('A operação não concluiu no tempo esperado.')
    );

    await component.aprovar(pendente);

    expect(component.resultado()?.status).toBe('TIMEOUT');
    expect(component.estaProcessando(pendente.cpf)).toBe(false);
  });

  it('deve mostrar a mensagem do back quando o Gateway responde erro', async () => {
    apiMock.post.mockResolvedValue({ jobId: 'job-123' });
    jobServiceMock.aguardar.mockRejectedValue(
      new HttpErrorResponse({
        status: 404,
        error: { status: 404, erro: 'Not Found', mensagem: 'Job inexistente ou expirado' }
      })
    );

    await component.aprovar(pendente);

    expect(component.resultado()).toEqual({
      status: 'FALHA',
      mensagem: 'Job inexistente ou expirado'
    });
  });
});
