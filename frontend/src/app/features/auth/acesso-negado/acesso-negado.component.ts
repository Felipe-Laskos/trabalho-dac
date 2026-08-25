import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  imports: [Button, RouterLink],
  template: `
    <section class="caixa">
      <h1>Acesso negado</h1>
      <p>Esta área não corresponde ao seu perfil. Volte para a tela inicial da sua conta.</p>
      <p-button label="Ir para o início" [routerLink]="inicio" />
    </section>
  `,
  styles: `
    .caixa {
      max-width: 32rem;
      margin: var(--spacing-xl) auto;
      padding: var(--spacing-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius);
    }
    h1 {
      margin: 0 0 var(--spacing-sm);
      font-size: 1.5rem;
    }
    p {
      margin: 0 0 var(--spacing-lg);
      color: var(--color-text-secondary);
    }
  `,
})
export class AcessoNegadoComponent {
  private readonly auth = inject(AuthService);
  protected readonly inicio = this.auth.rotaInicial();
}
