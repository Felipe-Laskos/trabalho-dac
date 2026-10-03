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
    cpf: '85733854057',
    nome: 'Catianna',
    cidade: 'Curitiba',
    estado: 'PR',
    saldo: '200.00',
    _links: {},
  },
  {
    cpf: '09506382000',
    nome: 'Cleuddônio',
    cidade: 'Curitiba',
    estado: 'PR',
    saldo: '10000.00',
    _links: {},
  },
  {
    cpf: '76179646090',
    nome: 'Coândrya',
    cidade: 'Curitiba',
    estado: 'PR',
    saldo: '1500.00',
    _links: {},
  },
  {
    cpf: '58872160006',
    nome: 'Cutardo',
    cidade: 'Curitiba',
    estado: 'PR',
    saldo: '150000.00',
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

        const clientes = busca
          ? CLIENTES_MOCK.filter(
              (cliente) =>
                cliente.nome.toLowerCase().includes(busca) ||
                cliente.cpf.includes(busca)
            )
          : CLIENTES_MOCK;

        return { clientes, _links: { self: { href: '/clientes' } } };
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

    await fixture.whenStable();

    vi.useFakeTimers();

    await vi.advanceTimersByTimeAsync(0);
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

  it('deve ler os clientes de dentro do envelope ClientesList', async () => {
    await fixture.whenStable();

    expect(Array.isArray(component.clientes())).toBe(true);
    expect(component.clientes().length).toBe(5);
  });

  it('deve manter os clientes na ordem recebida pela API', () => {
    expect(
      component.clientes().map((cliente) => cliente.nome)
    ).toEqual([
      'Catharyna',
      'Catianna',
      'Cleuddônio',
      'Coândrya',
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
    ).toEqual(['Catharyna', 'Catianna']);
  });

  it('deve buscar por CPF parcial após o debounce', async () => {
    component.buscaControl.setValue('129');

    await vi.advanceTimersByTimeAsync(400);

    expect(apiMock.get).toHaveBeenCalledTimes(2);

    expect(component.clientes().length).toBe(1);
    expect(component.clientes()[0].nome).toBe('Catharyna');
    expect(component.clientes()[0].cpf).toBe('12912861012');
    expect(component.buscaRealizada).toBe('129');
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

