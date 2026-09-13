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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
