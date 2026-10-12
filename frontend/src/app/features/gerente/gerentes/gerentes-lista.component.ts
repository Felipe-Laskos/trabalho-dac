import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { GerenteService } from '../../../core/services/gerente.service';
import { JobService, TempoEsgotadoError } from '../../../core/services/job.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import type { Gerente } from '../../../core/models/gerente.model';
import { temRel } from '../../../shared/util/hateoas.util';
import { mascararTelefone } from '../../../shared/util/mascara.util';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';
import {
  AsyncResultComponent,
  type AsyncResultStatus,
} from '../../../shared/components/async-result/async-result.component';

@Component({
  selector: 'app-gerentes-lista',
  standalone: true,
  imports: [
    RouterLink,
    Button,
    Dialog,
    TableModule,
    CpfPipe,
    LoadingComponent,
    MessageComponent,
    JobProgressComponent,
    AsyncResultComponent,
  ],
  templateUrl: './gerentes-lista.component.html',
  styleUrl: './gerentes-lista.component.scss',
})
export class GerentesListaComponent implements OnInit {
  private readonly gerentes = inject(GerenteService);
  private readonly jobs = inject(JobService);

  protected readonly temRel = temRel;
  protected readonly mascararTelefone = mascararTelefone;

  readonly lista = signal<Gerente[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal('');
  readonly alvo = signal<Gerente | null>(null);
  readonly removendo = signal(false);
  readonly resultado = signal<{ status: AsyncResultStatus; mensagem: string } | null>(null);

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(silencioso = false): Promise<void> {
    if (!silencioso) {
      this.carregando.set(true);
      this.erro.set('');
    }

    try {
      const resposta = await this.gerentes.listar();
      this.lista.set(resposta.gerentes ?? []);
      this.erro.set('');
    } catch (erro) {
      if (!silencioso) {
        this.lista.set([]);
        this.erro.set(mensagemDeErro(erro));
      }
    } finally {
      this.carregando.set(false);
    }
  }

  pedirRemocao(gerente: Gerente): void {
    if (!temRel(gerente._links, 'remocao') || this.removendo()) return;
    this.alvo.set(gerente);
  }

  cancelarRemocao(): void {
    if (this.removendo()) return;
    this.alvo.set(null);
  }

  async confirmarRemocao(): Promise<void> {
    const gerente = this.alvo();
    const href = gerente?._links['remocao']?.href;
    if (!gerente || !href || this.removendo()) return;

    this.removendo.set(true);
    this.resultado.set(null);

    try {
      const job = await this.gerentes.remover(href);
      const fim = await this.jobs.aguardar(job.jobId);

      if (fim.status === 'FALHA') {
        this.resultado.set({ status: 'FALHA', mensagem: mensagemDeErro(fim) });
        return;
      }

      const inline = await this.jobs.resultado<{ mensagem?: string }>(fim);
      this.resultado.set({
        status: 'SUCESSO',
        mensagem: inline.mensagem ?? 'Gerente removido.',
      });
    } catch (erro) {
      this.resultado.set({
        status: erro instanceof TempoEsgotadoError ? 'TIMEOUT' : 'FALHA',
        mensagem: mensagemDeErro(erro),
      });
    } finally {
      this.alvo.set(null);
      this.removendo.set(false);
      await this.carregar(true);
    }
  }
}
