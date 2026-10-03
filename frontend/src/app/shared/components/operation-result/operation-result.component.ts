import { Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { Dinheiro } from '../../../core/models/dinheiro';
import { DataHoraPipe } from '../../pipes/data-hora.pipe';
import { DinheiroPipe } from '../../pipes/dinheiro.pipe';

export type TipoResultado = 'SUCESSO' | 'ERRO_NEGOCIO' | 'ERRO_PERMISSAO' | 'ERRO_TECNICO';

export interface DadosResultadoOperacao {
  tipo: TipoResultado;
  valor?: Dinheiro | null;
  dataHora?: string | null;
  numeroConta?: string | null;
  tipoOperacao?: string | null;
  destinatario?: string | null;
  mensagem?: string | null;
}

@Component({
  selector: 'app-operation-result',
  standalone: true,
  imports: [NgClass, Button, DataHoraPipe, DinheiroPipe, Dialog],
  templateUrl: './operation-result.component.html',
  styleUrl: './operation-result.component.scss',
})
export class OperationResultComponent {
  readonly visivel = input<boolean>(false);
  readonly dados = input.required<DadosResultadoOperacao>();
  readonly textoAcao = input<string>('Realizar nova operação');

  readonly fecharOuReiniciar = output<void>();

  protected readonly icone = computed(() => {
    switch (this.dados().tipo) {
      case 'SUCESSO':
        return 'pi pi-check';
      case 'ERRO_NEGOCIO':
        return 'pi pi-exclamation-triangle';
      case 'ERRO_PERMISSAO':
        return 'pi pi-lock';
      case 'ERRO_TECNICO':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-info-circle';
    }
  });

  protected readonly titulo = computed(() => {
    switch (this.dados().tipo) {
      case 'SUCESSO':
        return 'Operação realizada com sucesso!';
      case 'ERRO_NEGOCIO':
        return 'Não foi possível concluir a operação';
      case 'ERRO_PERMISSAO':
        return 'Operação não permitida';
      case 'ERRO_TECNICO':
        return 'Não foi possível falar com o servidor';
      default:
        return 'Resultado da operação';
    }
  });

  protected readonly subtitulo = computed(() => {
    const dados = this.dados();
    if (dados.tipo === 'SUCESSO') {
      return 'Os dados da transação foram processados e registrados.';
    }
    return '';
  });

  protected aoClicarAcao(): void {
    this.fecharOuReiniciar.emit();
  }
}
