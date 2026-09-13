import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import type { TipoUsuario } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

export function perfilGuard(perfil: TipoUsuario): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }

    if (!auth.ehPerfil(perfil)) {
      return router.createUrlTree(['/acesso-negado']);
    }

    return true;
  };
}

export const clienteGuard = perfilGuard('CLIENTE');
export const gerenteGuard = perfilGuard('GERENTE');
