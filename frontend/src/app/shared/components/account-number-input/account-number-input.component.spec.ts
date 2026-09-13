import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountNumberInputComponent } from './account-number-input.component';

describe('AccountNumberInputComponent', () => {
  let component: AccountNumberInputComponent;
  let fixture: ComponentFixture<AccountNumberInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountNumberInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountNumberInputComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
