import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  private cdr = inject(ChangeDetectorRef);

  hasLoginError: boolean = false;
  isLoading: boolean = false;
  passwordValue: string = '';

  fazerLogin() { //TODO: Implementar lógica de autenticação real
    this.isLoading = true;
    this.hasLoginError = false;

    setTimeout(() => {
      this.isLoading = false; 

      if (!this.passwordValue || this.passwordValue.length < 6) {
        this.hasLoginError = true;
      } else {
        console.log('Sucesso!');
      }
      this.cdr.detectChanges(); 

    }, 500); 
  }

  esconderErro() {
    this.hasLoginError = false;
  }
}