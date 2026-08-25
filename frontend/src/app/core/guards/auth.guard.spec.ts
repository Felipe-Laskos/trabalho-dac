import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { clienteGuard, gerenteGuard } from './perfil.guard';
import { AuthService } from '../services/auth.service';

describe('guards de autenticação', () => {
  const router = { createUrlTree: (cmds: unknown[]) => ({ cmds }) };

  function configurar(auth: Partial<AuthService>): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  }

  it('authGuard bloqueia visitante', () => {
    configurar({ autenticado: () => false } as Partial<AuthService>);
    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(resultado).toEqual(router.createUrlTree(['/login']));
  });

  it('clienteGuard recusa gerente', () => {
    configurar({
      autenticado: () => true,
      ehPerfil: (p: string) => p === 'GERENTE',
    } as Partial<AuthService>);
    const resultado = TestBed.runInInjectionContext(() => clienteGuard({} as never, {} as never));
    expect(resultado).toEqual(router.createUrlTree(['/acesso-negado']));
  });

  it('gerenteGuard aceita gerente', () => {
    configurar({
      autenticado: () => true,
      ehPerfil: (p: string) => p === 'GERENTE',
    } as Partial<AuthService>);
    const resultado = TestBed.runInInjectionContext(() => gerenteGuard({} as never, {} as never));
    expect(resultado).toBe(true);
  });
});
