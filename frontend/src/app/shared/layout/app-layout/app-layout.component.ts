import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { ToastComponent } from '../../components/toast/toast.component';

type Perfil = 'CLIENTE' | 'GERENTE';

interface Usuario {
  nome: string;
  email: string;
  tipo: Perfil;
  cpf?: string; // Para suportar o mock do cliente
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ToolbarModule,
    MenuModule,
    ButtonModule,
    AvatarModule,
    ToastComponent
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss'
})
export class AppLayoutComponent {

  private router = inject(Router);

  // Mock temporário
  // TODO: Substituir pelo usuário fornecido pelo AuthService 
  private usuario = signal<Usuario>({
    nome: 'Cliente',
    email: 'cli1@bantads.com.br',
    tipo: 'CLIENTE',
    cpf: '129.128.610-12'
  });

  constructor() {
    if (window.location.pathname.includes('/gerente')) {
      this.usuario.set({ 
        nome: 'Geniéve', 
        tipo: 'GERENTE', 
        email: 'ger1@bantads.com.br' 
      });
    }
  }

  perfil = computed(() => this.usuario().tipo);
  nomeUsuario = computed(() => this.usuario().nome);
  emailUsuario = computed(() => this.usuario().email);
  inicialUsuario = computed(() =>
    this.usuario().nome.charAt(0).toUpperCase()
  );

  menuItems = computed<MenuItem[]>(() => {
    if (this.perfil() === 'CLIENTE') {
      return [
        { label: 'Início',
          icon: 'pi pi-home',
          routerLink: '/cliente/home'
        },
        { label: 'Depósito',
          icon: 'pi pi-arrow-down',
          routerLink: '/cliente/deposito'
        },
        { label: 'Saque',
          icon: 'pi pi-arrow-up',
          routerLink: '/cliente/saque'
        },
        { label: 'Transferência',
          icon: 'pi pi-arrow-right-arrow-left',
          routerLink: '/cliente/transferencia'
        },
        { label: 'Extrato',
          icon: 'pi pi-file',
          routerLink: '/cliente/extrato'
        }
      ];
    }

    return [
      { label: 'Solicitações',
        icon: 'pi pi-inbox',
        routerLink: '/gerente/solicitacoes'
      },
      { label: 'Clientes',
        icon: 'pi pi-users',
        routerLink: '/gerente/clientes'
      },
      { label: 'Gerentes',
        icon: 'pi pi-user',
        routerLink: '/gerente/gerentes'
      },
      { label: 'Relatório',
        icon: 'pi pi-chart-bar',
        routerLink: '/gerente/relatorio'
      }
    ];
  });

  logout(): void {
    //TODO: Implementar this.authService.logout()
  }


  // TODO: REMOVER - Botão temporário 
  alternarPerfilDev() {
    if (this.usuario().tipo === 'CLIENTE') {
      this.usuario.set({ 
        nome: 'Geniéve', 
        tipo: 'GERENTE', 
        email: 'ger1@bantads.com.br' 
      });
      this.router.navigate(['/gerente/solicitacoes']);
    } else {
      this.usuario.set({ 
        nome: 'Cliente', 
        tipo: 'CLIENTE', 
        cpf: '129.128.610-12', 
        email: 'cli1@bantads.com.br' 
      });
      this.router.navigate(['/cliente/home']);
    }
  }

}