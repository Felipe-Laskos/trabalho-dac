import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { formatarBRL } from '../../../shared/util/dinheiro.util';
import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';

import type { Solicitacao, StatusSolicitacao } from '../../../core/models/solicitacao.model';


type Filtro = 'TODAS' | StatusSolicitacao;

@Component({
  selector: 'app-home-gerente',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    CardModule,
    DinheiroPipe,
  ],
  templateUrl: './home-gerente.component.html',
  styleUrls: ['./home-gerente.component.scss']
})
export class HomeGerenteComponent implements OnInit {

  filtroAtual: Filtro = 'TODAS';

  // Mock simulando o retorno do backend
    solicitacoes: Solicitacao[] = [
    {
      cpf: '111.222.333-96',
      nome: 'Fulano de Tal',
      email: 'fulano@email.com',
      telefone: '41999999999',
      salario: '4500.00',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '100',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR'
      },
      status: 'PENDENTE',
      motivo: null,
      dataHoraProcessamento: null,
      _links: {
        aprovacao: {
          href: '/solicitacoes/11122233396/aprovacao'
        },
        rejeicao: {
          href: '/solicitacoes/11122233396/rejeicao'
        }
      }
    },
    {
      cpf: '444.555.666-01',
      nome: 'Beltrana Souza',
      email: 'beltrana@email.com',
      telefone: '41988888888',
      salario: '2100.00',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '200',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR'
      },
      status: 'PENDENTE',
      motivo: null,
      dataHoraProcessamento: null,
      _links: {
        aprovacao: {
          href: '/solicitacoes/44455566601/aprovacao'
        },
        rejeicao: {
          href: '/solicitacoes/44455566601/rejeicao'
        }
      }
    },
    {
      cpf: '778.899.001-23',
      nome: 'Ciclana Ribeiro',
      email: 'ciclana@email.com',
      telefone: '41977777777',
      salario: '8900.00',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '300',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR'
      },
      status: 'PENDENTE',
      motivo: null,
      dataHoraProcessamento: null,
      _links: {
        aprovacao: {
          href: '/solicitacoes/77889900123/aprovacao'
        },
        rejeicao: {
          href: '/solicitacoes/77889900123/rejeicao'
        }
      }
    },
    {
      cpf: '129.128.610-12',
      nome: 'Catharyna',
      email: 'catharyna@email.com',
      telefone: '41966666666',
      salario: '10000.00',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '400',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR'
      },
      status: 'APROVADA',
      motivo: null,
      dataHoraProcessamento: '2026-08-04T14:12:00',
      _links: {}
    },
    {
      cpf: '332.211.445-60',
      nome: 'Sicrano Alves',
      email: 'sicrano@email.com',
      telefone: '41955555555',
      salario: '600.00',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '500',
        complemento: null,
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR'
      },
      status: 'NAO_APROVADA',
      motivo: 'Renda incompatível com a política do banco',
      dataHoraProcessamento: '2026-08-02T09:40:00',
      _links: {}
    }
  ];

  ngOnInit(): void {}

  get totais() {
    return {
      todas: this.solicitacoes.length,
      pendentes: this.solicitacoes.filter(s => s.status === 'PENDENTE').length,
      aprovadas: this.solicitacoes.filter(s => s.status === 'APROVADA').length,
      naoAprovadas: this.solicitacoes.filter(s => s.status === 'NAO_APROVADA').length
    };
  }

  get solicitacoesFiltradas() {
    if (this.filtroAtual === 'TODAS') return this.solicitacoes;
    return this.solicitacoes.filter(s => s.status === this.filtroAtual);
  }

  setFiltro(filtro: Filtro) {
    this.filtroAtual = filtro;
  }

  formatarBRL = formatarBRL;

  atualizarLista(): void {
    console.log('Atualizando lista...');
  }
}