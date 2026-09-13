import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeClienteComponent } from './home-cliente.component';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';
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
    saque: { href: '/contas/1291/saque' },
    transferencia: { href: '/contas/1291/transferencia' },
    extrato: { href: '/contas/1291/extrato' },
  },
};

describe('HomeClienteComponent', () => {
  let component: HomeClienteComponent;
  let fixture: ComponentFixture<HomeClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeClienteComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            usuario: signal({
              cpf: '12912861012',
              nome: 'Catharyna',
              email: 'cli1@bantads.com.br',
            }),
          },
        },
        {
          provide: ContaService,
          useValue: {
            obterPorCliente: () => Promise.resolve(contaMock),
            recarregarSaldo: () => Promise.resolve(contaMock),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeClienteComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
