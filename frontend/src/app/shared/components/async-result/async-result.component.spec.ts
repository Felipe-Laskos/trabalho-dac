import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsyncResultComponent } from './async-result.component';

describe('AsyncResultComponent', () => {
  let component: AsyncResultComponent;
  let fixture: ComponentFixture<AsyncResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsyncResultComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AsyncResultComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir sucesso', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('status', 'SUCESSO');
    fixture.componentRef.setInput(
      'mensagem',
      'Cliente criado com sucesso.'
    );

    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Operação Concluída');
    expect(texto).toContain('Cliente criado com sucesso.');
  });

  it('deve exibir a mensagem de falha recebida do job', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('status', 'FALHA');
    fixture.componentRef.setInput(
      'mensagem',
      'Cliente já possui uma conta.'
    );

    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Não foi possível concluir a operação');
    expect(texto).toContain('Cliente já possui uma conta.');
  });

  it('deve exibir a mensagem específica de timeout', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('status', 'TIMEOUT');
    fixture.componentRef.setInput(
      'mensagem',
      'mensagem que não deve aparecer'
    );

    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Tempo de espera excedido');
    expect(texto).toContain(
      'A operação não concluiu no tempo esperado.'
    );
    expect(texto).not.toContain('mensagem que não deve aparecer');
  });

  it('deve aceitar conteúdo adicional no sucesso', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('status', 'SUCESSO');

    fixture.detectChanges();

    expect(component.status()).toBe('SUCESSO');
    expect(component.visible()).toBe(true);
  });
});

