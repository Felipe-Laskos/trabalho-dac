import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Button } from 'primeng/button';
import { InputMask } from 'primeng/inputmask';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { JobService, TempoEsgotadoError } from '../../../core/services/job.service';
import { GerenteService } from '../../../core/services/gerente.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import type { Gerente } from '../../../core/models/gerente.model';
import { soDigitos } from '../../../shared/util/mascara.util';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';
import {
  AsyncResultComponent,
  type AsyncResultStatus,
} from '../../../shared/components/async-result/async-result.component';

@Component({
  selector: 'app-inserir-gerente',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    InputMask,
    InputText,
    Password,
    JobProgressComponent,
    AsyncResultComponent,
  ],
  templateUrl: './inserir-gerente.component.html',
  styleUrl: './inserir-gerente.component.scss',
})
export class InserirGerenteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly gerentes = inject(GerenteService);
  private readonly jobs = inject(JobService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  readonly resultado = signal<{ status: AsyncResultStatus; mensagem: string } | null>(
    null,
  );

  readonly form = this.fb.group({
    nome: ['', Validators.required],
    cpf: ['', [Validators.required, this.digitos(11)]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, this.digitosEntre(10, 11)]],
    senha: ['', Validators.required],
  });

  campoComErro(campo: string, erro: string): boolean {
    const controle = this.form.get(campo);
    return !!controle?.touched && controle.hasError(erro);
  }

  async enviar(): Promise<void> {
    if (this.enviando()) return;

    this.form.markAllAsTouched();
    this.resultado.set(null);
    if (this.form.invalid) return;

    const valor = this.form.getRawValue();
    this.enviando.set(true);

    try {
      const job = await this.gerentes.criar({
        cpf: soDigitos(valor.cpf ?? ''),
        nome: (valor.nome ?? '').trim(),
        email: (valor.email ?? '').trim(),
        telefone: soDigitos(valor.telefone ?? ''),
        senha: valor.senha ?? '',
      });
      const fim = await this.jobs.aguardar(job.jobId);

      if (fim.status === 'FALHA') {
        this.resultado.set({ status: 'FALHA', mensagem: mensagemDeErro(fim) });
        return;
      }

      const criado = await this.jobs.resultado<Gerente>(fim);
      this.resultado.set({
        status: 'SUCESSO',
        mensagem: `O gerente ${criado.nome} foi cadastrado.`,
      });
    } catch (erro) {
      this.resultado.set({
        status: erro instanceof TempoEsgotadoError ? 'TIMEOUT' : 'FALHA',
        mensagem: mensagemDeErro(erro),
      });
    } finally {
      this.enviando.set(false);
    }
  }

  fecharResultado(): void {
    const sucesso = this.resultado()?.status === 'SUCESSO';
    this.resultado.set(null);
    if (sucesso) {
      void this.router.navigate(['/gerente/gerentes'], { state: { aguardarProjecao: true } });
    }
  }

  private digitos(quantidade: number) {
    return (controle: AbstractControl): ValidationErrors | null => {
      const valor = soDigitos(String(controle.value ?? ''));
      if (!valor) return null;
      return valor.length === quantidade ? null : { quantidadeDigitos: true };
    };
  }

  private digitosEntre(minimo: number, maximo: number) {
    return (controle: AbstractControl): ValidationErrors | null => {
      const valor = soDigitos(String(controle.value ?? ''));
      if (!valor) return null;
      return valor.length >= minimo && valor.length <= maximo
        ? null
        : { quantidadeDigitosEntre: true };
    };
  }
}
