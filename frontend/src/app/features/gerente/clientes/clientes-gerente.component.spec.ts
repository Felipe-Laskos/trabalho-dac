import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';

import { ClientesGerenteComponent } from './clientes-gerente.component';
import { ApiService } from '../../../core/services/api.service';

const CLIENTES_MOCK = [
  {
    cpf: '12912861012',
    nome: 'Catharyna',
    cidade: 'Curitiba',
    estado: 'PR',
    saldo: '800.00',
    _links: {},
  },
  {
    cpf: '98765432100',
    nome: 'Catianna',
    cidade: 'Araucária',
    estado: 'PR',
    saldo: '1250.50',
    _links: {},
  },
  {
    cpf: '45678912300',
    nome: 'Coândrya',
    cidade: 'São José dos Pinhais',
    estado: 'PR',
    saldo: '320.75',
    _links: {},
  },
  {
    cpf: '32165498700',
    nome: 'Cleuddônio',
    cidade: 'Colombo',
    estado: 'PR',
    saldo: '2100.00',
    _links: {},
  },
  {
    cpf: '74185296300',
    nome: 'Cutardo',
    cidade: 'Pinhais',
    estado: 'PR',
    saldo: '560.30',
    _links: {},
  },
];

describe('ClientesGerenteComponent', () => {
  let component: ClientesGerenteComponent;
  let fixture: ComponentFixture<ClientesGerenteComponent>;

  const apiMock = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    apiMock.get.mockImplementation(
      async (url: string, parametros?: Record<string, string>) => {
        const busca = parametros?.['busca']?.toLowerCase() ?? '';

        if (!busca) {
          return CLIENTES_MOCK;
        }

        return CLIENTES_MOCK.filter(
          (cliente) =>
            cliente.nome.toLowerCase().includes(busca) ||
            cliente.cpf.includes(busca)
        );
      }
    );

    await TestBed.configureTestingModule({
      imports: [ClientesGerenteComponent],
      providers: [
        {
          provide: ApiService,
          useValue: apiMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesGerenteComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com os 5 clientes', () => {
    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
    expect(component.clientes.length).toBe(5);
  });

  it('deve manter os clientes na ordem recebida pela API', () => {
    expect(component.clientes.map((cliente) => cliente.nome)).toEqual([
      'Catharyna',
      'Catianna',
      'Coândrya',
      'Cleuddônio',
      'Cutardo',
    ]);
  });

  it('deve buscar por nome parcial após o debounce', async () => {
    component.buscaControl.setValue('cat');

    await vi.advanceTimersByTimeAsync(399);

    expect(component.clientes.map((cliente) => cliente.nome)).toEqual([
      'Catharyna',
      'Catianna',
      'Coândrya',
      'Cleuddônio',
      'Cutardo',
    ]);

    await vi.advanceTimersByTimeAsync(1);

    expect(component.clientes.map((cliente) => cliente.nome)).toEqual([
      'Catharyna',
      'Catianna',
    ]);

    expect(component.buscaRealizada).toBe('cat');
    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
  });

  it('deve buscar por CPF parcial após o debounce', async () => {
    component.buscaControl.setValue('129');

    await vi.advanceTimersByTimeAsync(400);

    expect(component.clientes.length).toBe(1);
    expect(component.clientes[0].nome).toBe('Catharyna');
    expect(component.clientes[0].cpf).toBe('12912861012');

    expect(component.buscaRealizada).toBe('129');
    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
  });

  it('deve restaurar os 5 clientes ao limpar a busca', async () => {
    component.buscaControl.setValue('cat');

    await vi.advanceTimersByTimeAsync(400);

    expect(component.clientes.length).toBe(2);

    component.buscaControl.setValue('');

    await vi.advanceTimersByTimeAsync(400);

    expect(component.clientes.length).toBe(5);

    expect(component.buscaRealizada).toBe('');
    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
  });

  it('deve aguardar o debounce antes de realizar uma nova busca', async () => {
    component.buscaControl.setValue('cat');

    await vi.advanceTimersByTimeAsync(399);

    expect(component.clientes.length).toBe(5);
    expect(component.buscaRealizada).toBe('');

    await vi.advanceTimersByTimeAsync(1);

    expect(component.clientes.length).toBe(2);
    expect(component.buscaRealizada).toBe('cat');
    expect(component.isLoading).toBe(false);
  });

  it('deve registrar a última busca somente após ela ser processada', async () => {
    component.buscaControl.setValue('xyz');

    expect(component.buscaRealizada).toBe('');

    await vi.advanceTimersByTimeAsync(399);

    expect(component.buscaRealizada).toBe('');

    await vi.advanceTimersByTimeAsync(1);

    expect(component.buscaRealizada).toBe('xyz');
  });

  it('deve deixar a lista vazia quando não encontrar clientes', async () => {
    component.buscaControl.setValue('cliente-inexistente');

    await vi.advanceTimersByTimeAsync(400);

    expect(component.clientes).toEqual([]);
    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
    expect(component.buscaRealizada).toBe('cliente-inexistente');
  });

  it('deve manter o estado de erro falso durante uma busca normal', async () => {
    component.buscaControl.setValue('cat');

    await vi.advanceTimersByTimeAsync(400);

    expect(component.hasError).toBe(false);
    expect(component.isLoading).toBe(false);
  });
});
