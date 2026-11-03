import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { LoginComponent } from './login.component';

describe('Login', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('Enter na senha envia o formulário e chama o login', () => {
    const fazerLogin = vi.spyOn(component, 'fazerLogin').mockResolvedValue();
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    expect(form.querySelector('#password')).toBeTruthy();
    expect(form.querySelector('button[type="submit"]')).toBeTruthy();

    form.dispatchEvent(new Event('submit'));
    expect(fazerLogin).toHaveBeenCalledTimes(1);
  });
});
