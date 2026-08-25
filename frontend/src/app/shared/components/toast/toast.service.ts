import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private messageService: MessageService) {}

  success(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: message
    });
  }

  error(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: message
    });
  }

  empty(message: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Nenhum resultado',
      detail: message
    });
  }

}