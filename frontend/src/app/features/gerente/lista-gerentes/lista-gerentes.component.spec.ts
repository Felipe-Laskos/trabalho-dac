import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ListaGerentesComponent } from './lista-gerentes.component';
import { GerenteService } from '../../../core/services/gerente.service';

describe('ListaGerentesComponent', () => {
let component: ListaGerentesComponent;
let fixture: ComponentFixture<ListaGerentesComponent>;

const gerenteServiceMock = {
listar: vi.fn().mockResolvedValue({
gerentes: [
{
cpf: '98574307084',
nome: 'Geniéve',
email: '[ger1@bantads.com.br](mailto:ger1@bantads.com.br)',
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
email: '[ger2@bantads.com.br](mailto:ger2@bantads.com.br)',
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
email: '[ger3@bantads.com.br](mailto:ger3@bantads.com.br)',
telefone: '41997999999',
ativo: true,
quantidadeClientes: 1,
_links: {
self: { href: '/gerentes/23862179060' },
atualizacao: { href: '/gerentes/23862179060' },
remocao: { href: '/gerentes/23862179060' },
},
},
{
cpf: '40501740066',
nome: 'Gadamântio',
email: '[ger4@bantads.com.br](mailto:ger4@bantads.com.br)',
telefone: '41996999999',
ativo: true,
quantidadeClientes: 0,
_links: {
self: { href: '/gerentes/40501740066' },
atualizacao: { href: '/gerentes/40501740066' },
remocao: { href: '/gerentes/40501740066' },
},
},
],
_links: {
self: { href: '/gerentes' },
},
}),
};

const routerMock = {
navigate: vi.fn().mockResolvedValue(true),
};

beforeEach(async () => {
vi.clearAllMocks();
await TestBed.configureTestingModule({
  imports: [ListaGerentesComponent],
  providers: [
    { provide: GerenteService, useValue: gerenteServiceMock },
    { provide: Router, useValue: routerMock },
  ],
}).compileComponents();

fixture = TestBed.createComponent(ListaGerentesComponent);
component = fixture.componentInstance;
await fixture.whenStable();
});

it('should create', () => {
expect(component).toBeTruthy();
});

it('deve carregar os gerentes do serviço simulado', () => {
expect(gerenteServiceMock.listar).toHaveBeenCalled();
expect(component.gerentes()).toHaveLength(4);
});

it('deve exibir os contadores de clientes esperados', () => {
expect(component.gerentes().map((gerente) => gerente.quantidadeClientes))
.toEqual([0, 2, 2, 1]);
});

it('deve navegar para a tela de edição do gerente', () => {
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

it('deve abrir e cancelar a confirmação de remoção', () => {
const gerente = component.gerentes()[0];
component.confirmarRemocao(gerente);
expect(component.gerenteParaRemover()).toEqual(gerente);

component.cancelarRemocao();
expect(component.gerenteParaRemover()).toBeNull();
});
});
