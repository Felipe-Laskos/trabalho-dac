import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { ApiService, Parametros } from '../../../core/services/api.service';
import { ClienteResumo, ClientesList } from '../../../core/models/cliente.model';

import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { mensagemDeErro } from '../../../core/services/erro.util';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';

@Component({
  selector: 'app-clientes-gerente',
  imports: [
    ReactiveFormsModule,
    CpfPipe,
    DinheiroPipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    LoadingComponent,
    MessageComponent,
  ],
  templateUrl: './clientes-gerente.component.html',
  styleUrl: './clientes-gerente.component.scss',
})
export class ClientesGerenteComponent implements OnInit {
  private api = inject(ApiService);

  buscaControl = new FormControl('', { nonNullable: true });
  buscaRealizada = '';

  readonly clientes = signal<ClienteResumo[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal('');

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
    this.carregando.set(true);
    this.erro.set('');

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

      this.clientes.set(resultado.clientes);
      this.buscaRealizada = busca;
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
      this.clientes.set([]);
    } finally {
      this.carregando.set(false);
    }
  }
}