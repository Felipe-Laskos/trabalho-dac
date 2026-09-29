import { Component, input } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-job-progress',
  standalone: true,
  imports: [DialogModule, LoadingComponent],
  templateUrl: 'job-progress.component.html',
  styleUrl: 'job-progress.component.scss'
})
export class JobProgressComponent {

  readonly visible = input.required<boolean>();
  readonly titulo = input<string>('Processando...');
  readonly subtitulo = input<string>(
    'Não feche esta janela. Aguarde a conclusão da operação.'
  );
  
}