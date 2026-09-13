import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
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
    ButtonModule,
    AvatarModule,
    ToastComponent,
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly perfil = computed(() => this.auth.tipo());
  protected readonly nomeUsuario = computed(() => this.auth.nomeExibicao());
  protected readonly inicialUsuario = computed(() => {
    const nome = this.auth.nomeExibicao();
    return nome ? nome.charAt(0).toUpperCase() : '?';
  });

  protected readonly menuItems = computed<MenuItem[]>(() => {
    if (this.auth.ehPerfil('GERENTE')) {
      return [
        { label: 'Início', icon: 'pi pi-home', routerLink: '/gerente/home' },
        { label: 'Solicitações', icon: 'pi pi-inbox', routerLink: '/gerente/solicitacoes' },
        { label: 'Clientes', icon: 'pi pi-users', routerLink: '/gerente/clientes' },
        { label: 'Gerentes', icon: 'pi pi-user', routerLink: '/gerente/gerentes' },
        { label: 'Relatório', icon: 'pi pi-chart-bar', routerLink: '/gerente/relatorio' },
      ];
    }

    return [
      { label: 'Início', icon: 'pi pi-home', routerLink: '/cliente/home' },
      { label: 'Depósito', icon: 'pi pi-arrow-down', routerLink: '/cliente/deposito' },
      { label: 'Saque', icon: 'pi pi-arrow-up', routerLink: '/cliente/saque' },
      { label: 'Transferência', icon: 'pi pi-arrow-right-arrow-left', routerLink: '/cliente/transferencia' },
      { label: 'Extrato', icon: 'pi pi-file', routerLink: '/cliente/extrato' },
    ];
  });

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
