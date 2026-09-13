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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
