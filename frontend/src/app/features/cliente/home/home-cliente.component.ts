import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';
import { DataHoraPipe } from '../../../shared/pipes/data-hora.pipe';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import type { Conta } from '../../../core/models/conta.model';
import { acoesDaConta } from '../../../shared/util/acoes-conta.util';

type EstadoTela = 'carregando' | 'ok' | 'erro';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [
    RouterLink,
    CardModule,
    DinheiroPipe,
    DataHoraPipe,
    CpfPipe,
    LoadingComponent,
    MessageComponent,
  ],
  templateUrl: './home-cliente.component.html',
  styleUrls: ['./home-cliente.component.scss'],
})
export class HomeClienteComponent {
  private readonly auth = inject(AuthService);
  private readonly contas = inject(ContaService);

  protected readonly usuario = this.auth.usuarioAtual();
  protected readonly estado = signal<EstadoTela>('carregando');
  protected readonly mensagemErro = signal('');
  protected readonly conta = signal<Conta | null>(null);
  protected readonly atualizandoSaldo = signal(false);

  protected readonly acoes = computed(() => acoesDaConta(this.conta()?._links));

  constructor() {
    void this.recarregarSaldo();
  }

  async recarregarSaldo(): Promise<void> {
    const cpf = this.usuario?.cpf;
    if (!cpf) {
      this.estado.set('erro');
      this.mensagemErro.set('Não encontramos o CPF da sessão.');
      return;
    }

    const jaTemConta = this.conta() !== null;
    if (jaTemConta) {
      this.atualizandoSaldo.set(true);
    } else {
      this.estado.set('carregando');
    }
    this.mensagemErro.set('');

    try {
      const atual = await this.contas.recarregarSaldo(cpf);
      this.conta.set(atual);
      this.estado.set('ok');
    } catch (erro) {
      this.estado.set('erro');
      this.mensagemErro.set(this.textoDeErro(erro));
    } finally {
      this.atualizandoSaldo.set(false);
    }
  }

  private textoDeErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse && erro.status === 403) {
      return 'Você não tem permissão para ver esta conta.';
    }
    return mensagemDeErro(erro);
  }
}
