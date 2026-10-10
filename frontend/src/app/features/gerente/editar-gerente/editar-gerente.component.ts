import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DestroyRef } from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators, type AbstractControl, type ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastService } from '../../../shared/components/toast/toast.service';

import type { Gerente, GerenteUpdate } from '../../../core/models/gerente.model';
import { GerenteService } from '../../../core/services/gerente.service';
import { CpfPipe } from '../../../shared/pipes/cpf.pipe';
import { MessageComponent } from '../../../shared/components/message/message.component';

interface DadosFormulario {
  nome: string;
  telefone: string;
}

function telefoneValido(
  control: AbstractControl,
): ValidationErrors | null {
  const digitos = String(control.value ?? '').replace(/\D/g, '');

  if (!digitos) {
    return null; 
  }

  return digitos.length === 10 || digitos.length === 11
    ? null
    : { telefoneInvalido: true };
}

@Component({
  selector: 'app-editar-gerente',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageComponent,
    CpfPipe,
  ],
  templateUrl: './editar-gerente.component.html',
  styleUrl: './editar-gerente.component.scss',
})
export class EditarGerenteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gerenteService = inject(GerenteService);
  private readonly messageService = inject(MessageService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly gerente = signal<Gerente | null>(null);

  private readonly valoresOriginais = signal<DadosFormulario | null>(null);

  readonly alteracoesPendentes = signal(false);

  readonly quantidadeClientes = computed(
    () => this.gerente()?.quantidadeClientes ?? 0,
  );

  readonly iniciaisGerente = computed(() => {
    const nome = this.gerente()?.nome?.trim();

    if (!nome) {
      return 'GE';
    }

    return nome
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0))
      .join('')
      .toLocaleUpperCase('pt-BR');
  });

  readonly formulario = this.fb.nonNullable.group({
    nome: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/\S/),
      ],
    ],
    telefone: ['', [Validators.required, telefoneValido]],
  });

  readonly cpfUrl = this.route.snapshot.paramMap.get('cpf') ?? '';

  ngOnInit(): void {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.atualizarEstadoAlteracoes());

    if (!this.cpfUrl) {
      this.erro.set('Gerente não encontrado.');
      this.carregando.set(false);
      return;
    }

    void this.carregarGerente();
  }

  async carregarGerente(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      const gerente = await this.gerenteService.buscar(this.cpfUrl);

      this.gerente.set(gerente);

      const dados: DadosFormulario = {
        nome: gerente.nome,
        telefone: this.formatarTelefone(gerente.telefone),
      };

      this.formulario.reset(dados, { emitEvent: false });
      this.valoresOriginais.set(dados);
      this.alteracoesPendentes.set(false);
    } catch (erro: unknown) {
      this.erro.set(this.obterMensagemErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.alteracoesPendentes()) {
      return;
    }

    const gerente = this.gerente();

    if (!gerente) {
      this.erro.set('Não foi possível identificar o gerente para atualização.');
      return;
    }

    const hrefAtualizacao = gerente._links?.['atualizacao']?.href;

    if (!hrefAtualizacao) {
      this.erro.set('O link de atualização do gerente não está disponível.');
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    const dados: GerenteUpdate = {
      nome: this.formulario.controls.nome.value.trim(),
      telefone: this.formulario.controls.telefone.value.replace(/\D/g, ''),
    };

    try {
      const gerenteAtualizado = await this.gerenteService.atualizar(
        hrefAtualizacao,
        dados,
      );

      this.gerente.set({
        ...gerente,
        ...gerenteAtualizado,
      });

      this.valoresOriginais.set({
        nome: dados.nome,
        telefone: this.formatarTelefone(dados.telefone),
      });
      this.atualizarEstadoAlteracoes();

      this.toastService.success('Gerente atualizado com sucesso.');

      await this.router.navigate(['/gerente/gerentes']);
    } catch (erro: unknown) {
      this.erro.set(this.obterMensagemErro(erro));
    } finally {
      this.salvando.set(false);
    }
  }

  voltar(): void {
    if (this.salvando()) {
      return;
    }

    void this.router.navigate(['/gerente/gerentes']);
  }

  telefoneInput(): void {
  const controle = this.formulario.controls.telefone;
  const digitos = controle.value.replace(/\D/g, '').slice(0, 11);
  const telefoneFormatado = this.formatarTelefone(digitos);

  if (controle.value !== telefoneFormatado) {
    controle.setValue(telefoneFormatado, { emitEvent: false });
  }

  this.atualizarEstadoAlteracoes();
}

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

  private atualizarEstadoAlteracoes(): void {
    const original = this.valoresOriginais();

    if (!original) {
      this.alteracoesPendentes.set(false);
      return;
    }

    const atual = this.formulario.getRawValue();

    const nomeAtual = atual.nome.trim();
    const telefoneAtual = atual.telefone.replace(/\D/g, '');
    const nomeOriginal = original.nome.trim();
    const telefoneOriginal = original.telefone.replace(/\D/g, '');

    this.alteracoesPendentes.set(
      nomeAtual !== nomeOriginal ||
      telefoneAtual !== telefoneOriginal,
    );
  }

  private obterMensagemErro(erro: unknown): string {
    if (
      typeof erro === 'object' &&
      erro !== null &&
      'error' in erro
    ) {
      const resposta = erro.error as { mensagem?: string };

      if (resposta?.mensagem) {
        return resposta.mensagem;
      }
    }

    if (erro instanceof Error && erro.message) {
      return erro.message;
    }

    return 'Não foi possível atualizar os dados do gerente. Tente novamente.';
  }
}

