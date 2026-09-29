import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobProgressComponent } from './job-progress.component';

describe('JobProgressComponent', () => {
  let component: JobProgressComponent;
  let fixture: ComponentFixture<JobProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobProgressComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JobProgressComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o título e subtítulo durante o processamento', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('titulo', 'Transferindo cliente');
    fixture.componentRef.setInput(
      'subtitulo',
      'Aguarde a conclusão da operação.'
    );

    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Transferindo cliente');
    expect(texto).toContain('Aguarde a conclusão da operação.');
  });

  it('deve aceitar o estado de operação em andamento', () => {
    fixture.componentRef.setInput('visible', true);

    fixture.detectChanges();

    expect(component.visible()).toBe(true);
  });

  it('deve aceitar o estado de operação concluída', () => {
    fixture.componentRef.setInput('visible', false);

    fixture.detectChanges();

    expect(component.visible()).toBe(false);
  });
});