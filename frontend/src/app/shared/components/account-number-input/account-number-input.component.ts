import { Component, forwardRef, input, output, signal } from '@angular/core';

import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-account-number-input',
  standalone: true,
  imports: [InputText],
  templateUrl: './account-number-input.component.html',
  styleUrl: './account-number-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AccountNumberInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => AccountNumberInputComponent),
      multi: true,
    },
  ],
})
export class AccountNumberInputComponent implements ControlValueAccessor, Validator {
  readonly label = input<string>('Número da conta');
  readonly inputId = input<string>('account-number-input');
  readonly placeholder = input<string>('0000');

  readonly valorAlterado = output<string | null>();

  protected readonly valor = signal('');
  protected readonly desabilitado = signal(false);

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  writeValue(valor: string | null | undefined): void {
    this.valor.set(this.sanitizar(valor ? String(valor) : ''));
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.desabilitado.set(isDisabled);
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const val = control.value;

    if (!val) {
      return { accountRequired: true };
    }

    if (!/^\d{4}$/.test(String(val))) {
      return { accountLength: true };
    }

    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  protected aoDigitar(event: Event): void {
    const elemento = event.target as HTMLInputElement;
    const valorSanitizado = this.sanitizar(elemento.value);

    this.valor.set(valorSanitizado);
    elemento.value = this.valor();

    this.onChange(this.valor());
    this.valorAlterado.emit(this.valor() || null);
    this.onValidatorChange();
  }

  protected aoSairDoCampo(): void {
    this.onTouched();
    this.onValidatorChange();
  }

  private sanitizar(valor: string): string {
    return valor.replace(/\D/g, '').slice(0, 4);
  }
}
