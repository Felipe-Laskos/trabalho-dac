import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { OperacaoPageComponent } from './operacao-page.component';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';
import { OperacaoService } from '../../../core/services/operacao.service';
import type { Conta } from '../../../core/models/conta.model';

const contaMock: Conta = {
  numero: '1291',
  cpfCliente: '12912861012',
  cpfGerente: '98574307084',
  saldo: '800.00',
  dataCriacao: '2000-01-01',
  _links: {
    self: { href: '/contas/1291' },
    deposito: { href: '/contas/1291/deposito' },
  },
};

const authMock = {
  usuario: signal({
    cpf: '12912861012',
    nome: 'Catharyna',
    email: 'cli1@bantads.com.br',
  }),
};

describe('OperacaoPageComponent', () => {
  async function montar(tipo: 'DEPOSITO' | 'TRANSFERENCIA'): Promise<ComponentFixture<OperacaoPageComponent>> {
    await TestBed.configureTestingModule({
      imports: [OperacaoPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { tipo } } } },
        { provide: AuthService, useValue: authMock },
        {
          provide: ContaService,
          useValue: { obterPorCliente: () => Promise.resolve(contaMock) },
        },
        {
          provide: OperacaoService,
          useValue: { depositar: vi.fn(), transferir: vi.fn() },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OperacaoPageComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    const fixture = await montar('DEPOSITO');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('bloqueia transferência para a própria conta no front', async () => {
    const fixture = await montar('TRANSFERENCIA');
    const componente = fixture.componentInstance;
    componente.form.setValue({ valor: '10.00', contaDestino: '1291' });
    componente.pedirConfirmacao();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('própria conta');
  });
});
