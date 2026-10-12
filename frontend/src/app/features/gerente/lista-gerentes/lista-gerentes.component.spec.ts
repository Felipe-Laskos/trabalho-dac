
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, vi } from 'vitest';

import { ListaGerentesComponent } from './lista-gerentes.component';
import { GerenteService } from '../../../core/services/gerente.service';
import type { Gerente, GerentesList } from '../../../core/models/gerente.model';

describe('ListaGerentesComponent', () => {
  let component: ListaGerentesComponent;
  let fixture: ComponentFixture<ListaGerentesComponent>;

  const gerentesMock: Gerente[] = [
    {
      cpf: '40501740066',
      nome: 'Gadamântio',
      email: 'ger4@bantads.com.br',
      telefone: '41996999999',
      ativo: true,
      quantidadeClientes: 0,
      _links: {
        self: { href: '/gerentes/40501740066' },
        atualizacao: { href: '/gerentes/40501740066' },
        remocao: { href: '/gerentes/40501740066' },
      },
    },
    {
      cpf: '98574307084',
      nome: 'Geniéve',
      email: 'ger1@bantads.com.br',
      telefone: '41999999999',
      ativo: true,
      quantidadeClientes: 2,
      _links: {
        self: { href: '/gerentes/98574307084' },
        atualizacao: { href: '/gerentes/98574307084' },
        remocao: { href: '/gerentes/98574307084' },
      },
    },
    {
      cpf: '64065268052',
      nome: 'Godophredo',
      email: 'ger2@bantads.com.br',
      telefone: '41998999999',
      ativo: true,
      quantidadeClientes: 2,
      _links: {
        self: { href: '/gerentes/64065268052' },
        atualizacao: { href: '/gerentes/64065268052' },
        remocao: { href: '/gerentes/64065268052' },
      },
    },
    {
      cpf: '23862179060',
      nome: 'Gyândula',
      email: 'ger3@bantads.com.br',
      telefone: '41997999999',
      ativo: true,
      quantidadeClientes: 1,
      _links: {
        self: { href: '/gerentes/23862179060' },
        atualizacao: { href: '/gerentes/23862179060' },
        remocao: { href: '/gerentes/23862179060' },
      },
    },
  ];

  const respostaMock: GerentesList = {
    gerentes: gerentesMock,
    _links: {
      self: { href: '/gerentes' },
    },
  };

  const gerenteServiceMock = {
    listar: vi.fn<() => Promise<GerentesList>>(),
  };

  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    gerenteServiceMock.listar.mockResolvedValue(respostaMock);

    await TestBed.configureTestingModule({
      imports: [ListaGerentesComponent],
      providers: [
        { provide: GerenteService, useValue: gerenteServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaGerentesComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar os gerentes do serviço', () => {
    expect(gerenteServiceMock.listar).toHaveBeenCalled();
    expect(component.gerentes()).toHaveLength(4);
  });

  it('deve manter a ordem alfabética recebida da API', () => {
    expect(component.gerentes().map((gerente) => gerente.nome)).toEqual([
      'Gadamântio',
      'Geniéve',
      'Godophredo',
      'Gyândula',
    ]);
  });

  it('deve exibir as quantidades de clientes recebidas da API', () => {
    expect(
      component.gerentes().map((gerente) => gerente.quantidadeClientes),
    ).toEqual([0, 2, 2, 1]);
  });

  it('deve navegar para a edição do gerente selecionado', () => {
    const gerente = component.gerentes()[0];

    component.editar(gerente);

    expect(routerMock.navigate).toHaveBeenCalledWith([
      '/gerente/gerentes',
      gerente.cpf,
      'editar',
    ]);
  });

  it('deve navegar para a tela de novo gerente', () => {
    component.novoGerente();

    expect(routerMock.navigate).toHaveBeenCalledWith([
      '/gerente/gerentes/novo',
    ]);
  });

  it('deve selecionar o gerente para confirmação de remoção', () => {
    const gerente = component.gerentes()[0];

    component.confirmarRemocao(gerente);

    expect(component.gerenteParaRemover()).toEqual(gerente);
  });

  it('deve cancelar a confirmação de remoção', () => {
    const gerente = component.gerentes()[0];

    component.confirmarRemocao(gerente);
    component.cancelarRemocao();

    expect(component.gerenteParaRemover()).toBeNull();
  });

  it('deve receber os links de atualização e remoção da API', () => {
    const gerente = component.gerentes()[0];

    expect(gerente._links['atualizacao']?.href).toBe(
      '/gerentes/40501740066',
    );
    expect(gerente._links['remocao']?.href).toBe(
      '/gerentes/40501740066',
    );
  });
});