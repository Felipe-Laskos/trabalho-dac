import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

import { Gerente } from '../../../core/models/gerente.model';
import { GerenteService } from '../../../core/services/gerente.service';

import { CpfPipe } from '../../../shared/pipes/cpf.pipe';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { ModalConfirmationComponent } from '../../../shared/components/modal-confirmation/modal-confirmation.component';

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
],
  templateUrl: './lista-gerentes.component.html',
  styleUrl: './lista-gerentes.component.scss',
})
export class ListaGerentesComponent implements OnInit {
  private readonly gerenteService = inject(GerenteService);
  private readonly router = inject(Router);
  

  readonly gerenteParaRemover = signal<Gerente | null>(null);
  readonly gerentes = signal<Gerente[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarGerentes();
  }

  async carregarGerentes(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      const resultado = await this.gerenteService.listar();
      const gerentesOrdenados = [...resultado.gerentes].sort(
        (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', {
          sensitivity: 'base',
        }),
      );
  this.gerentes.set(gerentesOrdenados);
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

  confirmarRemocaoGerente(): void {
    const gerente = this.gerenteParaRemover();

    if (!gerente) {
      return;
    }

    this.remover(gerente);
  }

  private remover(_gerente: Gerente): void {
    this.gerenteParaRemover.set(null);

    // A remoção será implementada quando o DELETE /gerentes/{cpf} estiver disponível.
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