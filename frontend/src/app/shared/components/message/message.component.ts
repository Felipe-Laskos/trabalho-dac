import { Component, computed, input } from '@angular/core';
import { Message } from 'primeng/message';

export type MessageType = 'success' | 'error' | 'empty';

type PrimeMessageSeverity = 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [Message],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss'
})
export class MessageComponent {

  type = input<MessageType>('success');

  message = input('');

  severity = computed<PrimeMessageSeverity>(() => {
    const type = this.type();

    switch (type) {
      case 'success':
        return 'success';

      case 'error':
        return 'error';

      case 'empty':
        return 'info';
    }
  });

}