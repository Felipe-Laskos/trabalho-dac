import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AuthService } from '../../../core/services/auth.service';
import { mensagemDeErro } from '../../../core/services/erro.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    Button,
    RouterLink,
    InputText,
    Password,
    MessageComponent,
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  protected readonly hasLoginError = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly emailValue = signal('');
  protected readonly passwordValue = signal('');
  protected readonly mensagemErro = signal(
    'Login inválido. Confira o e-mail e a senha e tente de novo.',
  );

  constructor() {
    if (this.rota.snapshot.queryParamMap.get('expirou')) {
      this.hasLoginError.set(true);
      this.mensagemErro.set('Sua sessão expirou. Entre novamente.');
    }
  }

  async fazerLogin(): Promise<void> {
    const email = this.emailValue().trim();
    const senha = this.passwordValue();

    this.hasLoginError.set(false);

    if (!email || !senha) {
      this.falhou('Informe e-mail e senha.');
      return;
    }

    this.isLoading.set(true);

    try {
      const sessao = await this.auth.login(email, senha);
      await this.router.navigateByUrl(this.auth.rotaInicial(sessao.tipo));
    } catch (erro) {
      const padrao = 'Login inválido. Confira o e-mail e a senha e tente de novo.';
      this.falhou(mensagemDeErro(erro) || padrao);
    } finally {
      this.isLoading.set(false);
    }
  }

  esconderErro(): void {
    this.hasLoginError.set(false);
  }

  private falhou(mensagem: string): void {
    this.hasLoginError.set(true);
    this.mensagemErro.set(mensagem);
  }
}
