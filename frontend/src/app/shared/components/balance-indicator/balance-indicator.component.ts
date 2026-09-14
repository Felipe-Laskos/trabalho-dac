import { Component, input } from '@angular/core';
import { Dinheiro } from '../../../core/models/dinheiro';
import { DinheiroPipe } from '../../pipes/dinheiro.pipe';

@Component({
  selector: 'app-balance-indicator',
  imports: [DinheiroPipe],
  templateUrl: './balance-indicator.component.html',
  styleUrl: './balance-indicator.component.scss',
})
export class BalanceIndicatorComponent {
  readonly saldo = input.required<Dinheiro>();

  readonly atualizando = input<boolean>(false);

  readonly label = input<string>('Saldo disponível');
  readonly mensagemAtualizando = input<string>('Atualizando saldo...');
}
