import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { MessageComponent } from '../../../shared/components/message/message.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    Button,
    InputText,
    Password,
    MessageComponent,
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  protected readonly hasLoginError = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly passwordValue = signal('');

  fazerLogin() { //TODO: Implementar lógica de autenticação real
    this.isLoading.set(true);
    this.hasLoginError.set(false);

    setTimeout(() => {
      this.isLoading.set(false);
    }, 500); 
  }

  esconderErro() {
    this.hasLoginError.set(false);
  }
}