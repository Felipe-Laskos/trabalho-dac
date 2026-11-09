import { TestBed } from '@angular/core/testing';

import { SessaoService } from './sessao.service';
import type { TipoUsuario, Usuario } from '../models/auth.model';

describe('SessaoService', () => {
  let service: SessaoService;

  const usuario: Usuario = {
    cpf: '12345678900',
    nome: 'Gabriela da paz',
    email: 'gabriela@email.com',
  };

  const token = 'token-teste-123';

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [SessaoService],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve iniciar sem sessão autenticada', () => {
    service = TestBed.inject(SessaoService);

    expect(service.token()).toBeNull();
    expect(service.tipo()).toBeNull();
    expect(service.usuario()).toBeNull();
    expect(service.autenticado()).toBe(false);
  });

  it('deve gravar a sessão no localStorage e atualizar os signals', () => {
    service = TestBed.inject(SessaoService);

    const tipo: TipoUsuario = 'CLIENTE';

    service.gravar(token, tipo, usuario);

    expect(service.token()).toBe(token);
    expect(service.tipo()).toBe(tipo);
    expect(service.usuario()).toEqual(usuario);
    expect(service.autenticado()).toBe(true);

    expect(localStorage.getItem('bantads.token')).toBe(token);
    expect(localStorage.getItem('bantads.tipo')).toBe(tipo);
    expect(localStorage.getItem('bantads.usuario')).toBe(
      JSON.stringify(usuario),
    );
  });

  it('deve limpar os signals e remover os dados do localStorage', () => {
    service = TestBed.inject(SessaoService);

    service.gravar(token, 'GERENTE', usuario);

    service.limparSessao();

    expect(service.token()).toBeNull();
    expect(service.tipo()).toBeNull();
    expect(service.usuario()).toBeNull();
    expect(service.autenticado()).toBe(false);

    expect(localStorage.getItem('bantads.token')).toBeNull();
    expect(localStorage.getItem('bantads.tipo')).toBeNull();
    expect(localStorage.getItem('bantads.usuario')).toBeNull();
  });

  it('deve recuperar uma sessão válida do localStorage', () => {
    localStorage.setItem('bantads.token', token);
    localStorage.setItem('bantads.tipo', 'CLIENTE');
    localStorage.setItem('bantads.usuario', JSON.stringify(usuario));

    service = TestBed.inject(SessaoService);

    expect(service.token()).toBe(token);
    expect(service.tipo()).toBe('CLIENTE');
    expect(service.usuario()).toEqual(usuario);
    expect(service.autenticado()).toBe(true);
  });

  it('não deve autenticar quando o tipo de usuário for inválido', () => {
    localStorage.setItem('bantads.token', token);
    localStorage.setItem('bantads.tipo', 'ADMIN');
    localStorage.setItem('bantads.usuario', JSON.stringify(usuario));

    service = TestBed.inject(SessaoService);

    expect(service.token()).toBe(token);
    expect(service.tipo()).toBeNull();
    expect(service.usuario()).toEqual(usuario);
    expect(service.autenticado()).toBe(false);
  });

  it('deve ignorar o usuário quando o JSON armazenado for inválido', () => {
    localStorage.setItem('bantads.token', token);
    localStorage.setItem('bantads.tipo', 'CLIENTE');
    localStorage.setItem('bantads.usuario', '{json-invalido');

    service = TestBed.inject(SessaoService);

    expect(service.token()).toBe(token);
    expect(service.tipo()).toBe('CLIENTE');
    expect(service.usuario()).toBeNull();
    expect(service.autenticado()).toBe(false);
  });

  it('deve ignorar o usuário quando seus campos forem inválidos', () => {
  localStorage.setItem('bantads.token', token);
  localStorage.setItem('bantads.tipo', 'GERENTE');

  const usuarioInvalido = {
    cpf: '12345678900',
    nome: 'Gabriela da paz',
    email: 12345, 
  };

  localStorage.setItem(
    'bantads.usuario',
    JSON.stringify(usuarioInvalido),
  );

  service = TestBed.inject(SessaoService);

  expect(service.token()).toBe(token);
  expect(service.tipo()).toBe('GERENTE');
  expect(service.usuario()).toBeNull();
  expect(service.autenticado()).toBe(false);
});
});
