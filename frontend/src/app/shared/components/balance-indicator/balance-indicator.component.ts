import { Component, input } from '@angular/core';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Dinheiro } from '../../../core/models/dinheiro';

@Component({
  selector: 'app-balance-indicator',
  imports: [],
  templateUrl: './balance-indicator.component.html',
  styleUrl: './balance-indicator.component.scss',
})
export class BalanceIndicatorComponent {
  readonly saldo = input.required<Dinheiro>();

  readonly atualizando = input<boolean>(false);

  readonly label = input<string>('Saldo disponível');
  readonly mensagemAtualizando = input<string>('Atualizando saldo...');
}
