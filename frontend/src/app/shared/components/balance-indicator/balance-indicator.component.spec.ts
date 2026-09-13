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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
