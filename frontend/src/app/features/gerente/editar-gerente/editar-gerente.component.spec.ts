import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { expect, vi } from 'vitest';

import { EditarGerenteComponent } from './editar-gerente.component';
import { GerenteService } from '../../../core/services/gerente.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import type { Gerente, GerenteUpdate } from '../../../core/models/gerente.model';

describe('EditarGerenteComponent', () => {
let component: EditarGerenteComponent;
let fixture: ComponentFixture<EditarGerenteComponent>;

const gerenteMock: Gerente = {
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
};

const gerenteServiceMock = {
buscar: vi.fn(),
atualizar: vi.fn(),
};

const routerMock = {
navigate: vi.fn().mockResolvedValue(true),
};

const toastServiceMock = {
success: vi.fn(),
error: vi.fn(),
empty: vi.fn(),
};

beforeEach(async () => {
vi.clearAllMocks();


gerenteServiceMock.buscar.mockResolvedValue({ ...gerenteMock });
gerenteServiceMock.atualizar.mockImplementation(
  async (_href: string, dados: GerenteUpdate) => ({
    ...gerenteMock,
    nome: dados.nome,
    telefone: dados.telefone,
  }),
);

await TestBed.configureTestingModule({
  imports: [EditarGerenteComponent],
  providers: [
    {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          paramMap: convertToParamMap({ cpf: gerenteMock.cpf }),
        },
      },
    },
    { provide: Router, useValue: routerMock },
    { provide: GerenteService, useValue: gerenteServiceMock },
    { provide: ToastService, useValue: toastServiceMock },
    { provide: MessageService, useValue: { add: vi.fn() } },
  ],
}).compileComponents();

fixture = TestBed.createComponent(EditarGerenteComponent);
component = fixture.componentInstance;
fixture.detectChanges();
await fixture.whenStable();
});

it('should create', () => {
expect(component).toBeTruthy();
});

it('deve carregar o gerente e popular o formulário', () => {
expect(gerenteServiceMock.buscar).toHaveBeenCalledWith(gerenteMock.cpf);
expect(component.gerente()?.cpf).toBe(gerenteMock.cpf);
expect(component.formulario.getRawValue()).toEqual({
nome: 'Geniéve',
telefone: '(41) 99999-9999',
});
expect(component.carregando()).toBe(false);
expect(component.alteracoesPendentes()).toBe(false);
});

it('deve expor a contagem de clientes e as iniciais do gerente', () => {
expect(component.quantidadeClientes()).toBe(2);
expect(component.iniciaisGerente()).toBe('G');
});

it('deve formatar números de telefone com 10 ou 11 dígitos', () => {
expect(component.formatarTelefone('4133334444')).toBe('(41) 3333-4444');
expect(component.formatarTelefone('41999999999')).toBe('(41) 99999-9999');
});

it('deve marcar alterações como pendentes quando o nome for alterado', () => {
component.formulario.controls.nome.setValue('Geniéve Silva');

expect(component.alteracoesPendentes()).toBe(true);
});

it('não deve marcar alterações como pendentes quando os valores forem equivalentes', () => {
component.formulario.controls.nome.setValue(' Geniéve ');

expect(component.alteracoesPendentes()).toBe(false);
});

it('deve rejeitar um número de telefone inválido', () => {
component.formulario.controls.telefone.setValue('(41) 123');

expect(component.formulario.controls.telefone.hasError('telefoneInvalido'))
  .toBe(true);
});

it('não deve salvar quando o formulário for inválido', async () => {
component.formulario.controls.nome.setValue('');
component.formulario.controls.telefone.setValue('123');

await component.salvar();

expect(gerenteServiceMock.atualizar).not.toHaveBeenCalled();
expect(component.formulario.controls.nome.touched).toBe(true);
});

it('não deve salvar quando não houver alterações pendentes', async () => {
await component.salvar();
expect(gerenteServiceMock.atualizar).not.toHaveBeenCalled();
});

it('deve atualizar o gerente com apenas nome e telefone, mostrar sucesso e retornar à lista', async () => {
component.formulario.controls.nome.setValue('Geniéve Silva');
component.formulario.controls.telefone.setValue('(41) 98888-7777');

await component.salvar();
expect(gerenteServiceMock.atualizar).toHaveBeenCalledWith(
  '/gerentes/98574307084',
  {
    nome: 'Geniéve Silva',
    telefone: '41988887777',
  },
);

const payload = gerenteServiceMock.atualizar.mock.calls[0][1];

expect(Object.keys(payload).sort()).toEqual(['nome', 'telefone']);
expect(toastServiceMock.success).toHaveBeenCalledWith(
  'Gerente atualizado com sucesso.',
);
expect(routerMock.navigate).toHaveBeenCalledWith(['/gerente/gerentes']);
expect(component.alteracoesPendentes()).toBe(false);
expect(component.salvando()).toBe(false);
});

it('não deve salvar quando o link de atualização estiver faltando', async () => {
component.gerente.set({
...gerenteMock,
_links: { self: { href: '/gerentes/98574307084' } },
});
component.formulario.controls.nome.setValue('Geniéve Silva');

await component.salvar();

expect(gerenteServiceMock.atualizar).not.toHaveBeenCalled();
expect(component.erro()).toBe(
  'O link de atualização do gerente não está disponível.',
);
});

it('deve exibir um erro quando o carregamento falhar', async () => {
gerenteServiceMock.buscar.mockRejectedValueOnce(
new Error('Falha ao carregar gerente.'),
);

await component.carregarGerente();

expect(component.erro()).toBe('Falha ao carregar gerente.');
expect(component.carregando()).toBe(false);
});

it('deve exibir um erro quando o salvamento falhar', async () => {
gerenteServiceMock.atualizar.mockRejectedValueOnce(
new Error('Falha ao atualizar gerente.'),
);
component.formulario.controls.nome.setValue('Geniéve Silva');

await component.salvar();

expect(component.erro()).toBe('Falha ao atualizar gerente.');
expect(component.salvando()).toBe(false);
expect(toastServiceMock.success).not.toHaveBeenCalled();
expect(routerMock.navigate).not.toHaveBeenCalled();
});

it('deve navegar de volta para a lista de gerentes', () => {
component.voltar();

expect(routerMock.navigate).toHaveBeenCalledWith(['/gerente/gerentes']);
});

it('não deve navegar de volta enquanto estiver salvando', () => {
component.salvando.set(true);
component.voltar();

expect(routerMock.navigate).not.toHaveBeenCalled();
});
});
