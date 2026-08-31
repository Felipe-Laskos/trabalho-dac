import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  protected readonly inicio = this.auth.rotaInicial();
}
