import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RelatorioClientesComponent, linhasDoRelatorio } from './relatorio-clientes.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { JobService } from '../../../core/services/job.service';
import type { Job } from '../../../core/models/job.model';
import type { RelatorioClienteLinha } from '../../../core/models/job.model';

const pendente: Job = {
  jobId: 'job-r16',
  status: 'PENDENTE',
  resultType: null,
  dominio: null,
  resourceId: null,
  erro: null,
};

const ze: RelatorioClienteLinha = {
  cpf: '22222222222',
  nome: 'Zeca',
  email: 'zeca@bantads.com.br',
  salario: '1000.00',
  numeroConta: '2000',
  saldo: '10.00',
  cpfGerente: '98574307084',
  nomeGerente: 'Geniéve',
};

const ana: RelatorioClienteLinha = {
  ...ze,
  cpf: '11111111111',
  nome: 'Ana',
  email: 'ana@bantads.com.br',
};

describe('RelatorioClientesComponent', () => {
  let component: RelatorioClientesComponent;
  let fixture: ComponentFixture<RelatorioClientesComponent>;

  const relatorios = { gerarClientes: vi.fn() };
  const jobs = { aguardar: vi.fn(), resultado: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatorioClientesComponent],
      providers: [
        { provide: RelatorioService, useValue: relatorios },
        { provide: JobService, useValue: jobs },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatorioClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mantém a ordem do servidor e as 8 colunas', async () => {
    relatorios.gerarClientes.mockResolvedValue(pendente);
    jobs.aguardar.mockResolvedValue({ ...pendente, status: 'CONCLUIDO', resultType: 'inline' });
    jobs.resultado.mockResolvedValue({ clientes: [ze, ana] });

    await component.gerar();
    fixture.detectChanges();

    const linhas = component.linhas() ?? [];
    expect(linhas.map((linha) => linha.nome)).toEqual(['Zeca', 'Ana']);

    const html = fixture.nativeElement as HTMLElement;
    const cabecalho = html.querySelector('thead')?.textContent ?? '';
    expect(cabecalho).toContain('CPF');
    expect(cabecalho).toContain('Nome');
    expect(cabecalho).toContain('E-mail');
    expect(cabecalho).toContain('Salário');
    expect(cabecalho).toContain('Conta');
    expect(cabecalho).toContain('Saldo');
    expect(cabecalho).toContain('CPF do gerente');
    expect(cabecalho).toContain('Gerente');
    expect(html.textContent).toContain('Zeca');
    expect(html.textContent?.indexOf('Zeca')).toBeLessThan(html.textContent?.indexOf('Ana') ?? -1);
  });

  it('aceita a lista solta que o job inline pode devolver', () => {
    expect(linhasDoRelatorio([ana, ze]).map((linha) => linha.nome)).toEqual(['Ana', 'Zeca']);
  });
});
