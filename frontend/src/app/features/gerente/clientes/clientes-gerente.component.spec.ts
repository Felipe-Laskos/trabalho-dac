import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ClientesGerenteComponent } from './clientes-gerente.component';

describe('ClientesGerenteComponent', () => {
  let component: ClientesGerenteComponent;
  let fixture: ComponentFixture<ClientesGerenteComponent>;

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [ClientesGerenteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesGerenteComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com os 5 clientes do mock', () => {
    expect(component.clientes.length).toBe(5);
  });

  it('deve manter os clientes na ordem recebida', () => {
    expect(component.clientes.map((cliente) => cliente.nome)).toEqual([
      'Catharyna',
      'Catianna',
      'Coândrya',
      'Cleuddônio',
      'Cutardo',
    ]);
  });

  it('deve buscar por nome parcial após o debounce', () => {
    component.buscaControl.setValue('cat');

    expect(component.clientes.length).toBe(5);

    vi.advanceTimersByTime(400);

    vi.advanceTimersByTime(300);

    expect(component.clientes.length).toBe(2);
    expect(component.clientes.map((cliente) => cliente.nome)).toEqual([
      'Catharyna',
      'Catianna',
    ]);
  });

  it('deve buscar por CPF parcial após o debounce', () => {
    component.buscaControl.setValue('129');

    vi.advanceTimersByTime(400);
    vi.advanceTimersByTime(300);

    expect(component.clientes.length).toBe(1);
    expect(component.clientes[0].nome).toBe('Catharyna');
    expect(component.clientes[0].cpf).toBe('12912861012');
  });

  it('deve restaurar os 5 clientes ao limpar a busca', () => {
    component.buscaControl.setValue('cat');

    vi.advanceTimersByTime(400);
    vi.advanceTimersByTime(300);

    expect(component.clientes.length).toBe(2);

    component.buscaControl.setValue('');

    vi.advanceTimersByTime(400);
    vi.advanceTimersByTime(300);

    expect(component.clientes.length).toBe(5);
  });

  it('deve aguardar o debounce antes de realizar a busca', () => {
    component.buscaControl.setValue('cat');

    vi.advanceTimersByTime(399);

    expect(component.clientes.length).toBe(5);

    vi.advanceTimersByTime(1);

    expect(component.isLoading).toBe(true);

    vi.advanceTimersByTime(300);

    expect(component.isLoading).toBe(false);
    expect(component.clientes.length).toBe(2);
  });

  it('deve registrar a última busca somente após ela ser processada', () => {
    component.buscaControl.setValue('xyz');

    expect(component.buscaRealizada).toBe('');

    vi.advanceTimersByTime(400);


    expect(component.buscaRealizada).toBe('');

    vi.advanceTimersByTime(300);

    expect(component.buscaRealizada).toBe('xyz');
  });

  it('deve deixar a lista vazia quando não encontrar clientes', () => {
    component.buscaControl.setValue('cliente-inexistente');

    vi.advanceTimersByTime(400);
    vi.advanceTimersByTime(300);

    expect(component.clientes).toEqual([]);
    expect(component.isLoading).toBe(false);
  });

  it('deve manter o estado de erro falso durante uma busca normal', () => {
    component.buscaControl.setValue('cat');

    vi.advanceTimersByTime(400);
    vi.advanceTimersByTime(300);

    expect(component.hasError).toBe(false);
  });
});