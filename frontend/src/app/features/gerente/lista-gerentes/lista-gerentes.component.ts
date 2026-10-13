import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

import { Gerente } from '../../../core/models/gerente.model';
import type { ResultadoRemocaoGerente } from '../../../core/models/job.model';
import { GerenteService } from '../../../core/services/gerente.service';
import { JobService, TempoEsgotadoError } from '../../../core/services/job.service';
import { mensagemDeErro } from '../../../core/services/erro.util';

import { CpfPipe } from '../../../shared/pipes/cpf.pipe';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { ModalConfirmationComponent } from '../../../shared/components/modal-confirmation/modal-confirmation.component';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';
import {
  AsyncResultComponent,
  type AsyncResultStatus,
} from '../../../shared/components/async-result/async-result.component';

@Component({
  selector: 'app-lista-gerentes',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    CpfPipe,
    LoadingComponent,
    MessageComponent,
    ModalConfirmationComponent,
    JobProgressComponent,
    AsyncResultComponent,
],
  templateUrl: './lista-gerentes.component.html',
  styleUrl: './lista-gerentes.component.scss',
})
export class ListaGerentesComponent implements OnInit {
  private readonly gerenteService = inject(GerenteService);
  private readonly jobs = inject(JobService);
  private readonly router = inject(Router);

  readonly gerenteParaRemover = signal<Gerente | null>(null);
  readonly gerentes = signal<Gerente[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly removendo = signal(false);
  readonly resultado = signal<{ status: AsyncResultStatus; mensagem: string } | null>(null);

  ngOnInit(): void {
    this.carregarGerentes();
  }

  async carregarGerentes(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      const resultado = await this.gerenteService.listar();
      this.gerentes.set(resultado.gerentes);
    } catch (erro: unknown) {
      this.erro.set(this.obterMensagemErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  editar(gerente: Gerente): void {
    this.router.navigate(['/gerente/gerentes', gerente.cpf, 'editar']);
  }

  novoGerente(): void {
    this.router.navigate(['/gerente/gerentes/novo']);
  }

  confirmarRemocao(gerente: Gerente): void {
  this.gerenteParaRemover.set(gerente);
}

  cancelarRemocao(): void {
    this.gerenteParaRemover.set(null);
  }

  confirmarRemocaoGerente(): Promise<void> {
    const gerente = this.gerenteParaRemover();

    if (!gerente) {
      return Promise.resolve();
    }

    return this.remover(gerente);
  }

  private async remover(gerente: Gerente): Promise<void> {
    const href = gerente._links['remocao']?.href;
    this.gerenteParaRemover.set(null);
    if (!href || this.removendo()) return;

    this.removendo.set(true);
    try {
      const job = await this.gerenteService.remover(href);
      const fim = await this.jobs.aguardar(job.jobId);
      if (fim.status === 'FALHA') {
        this.resultado.set({ status: 'FALHA', mensagem: mensagemDeErro(fim) });
        return;
      }
      const { mensagem } = await this.jobs.resultado<ResultadoRemocaoGerente>(fim);
      this.resultado.set({ status: 'SUCESSO', mensagem });
    } catch (erro) {
      this.resultado.set({
        status: erro instanceof TempoEsgotadoError ? 'TIMEOUT' : 'FALHA',
        mensagem: mensagemDeErro(erro),
      });
    } finally {
      this.removendo.set(false);
      await this.carregarGerentes();
    }
  }

  readonly detalhesRemocao = computed(() => {
  const gerente = this.gerenteParaRemover();

  if (!gerente) {
    return [];
  }

  return [
    {
      rotulo: 'Nome',
      valor: gerente.nome,
    },
    {
      rotulo: 'CPF',
      valor: gerente.cpf,
    },
    {
      rotulo: 'Clientes',
      valor: String(gerente.quantidadeClientes ?? 0),
    },
  ];
});

  formatarTelefone(telefone: string): string {
    const numeros = telefone.replace(/\D/g, '');

    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }

    if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }

    return telefone;
  }

  obterIniciais(nome: string): string {
    if (!nome?.trim()) {
      return '';
    }

    const partes = nome.trim().split(/\s+/);

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }

  private obterMensagemErro(erro: unknown): string {
  if (typeof erro === 'object' && erro !== null && 'error' in erro) {
    const resposta = erro.error;

    if (typeof resposta === 'object' && resposta !== null) {
      if ('mensagem' in resposta && typeof resposta.mensagem === 'string') {
        return resposta.mensagem;
      }

      if ('message' in resposta && typeof resposta.message === 'string') {
        return resposta.message;
      }
    }
  }

  if (erro instanceof Error && erro.message) {
    return erro.message;
  }

  return 'Não foi possível carregar os gerentes. Tente novamente.';
}
}