import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { erroInterceptor } from './core/interceptors/erro.interceptor';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { BantadsTheme } from './theme/bantads-theme';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    provideHttpClient(withInterceptors([tokenInterceptor, erroInterceptor])),

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