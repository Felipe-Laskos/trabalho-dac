import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessaoService } from '../services/sessao.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SessaoService).token();
  return next(token ? req.clone({ setHeaders: { 'x-access-token': token } }) : req);
};
