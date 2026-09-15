import { Injectable, inject } from '@angular/core';
import type { Conta } from '../models/conta.model';
import { ApiService } from './api.service';

export interface ConsultaSaldo {
  conta: Conta;
  convergiu: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContaService {
  private readonly api = inject(ApiService);

  obterPorCliente(cpf: string): Promise<Conta> {
    return this.api.get<Conta>(`/clientes/${cpf}/conta`);
  }

  obterPorNumero(numero: string): Promise<Conta> {
    return this.api.get<Conta>(`/contas/${numero}`);
  }

  /** Sem cache: cada chamada vai de novo ao lado query. */
  recarregarSaldo(cpf: string): Promise<Conta> {
    return this.obterPorCliente(cpf);
  }

  /**
   * Reconsulta GET /contas/{numero} até o saldo projetar, ou até ~15 s.
   * Não calcula saldo no cliente — só compara o que o lado query devolveu.
   */
  async aguardarNovoSaldo(
    numero: string,
    saldoAnterior: string,
    timeoutMs = 15_000,
  ): Promise<ConsultaSaldo> {
    const inicio = Date.now();
    let intervalo = 300;
    let ultima = await this.obterPorNumero(numero);

    if (ultima.saldo !== saldoAnterior) {
      return { conta: ultima, convergiu: true };
    }

    while (Date.now() - inicio < timeoutMs) {
      await esperar(intervalo);
      ultima = await this.obterPorNumero(numero);
      if (ultima.saldo !== saldoAnterior) {
        return { conta: ultima, convergiu: true };
      }
      intervalo = Math.min(intervalo * 1.5, 2000);
    }

    return { conta: ultima, convergiu: false };
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
