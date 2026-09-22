import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { ApiService, Parametros } from '../../../core/services/api.service';
import { ClienteResumo } from '../../../core/models/cliente.model';

import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

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
    this.carregarClientes();

    this.buscaControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.carregarClientes();
      });
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

      const resultado = await this.api.get<ClienteResumo[]>(
        '/clientes',
        parametros
      );

      this.clientes = resultado;
      this.buscaRealizada = busca;
    } catch {
      this.hasError = true;
      this.clientes = [];
    } finally {
      this.isLoading = false;
    }
  }
}