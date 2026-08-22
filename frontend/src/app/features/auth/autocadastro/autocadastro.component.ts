import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputMask } from 'primeng/inputmask';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { KeyFilter } from 'primeng/keyfilter';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { paraContrato, paraDecimal } from '../../../shared/util/dinheiro.util';

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

  private cdr = inject(ChangeDetectorRef);

  hasFormError: boolean = false;
  
  private readonly fb = inject(FormBuilder);

  estado: TelaEstado = 'preenchendo';

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
      if (this.hasFormError) {
        this.hasFormError = false;
        if (this.estado === 'erro') {
          this.estado = 'preenchendo';
        }
      }
    });
  }

  get enviando(): boolean {
    return this.estado === 'enviando';
  }

  get sucesso(): boolean {
    return this.estado === 'sucesso';
  }

  get erro(): boolean {
    return this.estado === 'erro';
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

  enviar(): void {
    this.estado = 'enviando';
    this.hasFormError = false;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.estado = 'erro';
      this.hasFormError = true;
      this.cdr.detectChanges(); 
      return; 
    }

    setTimeout(() => {
      try {
        const payload = this.montarPayload();
        this.estado = 'sucesso'; 
      } catch (erroDeExecucao) {
        console.error('Erro interno ao montar payload:', erroDeExecucao);
        this.estado = 'erro';
        this.hasFormError = true;
      }
      this.cdr.detectChanges(); 
    }, 500);
  }

  private montarPayload() {
    const valor = this.form.controls.salario.value;

    const complemento =
      this.form.controls.endereco.controls.complemento.value;

    return {
      cpf: this.somenteDigitos(
        this.form.controls.cpf.value
      ),

      nome: this.form.controls.nome.value,

      email: this.form.controls.email.value,

      telefone: this.somenteDigitos(
        this.form.controls.telefone.value
      ),

      salario: valor !== null
        ? paraContrato(
            paraDecimal(valor.toString())
          )
        : null,

      endereco: {
        logradouro:
          this.form.controls.endereco.controls.logradouro.value,

        numero:
          this.form.controls.endereco.controls.numero.value,

        complemento:
          complemento?.trim()
            ? complemento.trim()
            : null,

        cep: this.somenteDigitos(
          this.form.controls.endereco.controls.cep.value
        ),

        cidade:
          this.form.controls.endereco.controls.cidade.value,

        uf:
          this.form.controls.endereco.controls.uf.value
      }
    };
  }

  private somenteDigitos(
    valor: string | null
  ): string {
    return (valor ?? '').replace(/\D/g, '');
  }

  cancelar(): void {
    this.form.reset();
    this.hasFormError = false;
    this.estado = 'preenchendo';
  }
}