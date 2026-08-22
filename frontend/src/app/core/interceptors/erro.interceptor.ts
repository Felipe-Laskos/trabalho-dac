import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { normalizarErro } from '../services/erro.util';
import { SessaoService } from '../services/sessao.service';

export const erroInterceptor: HttpInterceptorFn = (req, next) => {
  const sessao = inject(SessaoService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401) {
        sessao.limparSessao();
        void router.navigate(['/login'], { queryParams: { expirou: true } });
      }

      return throwError(
        () =>
          new HttpErrorResponse({
            error: normalizarErro(e),
            status: e.status,
            statusText: e.statusText,
            url: e.url ?? undefined,
            headers: e.headers,
          }),
      );
    }),
  );
};
