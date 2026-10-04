import { Component, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';

import { Dinheiro } from '../../core/models/dinheiro';

import {
  ModalConfirmationComponent,
  DetalheOperacao,
} from '../../shared/components/modal-confirmation/modal-confirmation.component';

import {
  ModalRejectionComponent
} from  '../../shared/components/modal-rejection/modal-rejection.component';

import {
  OperationResultComponent,
  DadosResultadoOperacao,
} from '../../shared/components/operation-result/operation-result.component';

import { AccountNumberInputComponent } from '../../shared/components/account-number-input/account-number-input.component';
import { MoneyInputComponent } from '../../shared/components/money-input/money-input.component';
import { BalanceIndicatorComponent } from '../../shared/components/balance-indicator/balance-indicator.component';
import { JobProgressComponent } from '../../shared/components/job-progress/job-progress.component';
import {
  AsyncResultComponent,
  AsyncResultStatus,
} from '../../shared/components/async-result/async-result.component';

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
    JobProgressComponent,
    AsyncResultComponent,
    ModalRejectionComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly recusando = signal(false);
  readonly motivoRecusa = signal('');
  readonly enviandoRecusa = signal(false);

  readonly exibirModalConfirmacao = signal(false);
  readonly carregando = signal(false);
  readonly exibirJobProgress = signal(false);
  readonly resultado = signal<DadosResultadoOperacao | null>(null);

  readonly saldoConta = signal<Dinheiro>('1850.50');
  readonly reconsultandoSaldo = signal<boolean>(false);

  readonly exibirAsyncResult = signal(false);
  readonly asyncResultStatus = signal<AsyncResultStatus>('SUCESSO');
  readonly asyncResultMensagem = signal('');

  readonly numeroContaCriada = signal('0950');

  readonly numeroContaControl = new FormControl<string>('0950', {
    nonNullable: true,
  });

  readonly valorControl = new FormControl<Dinheiro>('150.00', {
    nonNullable: true,
  });

  private readonly numeroConta = toSignal(
    this.numeroContaControl.valueChanges,
    {
      initialValue: this.numeroContaControl.value,
    }
  );

  private readonly valor = toSignal(
    this.valorControl.valueChanges,
    {
      initialValue: this.valorControl.value,
    }
  );

  readonly detalhesModal = computed<DetalheOperacao[]>(() => {
    return [
      {
        rotulo: 'Conta destino',
        valor: this.numeroConta() || 'Não informada',
      },
      {
        rotulo: 'Valor da transferência',
        valor: this.valor() || '0.00',
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

      setTimeout(() => {
        this.exibirJobProgress.set(true);

        setTimeout(() => {
          this.exibirJobProgress.set(false);

          this.resultado.set({
            tipo: 'SUCESSO',
            tipoOperacao: 'TRANSFERENCIA',
            numeroConta: this.numeroContaControl.value,
            valor: this.valorControl.value,
          });

          this.simularAtualizacaoSaldo();
        }, 7000);
      }, 150);
    }, 500);
  }

  testarErroNegocio422(): void {
    this.exibirModalConfirmacao.set(false);

    this.resultado.set({
      tipo: 'ERRO_NEGOCIO',
      mensagem:
        'Saldo insuficiente para cobrir o valor da transferência e a taxa da transação.',
    });
  }

  testarErroPermissao403(): void {
    this.exibirModalConfirmacao.set(false);

    this.resultado.set({
      tipo: 'ERRO_PERMISSAO',
      mensagem:
        'A operação não é permitida para o seu perfil de usuário.',
    });
  }

  reiniciarResultado(): void {
    this.resultado.set(null);
  }

  testarAsyncSucesso(): void {
    this.asyncResultStatus.set('SUCESSO');
    this.asyncResultMensagem.set('A transferência foi concluída com sucesso.');
    this.exibirAsyncResult.set(true);
  }

  testarAsyncFalha(): void {
    this.asyncResultStatus.set('FALHA');
    this.asyncResultMensagem.set(
      'Não foi possível concluir a operação: cliente já possui uma conta.'
    );
    this.exibirAsyncResult.set(true);
  }

  testarAsyncTimeout(): void {
    this.asyncResultStatus.set('TIMEOUT');
    this.asyncResultMensagem.set('');
    this.exibirAsyncResult.set(true);
  }

  fecharAsyncResult(): void {
    this.exibirAsyncResult.set(false);
  }

  abrirRejeicao(): void {
  this.motivoRecusa.set('');
  this.recusando.set(true);
}

  fecharRejeicao(): void {
  if (this.enviandoRecusa()) {
    return;
  }

  this.recusando.set(false);
}

confirmarRejeicao(): void {
  if (!this.motivoRecusa().trim()) {
    return;
  }

  this.enviandoRecusa.set(true);

  setTimeout(() => {
    this.enviandoRecusa.set(false);
    this.recusando.set(false);

    this.asyncResultStatus.set('SUCESSO');
    this.asyncResultMensagem.set('Recusa confirmada com sucesso.');
    this.exibirAsyncResult.set(true);

    this.motivoRecusa.set('');
  }, 1000);
}

}