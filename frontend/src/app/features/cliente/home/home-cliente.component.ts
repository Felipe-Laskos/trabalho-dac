import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';
import { Conta } from '../../../core/models/conta.model';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    DinheiroPipe
  ],
  templateUrl: './home-cliente.component.html',
  styleUrls: ['./home-cliente.component.scss']
})
export class HomeClienteComponent implements OnInit {

  // Mock temporário
  usuario = {
    nome: 'Catharyna',
    cpf: '129.128.610-12',
    email: 'cli1@bantads.com.br'
  };

  conta: Conta = {
    numero: '1291',
    cpfCliente: '129.128.610-12',
    cpfGerente: '',
    saldo: '800.00',
    dataCriacao: '2000-01-01',
    _links: {}
  };

  ngOnInit(): void {
  }
}

