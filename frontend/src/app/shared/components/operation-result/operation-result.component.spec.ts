import { ComponentFixture, TestBed } from '@angular/core/testing';

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
    dataHora: new Date().toISOString()
    });

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
