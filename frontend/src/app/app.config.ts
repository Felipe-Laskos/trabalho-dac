import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

import { provideRouter, withViewTransitions } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { BantadsTheme } from './theme/bantads-theme';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes, withViewTransitions()),

    providePrimeNG({
      theme: {
        preset: BantadsTheme,

        options: {
          darkModeSelector: false
        }
      }
    })
  ]
};