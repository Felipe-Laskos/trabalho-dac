import { Component, input, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';

@Component({
  selector: 'app-modal-rejection',
  standalone: true,
  imports: [Dialog, Button, Textarea],
  templateUrl: './modal-rejection.component.html',
  styleUrl: './modal-rejection.component.scss',
})
export class ModalRejectionComponent {
  
  readonly visivel = input<boolean>(false);
  readonly titulo = input<string>('Recusar solicitação');
  readonly subtitulo = input<string>(
    'Informe o motivo da recusa para o cliente.'
  );
  readonly motivo = input<string>('');
  readonly carregando = input<boolean>(false);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
  readonly motivoAlterado = output<string>();

  protected aoConfirmar(): void {
    if (!this.carregando() && this.motivo().trim().length > 0) {
      this.confirmar.emit();
    }
  }

  protected aoCancelar(): void {
    if (!this.carregando()) {
      this.cancelar.emit();
    }
  }

  protected aoAlterarMotivo(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.motivoAlterado.emit(textarea.value);
  }
}