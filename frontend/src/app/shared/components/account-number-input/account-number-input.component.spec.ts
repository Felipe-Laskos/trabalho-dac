import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';

import { AccountNumberInputComponent } from './account-number-input.component';

@Component({
  imports: [ReactiveFormsModule, AccountNumberInputComponent],
  template: `<app-account-number-input [formControl]="conta" />`,
})
class HospedeiroAccountNumberInput {
  readonly conta = new FormControl<string | null>('0950');
}

describe('AccountNumberInputComponent', () => {
  let component: AccountNumberInputComponent;
  let fixture: ComponentFixture<AccountNumberInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountNumberInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountNumberInputComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Validação (Validator)', () => {
    it('deve retornar erro accountRequired se o campo estiver vazio', () => {
      const controle = new FormControl('');

      const resultado = component.validate(controle);

      expect(resultado).toEqual({
        accountRequired: true,
      });
    });

    it('deve retornar erro accountLength se não tiver exatamente 4 dígitos', () => {
      const controle = new FormControl('123');

      const resultado = component.validate(controle);

      expect(resultado).toEqual({
        accountLength: true,
      });
    });

    it('deve retornar null se tiver exatamente 4 dígitos', () => {
      const controle = new FormControl('0950');

      const resultado = component.validate(controle);

      expect(resultado).toBeNull();
    });
  });

  describe('Sanitização e Digitação', () => {
    it('deve remover letras e limitar a 4 caracteres no writeValue', () => {
      component.writeValue('12ab3456');

      expect((component as any).valor()).toBe('1234');
    });

    it('deve limpar o valor, notificar o formulário e emitir evento ao digitar', () => {
      let valorEnviadoProForm = '';

      vi.spyOn(component.valorAlterado, 'emit');

      component.registerOnChange((valor: string) => {
        valorEnviadoProForm = valor;
      });

      const mockEvent = {
        target: {
          value: '98x765',
        },
      } as unknown as Event;

      (component as any).aoDigitar(mockEvent);

      expect((component as any).valor()).toBe('9876');
      expect(valorEnviadoProForm).toBe('9876');
      expect(component.valorAlterado.emit).toHaveBeenCalledWith('9876');
    });

    it('deve emitir null quando o campo for apagado', () => {
      vi.spyOn(component.valorAlterado, 'emit');

      const mockEvent = {
        target: {
          value: '',
        },
      } as unknown as Event;

      (component as any).aoDigitar(mockEvent);

      expect((component as any).valor()).toBe('');
      expect(component.valorAlterado.emit).toHaveBeenCalledWith(null);
    });

    it('deve atualizar o valor do elemento HTML após sanitizar', () => {
      const elemento = {
        value: '12abc34',
      };

      const mockEvent = {
        target: elemento,
      } as unknown as Event;

      (component as any).aoDigitar(mockEvent);

      expect(elemento.value).toBe('1234');
    });
  });

  describe('Interação e Estado', () => {
    it('deve marcar como tocado ao sair do campo', () => {
      let foiTocado = false;

      component.registerOnTouched(() => {
        foiTocado = true;
      });

      (component as any).aoSairDoCampo();

      expect(foiTocado).toBe(true);
    });

    it('deve alterar o estado desabilitado pelo setDisabledState', () => {
      component.setDisabledState(true);

      expect((component as any).desabilitado()).toBe(true);

      component.setDisabledState(false);

      expect((component as any).desabilitado()).toBe(false);
    });
  });

  describe('Dentro de um formulario', () => {
    let hospedeiro: ComponentFixture<HospedeiroAccountNumberInput>;
    let input: HTMLInputElement;

    beforeEach(async () => {
      hospedeiro = TestBed.createComponent(HospedeiroAccountNumberInput);
      await hospedeiro.whenStable();
      input = hospedeiro.nativeElement.querySelector('input') as HTMLInputElement;
    });

    it('deve exibir a conta do formulário no input, habilitado e com o zero à esquerda', () => {
      expect(input.value).toBe('0950');
      expect(input.disabled).toBe(false);
    });

    it('deve devolver o que o usuário digita como string de 4 dígitos', async () => {
      input.value = '1291';
      input.dispatchEvent(new Event('input'));
      await hospedeiro.whenStable();

      expect(hospedeiro.componentInstance.conta.value).toBe('1291');
      expect(typeof hospedeiro.componentInstance.conta.value).toBe('string');
    });

    it('deve repintar o input quando o formulário muda por código', async () => {
      hospedeiro.componentInstance.conta.setValue('0007');
      await hospedeiro.whenStable();

      expect(input.value).toBe('0007');
    });

    it('deve desabilitar o input quando o formulário é desabilitado', async () => {
      hospedeiro.componentInstance.conta.disable();
      await hospedeiro.whenStable();

      expect(input.disabled).toBe(true);
    });
  });
});
