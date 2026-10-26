import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { JobService, TempoEsgotadoError } from '../../../core/services/job.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import type { RelatorioClienteLinha, ResultadoRelatorioClientes } from '../../../core/models/job.model';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';
import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';
import {
  AsyncResultComponent,
  type AsyncResultStatus,
} from '../../../shared/components/async-result/async-result.component';

@Component({
  selector: 'app-relatorio-clientes',
  standalone: true,
  imports: [
    Button,
    TableModule,
    CpfPipe,
    DinheiroPipe,
    DatePipe,
    JobProgressComponent,
    AsyncResultComponent,
  ],
  templateUrl: './relatorio-clientes.component.html',
  styleUrl: './relatorio-clientes.component.scss',
  encapsulation: ViewEncapsulation.None 
})
export class RelatorioClientesComponent {
  private readonly relatorios = inject(RelatorioService);
  private readonly jobs = inject(JobService);

  readonly gerando = signal(false);
  readonly linhas = signal<RelatorioClienteLinha[] | null>(null);
  readonly geradoEm = signal<Date | null>(null);
  readonly resultado = signal<{ status: AsyncResultStatus; mensagem: string } | null>(null);

  async gerar(): Promise<void> {
    if (this.gerando()) return;

    this.gerando.set(true);
    this.resultado.set(null);

    try {
      const job = await this.relatorios.gerarClientes();
      const fim = await this.jobs.aguardar(job.jobId);

      if (fim.status === 'FALHA') {
        this.resultado.set({ status: 'FALHA', mensagem: mensagemDeErro(fim) });
        return;
      }

      const { clientes } = await this.jobs.resultado<ResultadoRelatorioClientes>(fim);
      this.linhas.set(clientes);
      this.geradoEm.set(new Date());
    } catch (erro) {
      this.resultado.set({
        status: erro instanceof TempoEsgotadoError ? 'TIMEOUT' : 'FALHA',
        mensagem: mensagemDeErro(erro),
      });
    } finally {
      this.gerando.set(false);
    }
  }
}