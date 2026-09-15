import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BalanceIndicatorComponent } from './balance-indicator.component';

describe('BalanceIndicatorComponent', () => {
  let component: BalanceIndicatorComponent;
  let fixture: ComponentFixture<BalanceIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceIndicatorComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('saldo', '100.00');

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o label informado', () => {
    fixture.componentRef.setInput('label', 'Saldo em conta');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Saldo em conta');
  });

  it('deve exibir a mensagem quando estiver atualizando', () => {
    fixture.componentRef.setInput('atualizando', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Atualizando saldo...'
    );
  });
});