import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ModalConfirmationComponent } from './modal-confirmation.component';

describe('ModalConfirmationComponent', () => {
  let component: ModalConfirmationComponent;
  let fixture: ComponentFixture<ModalConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalConfirmationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalConfirmationComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Valores padrão', () => {
    it('deve possuir o título padrão', () => {
      expect(component.titulo()).toBe('Confirmar operação?');
    });

    it('deve possuir o subtítulo padrão', () => {
      expect(component.subtitulo()).toBe(
        'A operação é imediata e não pode ser desfeita.'
      );
    });

    it('deve possuir o texto padrão de confirmação', () => {
      expect(component.textoConfirmar()).toBe('Confirmar');
    });

    it('deve possuir o texto padrão de cancelamento', () => {
      expect(component.textoCancelar()).toBe('Voltar');
    });

    it('deve iniciar invisível', () => {
      expect(component.visivel()).toBe(false);
    });

    it('deve iniciar sem carregamento', () => {
      expect(component.carregando()).toBe(false);
    });

    it('deve iniciar sem detalhes', () => {
      expect(component.detalhes()).toEqual([]);
    });
  });

  describe('Eventos', () => {
    it('deve emitir confirmar quando não estiver carregando', () => {
      vi.spyOn(component.confirmar, 'emit');

      (component as any).aoConfirmar();

      expect(component.confirmar.emit).toHaveBeenCalled();
    });

    it('não deve emitir confirmar enquanto estiver carregando', () => {
      vi.spyOn(component.confirmar, 'emit');

      fixture.componentRef.setInput('carregando', true);

      (component as any).aoConfirmar();

      expect(component.confirmar.emit).not.toHaveBeenCalled();
    });

    it('deve emitir cancelar quando não estiver carregando', () => {
      vi.spyOn(component.cancelar, 'emit');

      (component as any).aoCancelar();

      expect(component.cancelar.emit).toHaveBeenCalled();
    });

    it('não deve emitir cancelar enquanto estiver carregando', () => {
      vi.spyOn(component.cancelar, 'emit');

      fixture.componentRef.setInput('carregando', true);

      (component as any).aoCancelar();

      expect(component.cancelar.emit).not.toHaveBeenCalled();
    });
  });

  describe('Formatação dos detalhes', () => {
    it('deve retornar hífen quando o valor for nulo', () => {
      const resultado = (component as any).formatarValor({
        rotulo: 'Valor',
        valor: null,
      });

      expect(resultado).toBe('-');
    });

    it('deve retornar hífen quando o valor estiver indefinido', () => {
      const resultado = (component as any).formatarValor({
        rotulo: 'Valor',
        valor: undefined,
      });

      expect(resultado).toBe('-');
    });

    it('deve retornar hífen quando o valor estiver vazio', () => {
      const resultado = (component as any).formatarValor({
        rotulo: 'Valor',
        valor: '',
      });

      expect(resultado).toBe('-');
    });

    it('deve retornar o texto original quando não for moeda', () => {
      const resultado = (component as any).formatarValor({
        rotulo: 'Conta',
        valor: '0950',
        moeda: false,
      });

      expect(resultado).toBe('0950');
    });

    it('deve formatar o valor como moeda quando moeda for true', () => {
      const resultado = (component as any).formatarValor({
        rotulo: 'Valor',
        valor: '100.00',
        moeda: true,
      });

      expect(resultado).toContain('100,00');
      expect(resultado).toContain('R$');
    });
  });
});