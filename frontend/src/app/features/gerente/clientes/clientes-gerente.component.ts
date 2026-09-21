import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { ApiService, Parametros } from '../../../core/services/api.service';
import {
  ClientesList,
  ClienteResumo,
} from '../../../core/models/cliente.model';

import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

const CLIENTES_MOCK: ClienteResumo[] = [
  {
    cpf: '12912861012',
    nome: 'Catharyna',
    cidade: 'Curitiba',
    estado: 'PR',
    saldo: '800.00',
    _links: {} as any,
  },
  {
    cpf: '98765432100',
    nome: 'Catianna',
    cidade: 'Araucária',
    estado: 'PR',
    saldo: '1250.50',
    _links: {} as any,
  },
  {
    cpf: '45678912300',
    nome: 'Coândrya',
    cidade: 'São José dos Pinhais',
    estado: 'PR',
    saldo: '320.75',
    _links: {} as any,
  },
  {
    cpf: '32165498700',
    nome: 'Cleuddônio',
    cidade: 'Colombo',
    estado: 'PR',
    saldo: '2100.00',
    _links: {} as any,
  },
  {
    cpf: '74185296300',
    nome: 'Cutardo',
    cidade: 'Pinhais',
    estado: 'PR',
    saldo: '560.30',
    _links: {} as any,
  },
];

@Component({
  selector: 'app-clientes-gerente',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    CpfPipe,
    DinheiroPipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './clientes-gerente.component.html',
  styleUrl: './clientes-gerente.component.scss',
})
export class ClientesGerenteComponent implements OnInit {
  private api = inject(ApiService);

  buscaControl = new FormControl('', { nonNullable: true });
  buscaRealizada = '';

  clientes: ClienteResumo[] = [];

  isLoading = true;
  hasError = false;

  ngOnInit(): void {
    this.clientes = CLIENTES_MOCK;
    this.isLoading = false;

    this.buscaControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe((termo) => {
        this.buscarMock(termo);
      });
  }

  private buscarMock(termo: string): void {
    this.isLoading = true;
    this.hasError = false;

    const busca = termo.trim().toLowerCase();

    setTimeout(() => {
      this.buscaRealizada = termo.trim();
      
      if (!busca) {
        this.clientes = CLIENTES_MOCK;
      } else {
        this.clientes = CLIENTES_MOCK.filter((cliente) => {
          const nome = cliente.nome.toLowerCase();
          const cpf = cliente.cpf;

          return nome.includes(busca) || cpf.includes(busca);
        });
      }

      this.isLoading = false;
    }, 300);
  }

  async carregarClientes(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;

    try {
      const parametros: Parametros = {};
      const busca = this.buscaControl.value.trim();

      if (busca) {
        parametros['busca'] = busca;
      }

      const resultado = await this.api.get<ClientesList>(
        '/clientes',
        parametros
      );

      this.clientes = resultado.clientes;
    } catch {
      this.hasError = true;
      this.clientes = [];
    } finally {
      this.isLoading = false;
    }
  }
}