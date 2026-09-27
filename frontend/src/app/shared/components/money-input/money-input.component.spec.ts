import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MoneyInputComponent } from './money-input.component';
import  Decimal  from 'decimal.js';

@Component({
  imports: [ReactiveFormsModule, MoneyInputComponent],
  template: `<app-money-input [formControl]="valor" />`,
})
class HospedeiroMoneyInput {
  readonly valor = new FormControl<string | null>('100.00');
}

describe('MoneyInputComponent', () => {
  let component: MoneyInputComponent;
  let fixture: ComponentFixture<MoneyInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoneyInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MoneyInputComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Valores padrão', () => {
    it('deve possuir placeholder padrão', () => {
      expect(component.placeholder()).toBe('0,00');
    });

    it('deve possuir label vazio por padrão', () => {
      expect(component.label()).toBe('');
    });

    it('deve iniciar habilitado', () => {
      expect((component as any).desabilitado()).toBe(false);
    });

    it('deve iniciar com valor visual vazio', () => {
      expect((component as any).valorVisual()).toBe('');
    });

    it('deve iniciar com último valor visual válido vazio', () => {
      expect((component as any).ultimoValorVisualValido).toBe('');
    });

    it('deve iniciar com zero centavos', () => {
      expect((component as any).centavos.toString()).toBe('0');
    });
  });

  describe('ControlValueAccessor', () => {
    it('deve formatar o valor recebido pelo formulário para visualização', () => {
      component.writeValue('1234.50');

      expect((component as any).valorVisual()).toBe('1.234,50');
    });

    it('deve limpar o valor visual quando receber null', () => {
      component.writeValue(null);

      expect((component as any).valorVisual()).toBe('');
      expect((component as any).ultimoValorVisualValido).toBe('');
      expect((component as any).centavos.toString()).toBe('0');
    });

    it('deve limpar o valor visual quando receber string vazia', () => {
      component.writeValue('');

      expect((component as any).valorVisual()).toBe('');
      expect((component as any).ultimoValorVisualValido).toBe('');
    });

    it('deve limpar o valor visual quando receber valor inválido', () => {
      component.writeValue('abc');

      expect((component as any).valorVisual()).toBe('');
      expect((component as any).ultimoValorVisualValido).toBe('');
      expect((component as any).centavos.toString()).toBe('0');
    });

    it('deve limpar o valor visual quando receber valor menor ou igual a zero', () => {
      component.writeValue('0.00');

      expect((component as any).valorVisual()).toBe('');
      expect((component as any).ultimoValorVisualValido).toBe('');
      expect((component as any).centavos.toString()).toBe('0');
    });

    it('deve atualizar o estado desabilitado', () => {
      component.setDisabledState(true);

      expect((component as any).desabilitado()).toBe(true);

      component.setDisabledState(false);

      expect((component as any).desabilitado()).toBe(false);
    });
  });

  describe('Validação', () => {
    it('deve retornar moneyRequired quando o valor estiver vazio', () => {
      component.writeValue(null);

      const resultado = component.validate({} as any);

      expect(resultado).toEqual({
        moneyRequired: true,
      });
    });

    it('deve retornar moneyPositive quando o valor for zero', () => {
      component.writeValue('0.00');

      const resultado = component.validate({} as any);

      expect(resultado).toEqual({
        moneyPositive: true,
      });
    });

    it('deve retornar moneyPositive quando o valor for negativo', () => {
      component.writeValue('-10.00');

      const resultado = component.validate({} as any);

      expect(resultado).toEqual({
        moneyPositive: true,
      });
    });

    it('deve retornar moneyFormat quando o valor não possuir duas casas decimais', () => {
      component.writeValue('10.5');

      const resultado = component.validate({} as any);

      expect(resultado).toEqual({
        moneyFormat: true,
      });
    });

    it('deve retornar null quando o valor for positivo e estiver no formato correto', () => {
      component.writeValue('100.00');

      const resultado = component.validate({} as any);

      expect(resultado).toBeNull();
    });
  });

  describe('Digitação', () => {
    it('deve transformar o primeiro dígito em centavos', () => {
      const elemento = document.createElement('input');
      elemento.value = '1';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(elemento.value).toBe('0,01');
      expect((component as any).valorContrato).toBe('0.01');
    });

    it('deve transformar os dígitos em valor monetário', () => {
      const elemento = document.createElement('input');
      elemento.value = '123';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(elemento.value).toBe('1,23');
      expect((component as any).valorContrato).toBe('1.23');
    });

    it('deve formatar milhares durante a digitação', () => {
      const elemento = document.createElement('input');
      elemento.value = '123456';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(elemento.value).toBe('1.234,56');
      expect((component as any).valorContrato).toBe('1234.56');
    });

    it('deve ignorar caracteres que não sejam dígitos', () => {
      const elemento = document.createElement('input');
      elemento.value = '12345abc';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(elemento.value).toBe('123,45');
      expect((component as any).valorContrato).toBe('123.45');
    });

    it('deve limpar o valor quando não houver nenhum dígito', () => {
      component.writeValue('100.00');

      const elemento = document.createElement('input');
      elemento.value = '';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(elemento.value).toBe('');
      expect((component as any).valorVisual()).toBe('');
      expect((component as any).valorContrato).toBeNull();
      expect((component as any).centavos.toString()).toBe('0');
    });

    it('deve limitar o valor máximo permitido', () => {
      const elemento = document.createElement('input');
      elemento.value = '999999999999';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect((component as any).valorContrato).toBe('9999999999.99');
    });

    it('deve chamar onChange ao digitar um valor válido', () => {
      let valorRecebido: string | null = null;

      component.registerOnChange((valor) => {
        valorRecebido = valor;
      });

      const elemento = document.createElement('input');
      elemento.value = '25075';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(valorRecebido).toBe('250.75');
    });

    it('deve chamar onValidatorChange ao digitar', () => {
      let chamou = false;

      component.registerOnValidatorChange(() => {
        chamou = true;
      });

      const elemento = document.createElement('input');
      elemento.value = '100';

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(chamou).toBe(true);
    });
  });

  describe('Eventos do formulário', () => {
    it('deve chamar onTouched ao sair do campo', () => {
      let foiTocado = false;

      component.registerOnTouched(() => {
        foiTocado = true;
      });

      (component as any).aoSairDoCampo();

      expect(foiTocado).toBe(true);
    });

    it('deve chamar onValidatorChange ao sair do campo', () => {
      let chamou = false;

      component.registerOnValidatorChange(() => {
        chamou = true;
      });

      (component as any).aoSairDoCampo();

      expect(chamou).toBe(true);
    });
  });

  describe('Formatação', () => {
    it('deve formatar milhares com pontos', () => {
      const resultado = (component as any).formatarMilhares('1234567');

      expect(resultado).toBe('1.234.567');
    });

    it('deve formatar centavos corretamente', () => {
        const resultado = (component as any).formatarCentavos(
        new Decimal(123450),
      );

      expect(resultado).toBe('1.234,50');
    });

    it('deve formatar zero centavos como zero', () => {
      const resultado = (component as any).formatarCentavos(
        new Decimal(0),
      );

      expect(resultado).toBe('0,00');
    });
  });

  describe('Cursor', () => {
    it('deve posicionar o cursor no final do input', () => {
      const input = document.createElement('input');

      input.value = '1.234,50';

      document.body.appendChild(input);

      (component as any).cursorNoFim(input);

      expect(input.selectionStart).toBe(input.value.length);
      expect(input.selectionEnd).toBe(input.value.length);

      input.remove();
    });

    it('deve posicionar o cursor no final ao receber foco', () => {
      const input = document.createElement('input');

      input.value = '1.234,50';

      document.body.appendChild(input);

      const evento = {
        target: input,
      } as unknown as Event;

      (component as any).aoFocar(evento);

      expect(input.selectionStart).toBe(input.value.length);
      expect(input.selectionEnd).toBe(input.value.length);

      input.remove();
    });

    it('deve posicionar o cursor no final ao clicar no wrapper', () => {
      const wrapper = document.createElement('div');
      const input = document.createElement('input');

      input.value = '1.234,50';

      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      const evento = {
        currentTarget: wrapper,
      } as unknown as MouseEvent;

      (component as any).aoMouseDown(evento);

      expect(input.selectionStart).toBe(input.value.length);
      expect(input.selectionEnd).toBe(input.value.length);

      wrapper.remove();
    });

    it('deve posicionar o cursor no final ao aplicar o valor', () => {
      const input = document.createElement('input');

      input.value = '';

      document.body.appendChild(input);

      (component as any).centavos = new Decimal(12345);

      (component as any).aplicar(input, false);

      expect(input.selectionStart).toBe(input.value.length);
      expect(input.selectionEnd).toBe(input.value.length);

      input.remove();
    });
  });

  describe('Dentro de um formulário', () => {
    let hospedeiro: ComponentFixture<HospedeiroMoneyInput>;
    let input: HTMLInputElement;

    beforeEach(async () => {
      hospedeiro = TestBed.createComponent(HospedeiroMoneyInput);

      hospedeiro.detectChanges();
      await hospedeiro.whenStable();

      input = hospedeiro.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
    });

    it('deve exibir o valor do formulário no input, habilitado', () => {
      expect(input.value).toBe('100,00');
      expect(input.disabled).toBe(false);
    });

    it('deve converter os dígitos digitados para o formato do contrato', async () => {
      input.value = '150000';

      input.dispatchEvent(new Event('input'));

      await hospedeiro.whenStable();

      expect(hospedeiro.componentInstance.valor.value).toBe('1500.00');
      expect(input.value).toBe('1.500,00');
    });

    it('deve limpar o controle quando o usuário apagar o valor', async () => {
      input.value = '';

      input.dispatchEvent(new Event('input'));

      await hospedeiro.whenStable();

      expect(hospedeiro.componentInstance.valor.value).toBeNull();
      expect(input.value).toBe('');
    });

    it('deve repintar o input quando o formulário muda por código', async () => {
      hospedeiro.componentInstance.valor.setValue('2500.00');

      await hospedeiro.whenStable();

      expect(input.value).toBe('2.500,00');
    });

    it('deve desabilitar o input quando o formulário é desabilitado', async () => {
      hospedeiro.componentInstance.valor.disable();

      await hospedeiro.whenStable();

      expect(input.disabled).toBe(true);
    });

    it('deve habilitar o input quando o formulário é habilitado novamente', async () => {
      hospedeiro.componentInstance.valor.disable();
      await hospedeiro.whenStable();

      hospedeiro.componentInstance.valor.enable();
      await hospedeiro.whenStable();

      expect(input.disabled).toBe(false);
    });
  });

  describe('Template', () => {
    it('não deve possuir handlers keyup ou select', () => {
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(input.outerHTML).not.toContain('(keyup)');
      expect(input.outerHTML).not.toContain('(select)');
    });
  });
});