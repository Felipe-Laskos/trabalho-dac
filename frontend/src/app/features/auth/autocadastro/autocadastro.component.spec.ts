import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from '../../../core/interceptors/token.interceptor';
import { erroInterceptor } from '../../../core/interceptors/erro.interceptor';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AutocadastroComponent } from './autocadastro.component';

describe('AutocadastroComponent', () => {
  let component: AutocadastroComponent;
  let fixture: ComponentFixture<AutocadastroComponent>;
  let httpMock: HttpTestingController;

  const preencherFormulario = () => {
    component.form.patchValue({
      nome: 'Laura Cordeiro',
      cpf: '12345678901',
      email: 'laura@email.com',
      telefone: '41999999999',
      salario: 4500,
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: '',
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR',
      },
    });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutocadastroComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([tokenInterceptor, erroInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AutocadastroComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('1. não deve enviar quando o formulário for inválido', async () => {
    await component.enviar();

    expect(component['estado']()).toBe('erro');

    httpMock.expectNone('http://localhost:8000/solicitacoes');
  });

  it('2. deve enviar POST quando o formulário for válido', async () => {
    preencherFormulario();

    const promise = component.enviar();

    const req = httpMock.expectOne('http://localhost:8000/solicitacoes');

    expect(req.request.method).toBe('POST');

    expect(req.request.body).toEqual({
      cpf: '12345678901',
      nome: 'Laura Cordeiro',
      email: 'laura@email.com',
      telefone: '41999999999',
      salario: '4500.00',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR',
      },
    });

    req.flush({
      cpf: '12345678901',
      nome: 'Laura Cordeiro',
      email: 'laura@email.com',
      telefone: '41999999999',
      salario: '4500.00',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR',
      },
      status: 'PENDENTE',
      motivo: null,
      dataHoraProcessamento: null,
      _links: {
        aprovacao: {
          href: '/solicitacoes/12345678901/aprovacao',
        },
        rejeicao: {
          href: '/solicitacoes/12345678901/rejeicao',
        },
      },
    });

    await promise;

    expect(component['estado']()).toBe('sucesso');
  });

  it('3. deve mudar para sucesso quando a API retornar 201', async () => {
    preencherFormulario();

    const promise = component.enviar();

    const req = httpMock.expectOne('http://localhost:8000/solicitacoes');

    req.flush(
      {
        cpf: '12345678901',
        status: 'PENDENTE',
        _links: {
          aprovacao: {
            href: '/solicitacoes/12345678901/aprovacao',
          },
        },
      },
      {
        status: 201,
        statusText: 'Created',
      },
    );

    await promise;

    expect(component['estado']()).toBe('sucesso');
  });

  it('4. deve mostrar erro quando a API retornar 400', async () => {
    preencherFormulario();

    const promise = component.enviar();

    const req = httpMock.expectOne('http://localhost:8000/solicitacoes');

    req.flush(
      {
        mensagem: 'Dados inválidos',
      },
      {
        status: 400,
        statusText: 'Bad Request',
      },
    );

    await promise;

    expect(component['estado']()).toBe('erro');
    expect(component['mensagemErro']()).toBe('Dados inválidos');
  });

  it('5. deve mostrar erro quando a API retornar 409', async () => {
    preencherFormulario();

    const promise = component.enviar();

    const req = httpMock.expectOne('http://localhost:8000/solicitacoes');

    req.flush(
      {
        mensagem: 'Já existe uma solicitação para este CPF.',
      },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );

    await promise;

    expect(component['estado']()).toBe('erro');
    expect(component['mensagemErro']()).toContain('CPF');
  });

  it('6. não deve fazer dois POSTs ao enviar duas vezes', async () => {
    preencherFormulario();

    const primeira = component.enviar();

    const req = httpMock.expectOne('http://localhost:8000/solicitacoes');

    expect(req.request.method).toBe('POST');

    const segunda = component.enviar();

    httpMock.expectNone('http://localhost:8000/solicitacoes');

    req.flush({
      cpf: '12345678901',
      status: 'PENDENTE',
      _links: {
        aprovacao: {
          href: '/solicitacoes/12345678901/aprovacao',
        },
      },
    });

    await primeira;
    await segunda;

    expect(component['estado']()).toBe('sucesso');
  });

  it('7. formulário vazio: avisa no banner e em cada campo obrigatório', async () => {
    const botao: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    botao.click();

    await fixture.whenStable();

    const tela: HTMLElement = fixture.nativeElement;

    expect(tela.querySelector('app-message')).toBeTruthy();
    expect(tela.querySelectorAll('small.field-error').length).toBe(10);

    httpMock.expectNone('http://localhost:8000/solicitacoes');
  });
});
