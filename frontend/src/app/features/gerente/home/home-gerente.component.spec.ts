import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeGerenteComponent } from './home-gerente.component';
import { vi } from 'vitest';

describe('HomeGerenteComponent', () => {
  let component: HomeGerenteComponent;
  let fixture: ComponentFixture<HomeGerenteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeGerenteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeGerenteComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('deve aprovar a solicitação após o processamento', () => {
    vi.useFakeTimers();

    const cpf = component.solicitacoes()[0].cpf;

    component.aprovar(cpf);

    expect(component.estaProcessando(cpf)).toBe(true);

    vi.advanceTimersByTime(2000);

    const solicitacao = component.solicitacoes().find(
      item => item.cpf === cpf
    );

    expect(solicitacao?.status).toBe('APROVADA');
    expect(solicitacao?._links).toEqual({});
    expect(component.estaProcessando(cpf)).toBe(false);

    vi.useRealTimers();
  });
});