import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { JobService, TempoEsgotadoError } from '../../../core/services/job.service';
import { SolicitacaoService } from '../../../core/services/solicitacao.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import type { Job } from '../../../core/models/job.model';
import type { Cliente } from '../../../core/models/cliente.model';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';
import { DataHoraPipe } from '../../../shared/pipes/data-hora.pipe';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { ModalRejectionComponent } from '../../../shared/components/modal-rejection/modal-rejection.component';

import { AsyncResultComponent, AsyncResultStatus } from '../../../shared/components/async-result/async-result.component';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';

import type { Solicitacao, StatusSolicitacao } from '../../../core/models/solicitacao.model';
import { caminhoDoHref, temRel } from '../../../shared/util/hateoas.util';

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
    DataHoraPipe,
    CpfPipe,
    LoadingComponent,
    MessageComponent,
    AsyncResultComponent,
    JobProgressComponent,
    ModalRejectionComponent
  ],
  templateUrl: './home-gerente.component.html',
  styleUrls: ['./home-gerente.component.scss'],
})
export class HomeGerenteComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly jobService = inject(JobService);
  private readonly solicitacaoService = inject(SolicitacaoService);

  private readonly solicitacoesProcessando = signal<ReadonlySet<string>>(new Set());

  readonly aprovando = signal<string | null>(null);

  readonly resultado = signal<{
    status: AsyncResultStatus;
    mensagem: string;
  } | null>(null);

  readonly filtroAtual = signal<Filtro>('TODAS');
  readonly solicitacoes = signal<Solicitacao[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal('');

  readonly temRel = temRel;

  readonly totais = computed(() => {
    const lista = this.solicitacoes();
    return {
      todas: lista.length,
      pendentes: lista.filter(s => s.status === 'PENDENTE').length,
      aprovadas: lista.filter(s => s.status === 'APROVADA').length,
      naoAprovadas: lista.filter(s => s.status === 'NAO_APROVADA').length,
    };
  });

  readonly solicitacoesFiltradas = computed(() => {
    const filtro = this.filtroAtual();
    const lista = this.solicitacoes();
    if (filtro === 'TODAS') {
      return lista;
    }
    return lista.filter(s => s.status === filtro);
  });

  readonly recusando = signal<Solicitacao | null>(null);
  readonly motivoRecusa = signal('');
  readonly enviandoRecusa = signal(false);

  readonly motivoRecusaValido = computed(() =>
  this.motivoRecusa().trim().length > 0
);

  ngOnInit(): void {
    void this.carregarLista();
  }

  setFiltro(filtro: Filtro): void {
    this.filtroAtual.set(filtro);
  }

  atualizarLista(): void {
    void this.carregarLista();
  }

  estaProcessando(cpf: string): boolean {
    return this.solicitacoesProcessando().has(cpf);
  }

  async aprovar(solicitacao: Solicitacao): Promise<void> {
    const href = solicitacao._links['aprovacao']?.href;
    if (!href || this.estaProcessando(solicitacao.cpf)) {
      return;
    }

    this.resultado.set(null);
    this.marcarProcessando(solicitacao.cpf, true);
    this.aprovando.set(solicitacao.cpf);

    try {
      const job = await this.api.post<Job>(caminhoDoHref(href));
      const jobFinal = await this.jobService.aguardar(job.jobId);

      if (jobFinal.status === 'FALHA') {
        this.resultado.set({
          status: 'FALHA',
          mensagem: mensagemDeErro(jobFinal),
        });
        return;
      }

      const cliente = await this.jobService.resultado<Cliente>(jobFinal);
      this.resultado.set({
        status: 'SUCESSO',
        mensagem: `A solicitação de ${cliente.nome} foi aprovada e a conta foi criada.`,
      });
    } catch (erro) {
      this.resultado.set({
        status: erro instanceof TempoEsgotadoError ? 'TIMEOUT' : 'FALHA',
        mensagem: mensagemDeErro(erro),
      });
    } finally {
      this.marcarProcessando(solicitacao.cpf, false);
      this.aprovando.set(null);
      await this.carregarLista(true);
    }
  }

  private marcarProcessando(cpf: string, ativo: boolean): void {
    this.solicitacoesProcessando.update(processando => {
      const novoSet = new Set(processando);
      if (ativo) {
        novoSet.add(cpf);
      } else {
        novoSet.delete(cpf);
      }
      return novoSet;
    });
  }

  private async carregarLista(silencioso = false): Promise<void> {
    if (!silencioso) {
      this.carregando.set(true);
      this.erro.set('');
    }

    try {
      const resposta = await this.solicitacaoService.listar();
      this.solicitacoes.set(resposta.solicitacoes ?? []);
      this.erro.set('');
    } catch (e) {
      if (!silencioso) {
        this.solicitacoes.set([]);
        this.erro.set(mensagemDeErro(e));
      }
    } finally {
      this.carregando.set(false);
    }
  }

  abrirRecusa(solicitacao: Solicitacao): void {
  const href = solicitacao._links['rejeicao']?.href;

  if (!href || this.estaProcessando(solicitacao.cpf)) {
    return;
  }

  this.resultado.set(null);
  this.motivoRecusa.set('');
  this.recusando.set(solicitacao);
}

  async confirmarRecusa(): Promise<void> {
  const solicitacao = this.recusando();
  const motivo = this.motivoRecusa().trim();
  const href = solicitacao?._links['rejeicao']?.href;

  if (!solicitacao || !href ||!motivo || this.enviandoRecusa()) {
    return;
  }

  this.enviandoRecusa.set(true);

  try {
    const atualizada = await this.solicitacaoService.rejeitar(
      href,
      { motivo }
    );

    this.solicitacoes.update(lista =>
      lista.map(s =>
        s.cpf === atualizada.cpf ? atualizada : s
      )
    );

    this.recusando.set(null);
    this.motivoRecusa.set('');

    this.resultado.set({
      status: 'SUCESSO',
      mensagem: `A solicitação de ${atualizada.nome} foi recusada.`,
    });
  } catch (erro) {
    this.recusando.set(null);

    this.resultado.set({  
      status: 'FALHA',
      mensagem: mensagemDeErro(erro),
    });
  } finally {
    this.enviandoRecusa.set(false);
    }
  }
}
