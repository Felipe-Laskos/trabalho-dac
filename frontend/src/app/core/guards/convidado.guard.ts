import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Impede quem já está autenticado de reabrir o login. */
export const convidadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.autenticado()) {
    return true;
  }

  return router.createUrlTree([auth.rotaInicial()]);
};
