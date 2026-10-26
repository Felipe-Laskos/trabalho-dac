import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  imports: [Button, RouterLink],
  templateUrl: './acesso-negado.component.html',
  styleUrl: './acesso-negado.component.scss',
})
export class AcessoNegadoComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly inicio = this.auth.rotaInicial();
  protected readonly nome = this.auth.nomeExibicao() || 'sua conta';
  protected readonly entrouComoCliente = this.auth.ehPerfil('CLIENTE');

  protected async sair(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
