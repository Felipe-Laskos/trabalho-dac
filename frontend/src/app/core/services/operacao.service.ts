import { Injectable, inject } from '@angular/core';
import type {
  OperacaoInput,
  OperacaoRealizada,
  TransferenciaInput,
} from '../models/conta.model';
import type { Dinheiro } from '../models/dinheiro';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class OperacaoService {
  private readonly api = inject(ApiService);

  depositar(numero: string, valor: Dinheiro): Promise<OperacaoRealizada> {
    const corpo: OperacaoInput = { valor };
    return this.api.post<OperacaoRealizada>(`/contas/${numero}/deposito`, corpo);
  }

  sacar(numero: string, valor: Dinheiro): Promise<OperacaoRealizada> {
    const corpo: OperacaoInput = { valor };
    return this.api.post<OperacaoRealizada>(`/contas/${numero}/saque`, corpo);
  }

  transferir(numero: string, dados: TransferenciaInput): Promise<OperacaoRealizada> {
    return this.api.post<OperacaoRealizada>(`/contas/${numero}/transferencia`, dados);
  }
}
