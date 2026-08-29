import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

type Filtro = 'TODAS' | 'PENDENTE' | 'APROVADA' | 'REJEITADA';

interface Solicitacao {
  cpf: string;
  nome: string;
  salario: number;
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA';
  processadaEm?: string;
  motivoRejeicao?: string;
  _links?: { aprovacao?: boolean; rejeicao?: boolean };
}

@Component({
  selector: 'app-home-gerente',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    CardModule
  ],
  templateUrl: './home-gerente.component.html',
  styleUrls: ['./home-gerente.component.scss']
})
export class HomeGerenteComponent implements OnInit {

  filtroAtual: Filtro = 'TODAS';

  // Mock simulando o retorno do backend
  solicitacoes: Solicitacao[] = [
    {
      cpf: '111.222.333-96', nome: 'Fulano de Tal', salario: 4500, status: 'PENDENTE',
      _links: { aprovacao: true, rejeicao: true }
    },
    {
      cpf: '444.555.666-01', nome: 'Beltrana Souza', salario: 2100, status: 'PENDENTE',
      _links: { aprovacao: true, rejeicao: true }
    },
    {
      cpf: '778.899.001-23', nome: 'Ciclana Ribeiro', salario: 8900, status: 'PENDENTE',
      _links: { aprovacao: true, rejeicao: true }
    },
    {
      cpf: '129.128.610-12', nome: 'Catharyna', salario: 10000, status: 'APROVADA',
      processadaEm: '04/08 14:12'
    },
    {
      cpf: '332.211.445-60', nome: 'Sicrano Alves', salario: 600, status: 'REJEITADA',
      processadaEm: '02/08 09:40', motivoRejeicao: 'Renda incompatível com a política do banco'
    }
  ];

  ngOnInit(): void {}

  get totais() {
    return {
      todas: this.solicitacoes.length,
      pendentes: this.solicitacoes.filter(s => s.status === 'PENDENTE').length,
      aprovadas: this.solicitacoes.filter(s => s.status === 'APROVADA').length,
      rejeitadas: this.solicitacoes.filter(s => s.status === 'REJEITADA').length
    };
  }

  get solicitacoesFiltradas() {
    if (this.filtroAtual === 'TODAS') return this.solicitacoes;
    return this.solicitacoes.filter(s => s.status === this.filtroAtual);
  }

  setFiltro(filtro: Filtro) {
    this.filtroAtual = filtro;
  }

  atualizarLista(): void {
    console.log('Atualizando lista...');
  }
}