import { Component, input, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { formatarBRL } from '../../util/dinheiro.util';

export interface DetalheOperacao {
  rotulo: string;
  valor: string | null | undefined;
  destaque?: boolean;
  moeda?: boolean;
}

@Component({
  selector: 'app-modal-confirmation',
  standalone: true,
  imports: [Dialog, Button],
  templateUrl: './modal-confirmation.component.html',
  styleUrl: './modal-confirmation.component.scss',
})
export class ModalConfirmationComponent {
  readonly visivel = input<boolean>(false);
  readonly titulo = input<string>('Confirmar operação?');
  readonly subtitulo = input<string>('A operação é imediata e não pode ser desfeita.');
  readonly textoConfirmar = input<string>('Confirmar');
  readonly textoCancelar = input<string>('Voltar');
  readonly carregando = input<boolean>(false);
  readonly detalhes = input<DetalheOperacao[]>([]);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  protected aoConfirmar(): void {
    if (!this.carregando()) {
      this.confirmar.emit();
    }
  }

  protected aoCancelar(): void {
    if (!this.carregando()) {
      this.cancelar.emit();
    }
  }

  protected formatarValor(item: DetalheOperacao): string {
    if (
      item.valor === null ||
      item.valor === undefined ||
      item.valor === ''
    ) {
      return '-';
    }

    return item.moeda ? formatarBRL(item.valor) : String(item.valor);
  }
}
