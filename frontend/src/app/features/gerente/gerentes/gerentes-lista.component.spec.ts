import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { GerentesListaComponent } from './gerentes-lista.component';
import { GerenteService } from '../../../core/services/gerente.service';
import { JobService } from '../../../core/services/job.service';
import type { Gerente } from '../../../core/models/gerente.model';
import type { Job } from '../../../core/models/job.model';

const comRemocao: Gerente = {
  cpf: '98574307084',
  nome: 'Geniéve',
  email: 'ger1@bantads.com.br',
  telefone: '41999999999',
  ativo: true,
  quantidadeClientes: 2,
  _links: {
    atualizacao: { href: '/gerentes/98574307084' },
    remocao: { href: '/gerentes/98574307084' },
  },
};

const semAcao: Gerente = {
  ...comRemocao,
  cpf: '40501740066',
  nome: 'Gadamântio',
  _links: {},
};

const pendente: Job = {
  jobId: 'job-r15',
  status: 'PENDENTE',
  resultType: null,
  dominio: 'gerentes',
  resourceId: null,
  erro: null,
};

describe('GerentesListaComponent', () => {
  let component: GerentesListaComponent;
  let fixture: ComponentFixture<GerentesListaComponent>;

  const gerentes = { listar: vi.fn(), remover: vi.fn() };
  const jobs = { aguardar: vi.fn(), resultado: vi.fn() };

  beforeEach(async () => {
    gerentes.listar.mockResolvedValue({ gerentes: [comRemocao, semAcao], _links: {} });

    await TestBed.configureTestingModule({
      imports: [GerentesListaComponent],
      providers: [
        provideRouter([]),
        { provide: GerenteService, useValue: gerentes },
        { provide: JobService, useValue: jobs },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GerentesListaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mostra Remover só quando existe o rel remocao', () => {
    const html = fixture.nativeElement as HTMLElement;
    const linhas = Array.from(html.querySelectorAll('tbody tr'));
    const genieve = linhas.find((tr) => tr.textContent?.includes('Geniéve'));
    const gadamantio = linhas.find((tr) => tr.textContent?.includes('Gadamântio'));

    expect(genieve?.textContent).toContain('Remover');
    expect(genieve?.textContent).toContain('Editar');
    expect(gadamantio?.textContent).toContain('sem ações');
    expect(gadamantio?.textContent).not.toContain('Remover');
  });

  it('403 de auto-remoção não inicia o polling', async () => {
    gerentes.remover.mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        error: {
          status: 403,
          erro: 'Forbidden',
          mensagem: 'Um gerente não pode remover a si mesmo',
        },
      }),
    );

    component.pedirRemocao(comRemocao);
    await component.confirmarRemocao();

    expect(jobs.aguardar).not.toHaveBeenCalled();
    expect(component.resultado()?.mensagem).toBe('Um gerente não pode remover a si mesmo');
  });

  it('exibe a mensagem inline e recarrega a lista', async () => {
    gerentes.remover.mockResolvedValue(pendente);
    jobs.aguardar.mockResolvedValue({ ...pendente, status: 'CONCLUIDO', resultType: 'inline' });
    jobs.resultado.mockResolvedValue({
      mensagem: 'Gerente removido; 2 contas transferidas para Gadamântio',
    });

    component.pedirRemocao(comRemocao);
    await component.confirmarRemocao();

    expect(gerentes.remover).toHaveBeenCalledWith('/gerentes/98574307084');
    expect(component.resultado()?.mensagem).toBe(
      'Gerente removido; 2 contas transferidas para Gadamântio',
    );
    expect(gerentes.listar.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('mostra a falha do job do último gerente ativo', async () => {
    gerentes.remover.mockResolvedValue(pendente);
    jobs.aguardar.mockResolvedValue({
      ...pendente,
      status: 'FALHA',
      erro: 'Não é possível remover o último gerente ativo',
    });

    component.pedirRemocao(comRemocao);
    await component.confirmarRemocao();

    expect(jobs.resultado).not.toHaveBeenCalled();
    expect(component.resultado()?.mensagem).toBe('Não é possível remover o último gerente ativo');
  });
});
