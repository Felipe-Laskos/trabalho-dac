import { Component, computed, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';

import { Dinheiro } from '../../core/models/dinheiro';

import {
  ModalConfirmationComponent,
  DetalheOperacao,
} from '../../shared/components/modal-confirmation/modal-confirmation.component';

import {
  OperationResultComponent,
  DadosResultadoOperacao,
} from '../../shared/components/operation-result/operation-result.component';

import { AccountNumberInputComponent } from '../../shared/components/account-number-input/account-number-input.component';
import { MoneyInputComponent } from '../../shared/components/money-input/money-input.component';
import { BalanceIndicatorComponent } from '../../shared/components/balance-indicator/balance-indicator.component';

export interface OperacaoPayload {
  numeroConta: string;
  tipo: 'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA';
  valor: Dinheiro;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    ModalConfirmationComponent,
    OperationResultComponent,
    AccountNumberInputComponent,
    MoneyInputComponent,
    BalanceIndicatorComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly exibirModalConfirmacao = signal(false);
  readonly carregando = signal(false);
  readonly resultado = signal<DadosResultadoOperacao | null>(null);

  readonly saldoConta = signal<Dinheiro>('1850.50');
  readonly reconsultandoSaldo = signal<boolean>(false);

  readonly numeroContaControl = new FormControl<string>('0950', {
    nonNullable: true,
  });

  readonly valorControl = new FormControl<Dinheiro>('150.00', {
    nonNullable: true,
  });

  readonly detalhesModal = computed<DetalheOperacao[]>(() => {
    return [
      {
        rotulo: 'Conta destino',
        valor: this.numeroContaControl.value || 'Não informada',
      },
      {
        rotulo: 'Valor da transferência',
        valor: this.valorControl.value || '0.00',
        destaque: true,
        moeda: true,
      },
    ];
  });

  simularAtualizacaoSaldo(): void {
    this.reconsultandoSaldo.set(true);

    setTimeout(() => {
      this.saldoConta.set('1700.50');
      this.reconsultandoSaldo.set(false);
    }, 2000);
  }

  abrirConfirmacao(): void {
    this.resultado.set(null);
    this.exibirModalConfirmacao.set(true);
  }

  fecharConfirmacao(): void {
    if (this.carregando()) return;
    this.exibirModalConfirmacao.set(false);
  }

  executarOperacao(): void {
    this.carregando.set(true);

    setTimeout(() => {
      this.carregando.set(false);
      this.exibirModalConfirmacao.set(false);

      this.resultado.set({
        tipo: 'SUCESSO',
        tipoOperacao: 'TRANSFERENCIA',
        numeroConta: this.numeroContaControl.value,
        valor: this.valorControl.value,
        dataHora: new Date().toISOString(),
      });

      this.simularAtualizacaoSaldo();
    }, 1000);
  }

  testarErroNegocio422(): void {
    this.exibirModalConfirmacao.set(false);
    this.resultado.set({
      tipo: 'ERRO_NEGOCIO',
      mensagem: 'Saldo insuficiente para cobrir o valor da transferência e a taxa da transação.',
    });
  }

  testarErroPermissao403(): void {
    this.exibirModalConfirmacao.set(false);
    this.resultado.set({
      tipo: 'ERRO_PERMISSAO',
      mensagem: 'A operação não é permitida para o seu perfil de usuário.',
    });
  }

  reiniciarResultado(): void {
    this.resultado.set(null);
  }
}
