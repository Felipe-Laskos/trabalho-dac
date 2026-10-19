import { Injectable, inject } from '@angular/core';
import type { Extrato } from '../models/conta.model';
import { paraAPI } from '../../shared/util/data.util';
import { ApiService } from './api.service';
import type { DateTime } from 'luxon';

@Injectable({ providedIn: 'root' })
export class ExtratoService {
  private readonly api = inject(ApiService);

  consultar(numeroConta: string, inicio: DateTime, fim: DateTime): Promise<Extrato> {
    return this.api.get<Extrato>(`/contas/${encodeURIComponent(numeroConta)}/extrato`, {
      inicio: paraAPI(inicio),
      fim: paraAPI(fim),
    });
  }
}
