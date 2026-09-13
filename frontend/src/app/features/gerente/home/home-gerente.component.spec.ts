import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeGerenteComponent } from './home-gerente.component';

describe('HomeGerenteComponent', () => {
  let component: HomeGerenteComponent;
  let fixture: ComponentFixture<HomeGerenteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeGerenteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeGerenteComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
