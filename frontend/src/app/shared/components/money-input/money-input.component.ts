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

  protected readonly valorVisual = signal('0,00');
  protected readonly desabilitado = signal(false);

  private valorContrato: string | null = null;
  private ultimoValorVisualValido = '0,00';
  private centavos = 0;

  private readonly maxCentavos = 9_999_999_999_99;

  private onChange: (valor: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  writeValue(valor: string | null): void {
    this.valorContrato = valor;
    this.centavos = this.centavosDeContrato(valor);
    const visual = this.formatarCentavos(this.centavos);
    this.valorVisual.set(visual);
    this.ultimoValorVisualValido = visual;
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

  protected aoFocar(event: FocusEvent): void {
    this.cursorNoFim(event.target as HTMLInputElement);
  }

  protected aoPressionar(event: MouseEvent): void {
    if (this.desabilitado()) {
      return;
    }

    event.preventDefault();
    const wrapper = event.currentTarget as HTMLElement;
    const campo = wrapper.querySelector('input');
    if (!campo || campo.disabled) {
      return;
    }

    campo.focus({ preventScroll: true });
    this.cursorNoFim(campo);
  }

  protected aoClicar(event: Event): void {
    this.cursorNoFim(event.target as HTMLInputElement);
  }

  protected aoTecla(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const elemento = event.target as HTMLInputElement;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      this.cursorNoFim(elemento);
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.entrarDigito(Number(event.key), elemento);
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.centavos = Math.floor(this.centavos / 10);
      this.aplicar(elemento, true);
    }
  }

  protected aoColar(event: ClipboardEvent): void {
    event.preventDefault();
    const texto = event.clipboardData?.getData('text') ?? '';
    if (texto.includes('-')) {
      return;
    }
    this.centavosAPartirDoTexto(texto);
    this.aplicar(event.target as HTMLInputElement, true);
  }

  protected aoDigitar(event: Event): void {
    const elemento = event.target as HTMLInputElement;
    const tipo = (event as InputEvent).inputType;

    if (
      tipo === 'insertText' ||
      tipo === 'deleteContentBackward' ||
      tipo === 'deleteContentForward'
    ) {
      elemento.value = this.valorVisual();
      this.cursorNoFim(elemento);
      return;
    }

    if (elemento.value.includes('-')) {
      elemento.value = this.ultimoValorVisualValido;
      this.cursorNoFim(elemento);
      return;
    }

    this.centavosAPartirDoTexto(elemento.value);
    this.aplicar(elemento, true);
  }

  protected aoSairDoCampo(): void {
    this.aplicar(undefined, true);
    this.onTouched();
  }

  private entrarDigito(digito: number, elemento: HTMLInputElement): void {
    const proximo = this.centavos * 10 + digito;
    this.centavos = Math.min(proximo, this.maxCentavos);
    this.aplicar(elemento, true);
  }

  private aplicar(elemento: HTMLInputElement | undefined, emitir: boolean): void {
    const visual = this.formatarCentavos(this.centavos);
    this.valorVisual.set(visual);
    this.ultimoValorVisualValido = visual;
    this.valorContrato =
      this.centavos > 0 ? new Decimal(this.centavos).dividedBy(100).toFixed(2) : null;

    if (elemento) {
      elemento.value = visual;
      this.cursorNoFim(elemento);
    }

    if (emitir) {
      this.onChange(this.valorContrato);
      this.onValidatorChange();
      queueMicrotask(() => this.onChange(this.valorContrato));
    }
  }

  private centavosAPartirDoTexto(texto: string): void {
    const digitos = texto.replace(/\D/g, '');
    const bruto = Number(digitos);
    this.centavos = Number.isFinite(bruto) ? Math.min(bruto, this.maxCentavos) : 0;
  }

  private centavosDeContrato(valor: string | null): number {
    if (!valor) {
      return 0;
    }
    try {
      const decimalValor = new Decimal(valor);
      if (!decimalValor.isFinite() || decimalValor.lessThan(0)) {
        return 0;
      }
      return decimalValor.times(100).toDecimalPlaces(0).toNumber();
    } catch {
      return 0;
    }
  }

  private cursorNoFim(elemento: HTMLInputElement): void {
    if (typeof elemento.setSelectionRange !== 'function') {
      return;
    }
    const irAoFim = () => {
      const fim = elemento.value.length;
      elemento.setSelectionRange(fim, fim);
    };
    irAoFim();
    queueMicrotask(irAoFim);
    requestAnimationFrame(irAoFim);
    setTimeout(irAoFim, 0);
  }

  private formatarCentavos(centavos: number): string {
    const inteiro = Math.floor(centavos / 100);
    const decimal = String(centavos % 100).padStart(2, '0');
    return `${this.formatarMilhares(String(inteiro))},${decimal}`;
  }

  private formatarMilhares(valor: string): string {
    if (!valor) return '0';
    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private formatarParaVisual(valor: string | null): string {
    return this.formatarCentavos(this.centavosDeContrato(valor));
  }
}
