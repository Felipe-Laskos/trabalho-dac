import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { Button } from 'primeng/button';
import type { MenuItem } from 'primeng/api';
import { ToastComponent } from '../../components/toast/toast.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    ToolbarModule,
    MenuModule,
    Button,
    ToastComponent
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss'
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly nomeUsuario = computed(() => this.auth.nomeExibicao());

  protected readonly menuItems = computed<MenuItem[]>(() => {
    if (this.auth.ehPerfil('GERENTE')) {
      return [
        { label: 'Solicitações', icon: 'pi pi-inbox', routerLink: '/gerente/solicitacoes' },
        { label: 'Clientes', icon: 'pi pi-users', routerLink: '/gerente/clientes' },
        { label: 'Gerentes', icon: 'pi pi-id-card', routerLink: '/gerente/gerentes' },
        { label: 'Relatório', icon: 'pi pi-chart-bar', routerLink: '/gerente/relatorio' },
      ];
    }

    return [
      { label: 'Início', icon: 'pi pi-home', routerLink: '/cliente/home' },
      { label: 'Depósito', icon: 'pi pi-plus', routerLink: '/cliente/deposito' },
      { label: 'Saque', icon: 'pi pi-minus', routerLink: '/cliente/saque' },
      { label: 'Transferência', icon: 'pi pi-send', routerLink: '/cliente/transferencia' },
      { label: 'Extrato', icon: 'pi pi-list', routerLink: '/cliente/extrato' },
    ];
  });

  async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl('/login');
  }
}
