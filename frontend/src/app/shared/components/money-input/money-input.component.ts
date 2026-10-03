import { Component, forwardRef, input, signal } from '@angular/core';
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

  protected readonly valorVisual = signal('');
  protected readonly desabilitado = signal(false);

  private valorContrato: string | null = null;
  private centavos = new Decimal(0);

  private readonly maxCentavos = new Decimal('999999999999');

  private onChange: (valor: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  writeValue(valor: string | null): void {
    this.valorContrato = valor;

    if (!valor) {
      this.centavos = new Decimal(0);
      this.valorVisual.set('');
      return;
    }

    try {
      const decimalValor = new Decimal(valor);

      if (!decimalValor.isFinite() || decimalValor.lessThanOrEqualTo(0)) {
        this.centavos = new Decimal(0);
        this.valorVisual.set('');
        return;
      }

      this.centavos = Decimal.min(
        decimalValor.times(100).toDecimalPlaces(0, Decimal.ROUND_DOWN),
        this.maxCentavos,
      );

      const visual = this.formatarCentavos(this.centavos);

      this.valorVisual.set(visual);
    } catch {
      this.centavos = new Decimal(0);
      this.valorVisual.set('');
    }
  }

  registerOnChange(fn: (valor: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.desabilitado.set(isDisabled);
  }

  validate(_control: AbstractControl): ValidationErrors | null {
    if (!this.valorContrato) {
      return { moneyRequired: true };
    }

    try {
      const valor = new Decimal(this.valorContrato);

      if (!valor.isFinite() || valor.lessThanOrEqualTo(0)) {
        return { moneyPositive: true };
      }

      if (!/^\d+\.\d{2}$/.test(this.valorContrato)) {
        return { moneyFormat: true };
      }

      return null;
    } catch {
      return { moneyFormat: true };
    }
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  protected aoDigitar(event: Event): void {
    const elemento = event.target as HTMLInputElement;
    const valorDigitado = elemento.value;

    const digitos = valorDigitado.replace(/\D/g, '');

    if (!digitos) {
      this.centavos = new Decimal(0);
      this.aplicar(elemento, true);
      return;
    }

    this.centavos = new Decimal(0);

    for (const digito of digitos) {
      this.entrarDigito(Number(digito));
    }

    this.aplicar(elemento, true);
  }

  protected aoSairDoCampo(): void {
    this.aplicar(undefined, false);

    this.onTouched();
    this.onValidatorChange();
  }

  protected cursorNoFim(elemento: HTMLInputElement): void {
    elemento.setSelectionRange(elemento.value.length, elemento.value.length);
  }

  protected aoFocar(event: Event): void {
    this.cursorNoFim(event.target as HTMLInputElement);
  }

  protected aoClicar(event: MouseEvent): void {
    const elemento = event.target as HTMLInputElement;

    if (elemento.selectionStart === elemento.selectionEnd) {
      this.cursorNoFim(elemento);
    }
  }

  protected aoMouseDown(event: MouseEvent): void {
    const wrapper = event.currentTarget as HTMLElement;
    const input = wrapper.querySelector('input');

    if (!input || input.disabled || event.target === input) {
      return;
    }

    event.preventDefault();
    input.focus();
  }

  private entrarDigito(digito: number): void {
    const proximo = this.centavos.times(10).plus(digito);
    this.centavos = Decimal.min(proximo, this.maxCentavos);
  }

  private aplicar(elemento: HTMLInputElement | undefined, emitir: boolean): void {
    const visual = this.centavos.isZero() ? '' : this.formatarCentavos(this.centavos);

    this.valorVisual.set(visual);

    if (elemento) {
      elemento.value = visual;
    }

    if (emitir) {
      this.atualizarContrato();
      this.onValidatorChange();
    }

    if (elemento) {
      this.cursorNoFim(elemento);
    }
  }

  private formatarCentavos(centavos: Decimal): string {
    const inteiro = centavos.dividedBy(100).floor().toFixed(0);

    const decimal = centavos.modulo(100).toFixed(0).padStart(2, '0');

    return `${this.formatarMilhares(inteiro)},${decimal}`;
  }

  private atualizarContrato(): void {
    if (this.centavos.isZero()) {
      this.valorContrato = null;
      this.onChange(null);
      return;
    }

    this.valorContrato = this.centavos.dividedBy(100).toFixed(2);

    this.onChange(this.valorContrato);
  }

  private formatarMilhares(valor: string): string {
    if (!valor) {
      return '';
    }

    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
