import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule
  ],
  templateUrl: './home-cliente.component.html',
  styleUrls: ['./home-cliente.component.scss']
})
export class HomeClienteComponent implements OnInit {

  // Mock temporário
 
  usuario: any = {
    nome: 'Cliente',
    cpf: '129.128.610-12',
    email: 'cli1@bantads.com.br'
  };

  conta: any = {
    numero: '1291',
    dataAbertura: '01/01/2000',
    saldo: '800,00'
  };

  ngOnInit(): void {
  }
}