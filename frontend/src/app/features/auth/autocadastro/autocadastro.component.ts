import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink} from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputMask } from 'primeng/inputmask';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { KeyFilter } from 'primeng/keyfilter';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { paraContrato, paraDecimal } from '../../../shared/util/dinheiro.util';

import { SolicitacaoService } from '../../../core/services/solicitacao.service';
import  { Autocadastro } from '../../../core/models/autocadastro.model';

type TelaEstado = 'preenchendo' | 'enviando' | 'sucesso' | 'erro';

@Component({
  selector: 'app-autocadastro',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    InputMask,
    InputNumber,
    InputText,
    Select,
    MessageComponent,
    KeyFilter
  ],
  templateUrl: './autocadastro.component.html',
  styleUrl: './autocadastro.component.scss'
})
export class AutocadastroComponent implements OnInit {

  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosCampos = signal<Record<string, string>>({});
  
  private readonly hasFormError = signal(false);
  private readonly fb = inject(FormBuilder);

  private readonly solicitacaoService = inject(SolicitacaoService);

  protected readonly estado = signal<TelaEstado>('preenchendo');

  readonly ufs = [
    { label: 'AC', value: 'AC' },
    { label: 'AL', value: 'AL' },
    { label: 'AP', value: 'AP' },
    { label: 'AM', value: 'AM' },
    { label: 'BA', value: 'BA' },
    { label: 'CE', value: 'CE' },
    { label: 'DF', value: 'DF' },
    { label: 'ES', value: 'ES' },
    { label: 'GO', value: 'GO' },
    { label: 'MA', value: 'MA' },
    { label: 'MT', value: 'MT' },
    { label: 'MS', value: 'MS' },
    { label: 'MG', value: 'MG' },
    { label: 'PA', value: 'PA' },
    { label: 'PB', value: 'PB' },
    { label: 'PR', value: 'PR' },
    { label: 'PE', value: 'PE' },
    { label: 'PI', value: 'PI' },
    { label: 'RJ', value: 'RJ' },
    { label: 'RN', value: 'RN' },
    { label: 'RS', value: 'RS' },
    { label: 'RO', value: 'RO' },
    { label: 'RR', value: 'RR' },
    { label: 'SC', value: 'SC' },
    { label: 'SP', value: 'SP' },
    { label: 'SE', value: 'SE' },
    { label: 'TO', value: 'TO' }
  ];

  readonly form = this.fb.group({
    nome: [ '', [ Validators.required ] ],
    cpf: [ '', [ Validators.required, this.quantidadeDigitos(11) ] ],
    email: [ '',  [Validators.required,Validators.email ] ],
    telefone: [ '', [ Validators.required, this.quantidadeDigitosEntre(10, 11) ] ],
    salario: [ null as number | null, [ Validators.required, Validators.min(0.01) ] ],
    endereco: this.fb.group({ logradouro: [ '',[ Validators.required ] ],
    numero: ['',[ Validators.required, Validators.pattern(/^\d+$/) ] ],
    complemento: [''],
    cep: [ '', [ Validators.required, this.quantidadeDigitos(8) ] ],
    cidade: [ '', [ Validators.required ] ],
    uf: ['', [ Validators.required, Validators.pattern(/^[A-Z]{2}$/) ] ]
    })
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      if (this.hasFormError()) {
        this.hasFormError.set(false);
        if (this.estado() === 'erro') { this.estado.set('preenchendo'); 
        }
      }
    });
  }

  get enviando(): boolean {
    return this.estado() === 'enviando';
  }

  get sucesso(): boolean {
    return this.estado() === 'sucesso';
  }

  get erro(): boolean {
    return this.estado() === 'erro';
  }

  campoComErro(
    campo: string,
    erro: string
  ): boolean {
    const control = this.form.get(campo);

    return !!control?.touched && control.hasError(erro);
  }

  private quantidadeDigitos(
    quantidade: number
  ) {
    return (
      control: AbstractControl
    ): ValidationErrors | null => {
      const valor = this.somenteDigitos(control.value);

      if (!valor) {
        return null;
      }

      return valor.length === quantidade
        ? null
        : {
            quantidadeDigitos: true
          };
    };
  }
  
  get emailInformado(): string {
    return this.form.controls.email.value || '';
  }

  get cpfFormatado(): string {
    const cpf = this.somenteDigitos(this.form.controls.cpf.value);
    if (cpf.length === 11) {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  }

  private quantidadeDigitosEntre(
    minimo: number,
    maximo: number
  ) {
    return (
      control: AbstractControl
    ): ValidationErrors | null => {
      const valor = this.somenteDigitos(control.value);

      if (!valor) {
        return null;
      }

      return valor.length >= minimo &&
        valor.length <= maximo
        ? null
        : {
            quantidadeDigitosEntre: true
          };
    };
  }

  private montarPayload(): Autocadastro {
  const valor = this.form.controls.salario.value;
  const complemento =
    this.form.controls.endereco.controls.complemento.value;

  return {
    cpf: this.somenteDigitos(
      this.form.controls.cpf.value
    ),
    nome: this.form.controls.nome.value!,
    email: this.form.controls.email.value!,
    telefone: this.somenteDigitos(
      this.form.controls.telefone.value
    ),
    salario: valor !== null
      ? paraContrato(
          paraDecimal(valor.toString())
        )
      : '',
    endereco: {
      logradouro:
        this.form.controls.endereco.controls.logradouro.value!,
      numero:
        this.form.controls.endereco.controls.numero.value!,
      complemento:
        complemento?.trim()
          ? complemento.trim()
          : null,
      cep: this.somenteDigitos(
        this.form.controls.endereco.controls.cep.value
      ),
      cidade:
        this.form.controls.endereco.controls.cidade.value!,
      uf:
        this.form.controls.endereco.controls.uf.value!
    }
  };
}

  async enviar(): Promise<void> {
  if (this.enviando) {
    return;
  }
  this.form.markAllAsTouched();
  this.hasFormError.set(false);
  this.mensagemErro.set(null);
  this.errosCampos.set({});
  if (this.form.invalid) {
    this.estado.set('erro');
    this.hasFormError.set(true);
    return;
  }
  this.estado.set('enviando');
  try {
    const payload = this.montarPayload();
    await this.solicitacaoService.criar(payload);
    this.estado.set('sucesso');
  } catch (erro) {
    console.error('Erro ao enviar solicitação:', erro);
    this.tratarErro(erro);
  }
}

  private tratarErro(erro: unknown): void {
  this.estado.set('erro');

  if (!(erro instanceof HttpErrorResponse)) {
    this.mensagemErro.set(
      'Não foi possível enviar sua solicitação. Tente novamente.'
    );
    return;
  }

  switch (erro.status) {
    case 400:
      this.tratarErro400(erro);
      break;
    case 409:
      this.tratarErro409(erro);
      break;
    default:
      this.mensagemErro.set(
        'Não foi possível enviar sua solicitação. Tente novamente.'
      );
      break;
  }
}
 
  private tratarErro409(erro: HttpErrorResponse): void {
  const mensagem = this.extrairMensagemErro(erro).toLowerCase();
  if (mensagem.includes('cpf')) {
    this.mensagemErro.set(
      'Já existe solicitação para este CPF.'
    );
    this.form.controls.cpf.markAsTouched();
    return;
  }
  if (mensagem.includes('e-mail') || mensagem.includes('email')) {
    this.mensagemErro.set(
      'Este e-mail já está sendo utilizado.'
    );
    this.form.controls.email.markAsTouched();
    return;
  }
  this.mensagemErro.set(
    'Já existe uma solicitação para os dados informados.'
  );
}

  private extrairMensagemErro(erro: HttpErrorResponse): string {
  if (typeof erro.error === 'string') {
    return erro.error;
  }
  if (erro.error?.message) {
    return erro.error.message;
  }
  if (erro.error?.mensagem) {
    return erro.error.mensagem;
  }
  return erro.message || '';
}

  private tratarErro400(erro: HttpErrorResponse): void {
  const mensagem = this.extrairMensagemErro(erro);
  this.mensagemErro.set(
    mensagem || 'Verifique os campos informados.'
  );
  const campos = this.extrairCamposInvalidos(erro);
  this.errosCampos.set(campos);
  Object.keys(campos).forEach(campo => {
    const control = this.form.get(campo);
    if (control) {
      control.markAsTouched();
      control.setErrors({
        ...(control.errors ?? {}),
        backend: true
      });
    }
  });
}


  private extrairCamposInvalidos(
  erro: HttpErrorResponse
): Record<string, string> {
  const resultado: Record<string, string> = {};
  const campos = erro.error?.fields
    ?? erro.error?.errors
    ?? erro.error?.fieldErrors;
  if (Array.isArray(campos)) {
    for (const item of campos) {
      if (item.field) {
        resultado[item.field] = item.message || 'Campo inválido.';
      }
    }
  }
  if (campos && !Array.isArray(campos) && typeof campos === 'object') {
    Object.entries(campos).forEach(([campo, mensagem]) => {
      resultado[campo] = String(mensagem);
    });
  }
  return resultado;
}

  private somenteDigitos(
    valor: string | null
  ): string {
    return (valor ?? '').replace(/\D/g, '');
  }
  cancelar(): void {
    this.form.reset();
    this.hasFormError.set(false);
    this.estado.set('preenchendo');
  }
}