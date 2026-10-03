import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { OperationResultComponent } from './operation-result.component';

describe('OperationResultComponent', () => {
  let component: OperationResultComponent;
  let fixture: ComponentFixture<OperationResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationResultComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationResultComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('dados', {
      tipo: 'SUCESSO',
      tipoOperacao: 'TRANSFERENCIA',
      numeroConta: '0950',
      valor: '100.00',
      dataHora: new Date().toISOString(),
    });

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Resultado de sucesso', () => {
    it('deve retornar o ícone de sucesso', () => {
      expect((component as any).icone()).toBe('pi pi-check');
    });

    it('deve retornar o título de sucesso', () => {
      expect((component as any).titulo()).toBe('Operação realizada com sucesso!');
    });

    it('deve retornar o subtítulo de sucesso', () => {
      expect((component as any).subtitulo()).toBe(
        'Os dados da transação foram processados e registrados.',
      );
    });
  });

  describe('Resultado de erro de negócio', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('dados', {
        tipo: 'ERRO_NEGOCIO',
        mensagem: 'Saldo insuficiente',
      });

      fixture.detectChanges();
    });

    it('deve retornar o ícone de erro de negócio', () => {
      expect((component as any).icone()).toBe('pi pi-exclamation-triangle');
    });

    it('deve retornar o título de erro de negócio', () => {
      expect((component as any).titulo()).toBe('Não foi possível concluir a operação');
    });

    it('deve retornar subtítulo vazio', () => {
      expect((component as any).subtitulo()).toBe('');
    });

    it('deve exibir na tela a mensagem que veio do back', () => {
      fixture.componentRef.setInput('visivel', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Saldo insuficiente');
    });
  });

  describe('Resultado de erro de permissão', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('dados', {
        tipo: 'ERRO_PERMISSAO',
      });

      fixture.detectChanges();
    });

    it('deve retornar o ícone de permissão', () => {
      expect((component as any).icone()).toBe('pi pi-lock');
    });

    it('deve retornar o título de permissão', () => {
      expect((component as any).titulo()).toBe('Operação não permitida');
    });
  });

  describe('Resultado de erro técnico', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('dados', {
        tipo: 'ERRO_TECNICO',
        mensagem: 'Não foi possível falar com o servidor.',
      });

      fixture.detectChanges();
    });

    it('deve retornar o ícone de erro técnico', () => {
      expect((component as any).icone()).toBe('pi pi-times-circle');
    });

    it('deve retornar o título de erro técnico', () => {
      expect((component as any).titulo()).toBe(
        'Não foi possível falar com o servidor'
      );
    });
  });

  describe('Interação', () => {
    it('deve emitir o evento ao clicar na ação', () => {
      vi.spyOn(component.fecharOuReiniciar, 'emit');

      (component as any).aoClicarAcao();

      expect(component.fecharOuReiniciar.emit).toHaveBeenCalled();
    });
  });

  describe('Inputs', () => {
    it('deve possuir texto padrão para ação', () => {
      expect(component.textoAcao()).toBe('Realizar nova operação');
    });

    it('deve iniciar invisível', () => {
      expect(component.visivel()).toBe(false);
    });
  });
});
