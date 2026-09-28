import { Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

export type AsyncResultStatus = 'SUCESSO' | 'FALHA' | 'TIMEOUT';

@Component({
  selector: 'app-async-result',
  standalone: true,
  imports: [DialogModule, Button],
  templateUrl: './async-result.component.html',
  styleUrl: './async-result.component.scss',
})
export class AsyncResultComponent {
  readonly visible = input.required<boolean>();
  readonly status = input.required<AsyncResultStatus>();
  readonly titulo = input<string>('');
  readonly mensagem = input<string>('');
  readonly fechar = output<void>();
  readonly mostrarDetalhes = input(false);

  protected readonly mensagemTimeout = 'A operação não concluiu no tempo esperado.';

  protected tituloExibicao(): string {
    if (this.titulo()) {
      return this.titulo();
    }

    switch (this.status()) {
      case 'SUCESSO':
        return 'Operação Concluída'; 

      case 'FALHA':
        return 'Não foi possível concluir a operação';

      case 'TIMEOUT':
        return 'Tempo de espera excedido';
    }
  }

  protected mensagemExibicao(): string {
    if (this.status() === 'TIMEOUT') {
      return this.mensagemTimeout;
    }

    return this.mensagem();
  }

  protected icone(): string {
    switch (this.status()) {
      case 'SUCESSO':
        return 'pi pi-check-circle';

      case 'FALHA':
        return 'pi pi-times-circle';

      case 'TIMEOUT':
        return 'pi pi-clock';
    }
  }

  protected fecharResultado(): void {
    this.fechar.emit();
  }
}