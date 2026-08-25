import { Component } from '@angular/core';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [Toast],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {

}