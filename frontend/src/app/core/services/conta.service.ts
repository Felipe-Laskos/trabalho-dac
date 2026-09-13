import { Injectable, inject } from '@angular/core';
import type { Conta } from '../models/conta.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ContaService {
  private readonly api = inject(ApiService);

  obterPorCliente(cpf: string): Promise<Conta> {
    return this.api.get<Conta>(`/clientes/${cpf}/conta`);
  }

  /** Sem cache: cada chamada vai de novo ao lado query. */
  recarregarSaldo(cpf: string): Promise<Conta> {
    return this.obterPorCliente(cpf);
  }

  /**
   * Depois de depósito/saque/TED (S5): reconsulta até o saldo projetar,
   * ou até o timeout — consistência eventual.
   */
  async aguardarNovoSaldo(
    cpf: string,
    saldoAnterior: string,
    timeoutMs = 15_000,
  ): Promise<Conta> {
    const inicio = Date.now();
    let intervalo = 300;

    while (Date.now() - inicio < timeoutMs) {
      const conta = await this.obterPorCliente(cpf);
      if (conta.saldo !== saldoAnterior) {
        return conta;
      }
      await esperar(intervalo);
      intervalo = Math.min(intervalo * 1.5, 2000);
    }

    return this.obterPorCliente(cpf);
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
