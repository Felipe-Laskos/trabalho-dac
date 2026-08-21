import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Button } from 'primeng/button';
import { ToastService } from '../../shared/components/toast/toast.service';

import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { MessageComponent } from '../../shared/components/message/message.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CardModule,
    Button
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  constructor(private toastService: ToastService) {}

  testarSucesso(): void {
  this.toastService.success('Operação realizada com sucesso!');
}

testarErro(): void {
  this.toastService.error('Não foi possível realizar a operação.');
}

testarVazio(): void {
  this.toastService.empty('Nenhum dado foi encontrado.');
}

}