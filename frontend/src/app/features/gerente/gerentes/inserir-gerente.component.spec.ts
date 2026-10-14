import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { InserirGerenteComponent } from './inserir-gerente.component';
import { GerenteService } from '../../../core/services/gerente.service';
import { JobService } from '../../../core/services/job.service';
import type { Job } from '../../../core/models/job.model';

const pendente: Job = {
  jobId: 'job-1',
  status: 'PENDENTE',
  resultType: null,
  dominio: 'gerentes',
  resourceId: null,
  erro: null,
};

describe('InserirGerenteComponent', () => {
  let component: InserirGerenteComponent;
  let fixture: ComponentFixture<InserirGerenteComponent>;

  const gerentes = { criar: vi.fn() };
  const jobs = { aguardar: vi.fn(), resultado: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InserirGerenteComponent],
      providers: [
        provideRouter([]),
        { provide: GerenteService, useValue: gerentes },
        { provide: JobService, useValue: jobs },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InserirGerenteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('não envia o formulário inválido', async () => {
    await component.enviar();
    expect(gerentes.criar).not.toHaveBeenCalled();
  });

  it('o campo senha é password', () => {
    const senha = fixture.nativeElement.querySelector('#senha') as HTMLInputElement;
    expect(senha.type).toBe('password');
  });

  it('cadastra e mostra o nome vindo do recurso', async () => {
    component.form.setValue({
      nome: 'Ada Gerente',
      cpf: '123.456.789-01',
      email: 'ada@bantads.com.br',
      telefone: '(41) 99999-0000',
      senha: 'segredo',
    });

    gerentes.criar.mockResolvedValue(pendente);
    jobs.aguardar.mockResolvedValue({
      ...pendente,
      status: 'CONCLUIDO',
      resultType: 'resource',
      resourceId: '12345678901',
    });
    jobs.resultado.mockResolvedValue({ nome: 'Ada Gerente' });

    await component.enviar();

    expect(gerentes.criar).toHaveBeenCalledWith({
      cpf: '12345678901',
      nome: 'Ada Gerente',
      email: 'ada@bantads.com.br',
      telefone: '41999990000',
      senha: 'segredo',
    });
    expect(jobs.aguardar).toHaveBeenCalledWith('job-1');
    expect(jobs.resultado).toHaveBeenCalled();
    expect(component.resultado()?.status).toBe('SUCESSO');
    expect(component.resultado()?.mensagem).toContain('Ada Gerente');
  });

  it('mostra a falha do job quando o e-mail já existe', async () => {
    component.form.setValue({
      nome: 'Geniéve',
      cpf: '111.222.333-44',
      email: 'ger1@bantads.com.br',
      telefone: '(41) 98888-0000',
      senha: 'segredo',
    });

    gerentes.criar.mockResolvedValue(pendente);
    jobs.aguardar.mockResolvedValue({
      ...pendente,
      status: 'FALHA',
      erro: 'E-mail já cadastrado.',
    });

    await component.enviar();

    expect(jobs.resultado).not.toHaveBeenCalled();
    expect(component.resultado()?.status).toBe('FALHA');
    expect(component.resultado()?.mensagem).toBe('E-mail já cadastrado.');
  });
});
