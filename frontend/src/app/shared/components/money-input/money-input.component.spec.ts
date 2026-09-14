import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoneyInputComponent } from './money-input.component';

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
      expect((component as any).desabilitado).toBe(false);
    });
  });

  describe('ControlValueAccessor', () => {
    it('deve formatar o valor recebido pelo formulário para visualização', () => {
      component.writeValue('1234.50');

      expect((component as any).valorVisual).toBe('1.234,50');
    });

    it('deve limpar o valor visual quando receber null', () => {
      component.writeValue(null);

      expect((component as any).valorVisual).toBe('');
    });

    it('deve atualizar o estado desabilitado', () => {
      component.setDisabledState(true);

      expect((component as any).desabilitado).toBe(true);

      component.setDisabledState(false);

      expect((component as any).desabilitado).toBe(false);
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
    it('deve converter valor visual brasileiro para valor de contrato', () => {
      const elemento = {
        value: '1.234,50',
      };

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect((component as any).valorContrato).toBe('1234.50');
    });

    it('deve remover caracteres inválidos', () => {
      const elemento = {
        value: 'R$ 100,00',
      };

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect((component as any).valorVisual).toBe('100,00');
    });

    it('deve limitar a quantidade de casas decimais', () => {
      const elemento = {
        value: '100,123',
      };

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(elemento.value).toBe('');
    });

    it('deve impedir valores negativos', () => {
      component.writeValue('100.00');

      const elemento = {
        value: '-50,00',
      };

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(elemento.value).toBe('100,00');
    });
  });

  describe('Eventos do formulário', () => {
    it('deve chamar onChange ao digitar um valor válido', () => {
      let valorRecebido: string | null = null;

      component.registerOnChange((valor) => {
        valorRecebido = valor;
      });

      const elemento = {
        value: '250,75',
      };

      const evento = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(evento);

      expect(valorRecebido).toBe('250.75');
    });

    it('deve chamar onTouched ao sair do campo', () => {
      let foiTocado = false;

      component.registerOnTouched(() => {
        foiTocado = true;
      });

      (component as any).aoSairDoCampo();

      expect(foiTocado).toBe(true);
    });
  });

  describe('Formatação', () => {
    it('deve formatar milhares com pontos', () => {
      const resultado = (component as any).formatarMilhares('1234567');

      expect(resultado).toBe('1.234.567');
    });

    it('deve formatar valor de contrato para visualização brasileira', () => {
      const resultado = (component as any).formatarParaVisual('1234.5');

      expect(resultado).toBe('1.234,50');
    });

    it('deve retornar string vazia para valor nulo', () => {
      const resultado = (component as any).formatarParaVisual(null);

      expect(resultado).toBe('');
    });
  });
});