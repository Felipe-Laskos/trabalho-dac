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
    vi.useRealTimers();

    apiMock.get.mockImplementation(
      async (
        url: string,
        parametros?: Record<string, string>
      ) => {
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

    await fixture.whenStable();

    vi.useFakeTimers();

    await vi.advanceTimersByTimeAsync(0);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com os 5 clientes', async () => {
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelectorAll('tbody tr').length
    ).toBe(5);

    expect(
      fixture.nativeElement.textContent
    ).toContain('Catharyna');
  });

  it('deve manter os clientes na ordem recebida pela API', () => {
    expect(
      component.clientes().map((cliente) => cliente.nome)
    ).toEqual([
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

    expect(apiMock.get).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(apiMock.get).toHaveBeenCalledTimes(2);
    expect(component.buscaRealizada).toBe('cat');

    expect(
    component.clientes().map((cliente) => cliente.nome)
  ).toEqual([
    'Catharyna',
    'Catianna',
  ])
  });

  it('deve buscar por CPF parcial após o debounce', async () => {
    component.buscaControl.setValue('1291');

    await vi.advanceTimersByTimeAsync(400);

    expect(apiMock.get).toHaveBeenCalledTimes(2);

    expect(component.clientes().length).toBe(1);
    expect(component.clientes()[0].nome).toBe('Catharyna');
    expect(component.clientes()[0].cpf).toBe('12912861012');
    expect(component.buscaRealizada).toBe('1291');
  });

  it('deve restaurar os 5 clientes ao limpar a busca', async () => {
  component.buscaControl.setValue('cat');

  await vi.advanceTimersByTimeAsync(400);

  expect(component.clientes().length).toBe(2);

  component.buscaControl.setValue('');

  await vi.advanceTimersByTimeAsync(400);

  expect(component.clientes().length).toBe(5);
  expect(component.buscaRealizada).toBe('');
});

  it('deve aguardar o debounce antes de realizar uma nova busca', async () => {
    component.buscaControl.setValue('cat');

    await vi.advanceTimersByTimeAsync(399);

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(component.clientes().length).toBe(5);
    expect(component.buscaRealizada).toBe('');

    await vi.advanceTimersByTimeAsync(1);

    expect(apiMock.get).toHaveBeenCalledTimes(2);
    expect(component.buscaRealizada).toBe('cat');
  });

  it('deve registrar a última busca somente após ela ser processada', async () => {
    component.buscaControl.setValue('cat');

    await vi.advanceTimersByTimeAsync(399);

    expect(component.buscaRealizada).toBe('');

    await vi.advanceTimersByTimeAsync(1);

    expect(component.buscaRealizada).toBe('cat');
  });

  it('deve deixar a lista vazia quando não encontrar clientes', async () => {
    component.buscaControl.setValue('xyz');

    await vi.advanceTimersByTimeAsync(400);

    expect(component.clientes()).toEqual([]);
    expect(component.carregando()).toBe(false);
    expect(component.erro()).toBe('');
    expect(component.buscaRealizada).toBe('xyz');
  });

  it('deve manter o estado de erro vazio durante uma busca normal', async () => {
    component.buscaControl.setValue('cliente-inexistente');

    await vi.advanceTimersByTimeAsync(400);

    expect(component.erro()).toBe('');
    expect(component.carregando()).toBe(false);
  });
});

