import { Component, forwardRef, input } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import Decimal from 'decimal.js';

@Component({
  selector: 'app-money-input',
  standalone: true,
  imports: [InputText],
  templateUrl: './money-input.component.html',
  styleUrl: './money-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoneyInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => MoneyInputComponent),
      multi: true,
    },
  ],
})
export class MoneyInputComponent implements ControlValueAccessor, Validator {
  readonly label = input<string>('');
  readonly inputId = input<string>('money-input');
  readonly placeholder = input<string>('0,00');

  protected valorVisual = '';
  protected desabilitado = false;

  private valorContrato: string | null = null;
  private ultimoValorVisualValido = '';

  private onChange: (valor: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  writeValue(valor: string | null): void {
    this.valorContrato = valor;
    this.valorVisual = this.formatarParaVisual(valor);
    this.ultimoValorVisualValido = this.valorVisual;
  }

  registerOnChange(fn: (valor: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.desabilitado = isDisabled;
  }

  validate(_control: AbstractControl): ValidationErrors | null {
    if (!this.valorContrato) {
      return {
        moneyRequired: true,
      };
    }

    try {
      const valor = new Decimal(this.valorContrato);

      if (!valor.isFinite() || valor.lessThanOrEqualTo(0)) {
        return {
          moneyPositive: true,
        };
      }

      if (!/^\d+\.\d{2}$/.test(this.valorContrato)) {
        return {
          moneyFormat: true,
        };
      }

      return null;
    } catch {
      return {
        moneyFormat: true,
      };
    }
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  protected aoDigitar(event: Event): void {
    const elemento = event.target as HTMLInputElement;
    const valorDigitado = elemento.value;

    if (valorDigitado.includes('-')) {
      elemento.value = this.ultimoValorVisualValido;
      return;
    }

    const valorLimpo = valorDigitado.replace(/[^\d.,]/g, '');

    const indiceVirgula = valorLimpo.indexOf(',');

    if (indiceVirgula >= 0) {
      const parteDecimal = valorLimpo.slice(indiceVirgula + 1).replace(/[.,]/g, '');

      if (parteDecimal.length > 2) {
        elemento.value = this.ultimoValorVisualValido;
        return;
      }
    }

    const valorNormalizado = this.normalizarVisual(valorLimpo);

    this.valorVisual = valorNormalizado;
    elemento.value = this.valorVisual;

    this.valorContrato = this.converterParaContrato(this.valorVisual);

    this.ultimoValorVisualValido = this.valorVisual;

    this.onChange(this.valorContrato);
    this.onValidatorChange();
  }

  protected aoSairDoCampo(): void {
    this.valorVisual = this.formatarParaVisual(this.valorContrato);
    this.ultimoValorVisualValido = this.valorVisual;

    this.onTouched();
    this.onValidatorChange();
  }

  private converterParaContrato(valorVisual: string): string | null {
    if (!valorVisual) {
      return null;
    }

    const semPontos = valorVisual.replace(/\./g, '');
    const normalizado = semPontos.replace(',', '.');

    if (!normalizado || normalizado === '.') {
      return null;
    }

    const partes = normalizado.split('.');
    const inteiro = partes[0] || '0';
    const parteDecimal = partes[1] ?? '';

    if (partes.length > 2 || parteDecimal.length > 2) {
      return null;
    }

    const valor = `${inteiro}.${parteDecimal.padEnd(2, '0')}`;

    try {
      const decimalValor = new Decimal(valor);

      if (!decimalValor.isFinite() || decimalValor.lessThanOrEqualTo(0)) {
        return null;
      }

      return decimalValor.toFixed(2);
    } catch {
      return null;
    }
  }

  private normalizarVisual(valor: string): string {
    const resultado = valor.replace(/[^\d.,]/g, '');

    const indiceVirgula = resultado.indexOf(',');

    if (indiceVirgula >= 0) {
      let parteInteira = resultado.slice(0, indiceVirgula).replace(/[.,]/g, '');

      const parteDecimal = resultado.slice(indiceVirgula + 1).replace(/[.,]/g, '');

      if (!parteInteira) {
        parteInteira = '0';
      }

      return `${this.formatarMilhares(parteInteira)},${parteDecimal}`;
    }

    const parteInteira = resultado.replace(/[.,]/g, '');

    return this.formatarMilhares(parteInteira);
  }

  private formatarMilhares(valor: string): string {
    if (!valor) {
      return '';
    }

    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private formatarParaVisual(valor: string | null): string {
    if (!valor) {
      return '';
    }

    try {
      const decimalValor = new Decimal(valor);

      if (!decimalValor.isFinite()) {
        return '';
      }

      const [inteiro, decimal] = decimalValor.toFixed(2).split('.');

      return `${this.formatarMilhares(inteiro)},${decimal}`;
    } catch {
      return '';
    }
  }
}
