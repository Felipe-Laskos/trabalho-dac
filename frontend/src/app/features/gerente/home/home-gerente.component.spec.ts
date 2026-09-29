import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeGerenteComponent } from './home-gerente.component';
import { vi } from 'vitest';
import { ApiService } from '../../../core/services/api.service';
import { JobService } from '../../../core/services/job.service';
import type { Job } from '../../../core/models/job.model';

describe('HomeGerenteComponent', () => {
  let component: HomeGerenteComponent;
  let fixture: ComponentFixture<HomeGerenteComponent>;

  const apiMock = {
  post: vi.fn(),
  };

  const jobServiceMock = {
  aguardar: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeGerenteComponent],
      providers:[
        { provide: ApiService, useValue: apiMock },
        { provide: JobService, useValue: jobServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeGerenteComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('deve aprovar a solicitação após o processamento', async () => {
  const cpf = component.solicitacoes()[0].cpf;

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
    resourceId: cpf,
  };

  apiMock.post.mockResolvedValue(job);
  jobServiceMock.aguardar.mockResolvedValue(jobConcluido);

  const promessa = component.aprovar(cpf);

  expect(component.estaProcessando(cpf)).toBe(true);

  await promessa;

  const solicitacao = component.solicitacoes().find(
    item => item.cpf === cpf
  );

  expect(solicitacao?.status).toBe('APROVADA');
  expect(solicitacao?._links).toEqual({});
  expect(component.estaProcessando(cpf)).toBe(false);
});
});