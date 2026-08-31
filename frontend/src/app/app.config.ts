import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { erroInterceptor } from './core/interceptors/erro.interceptor';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { BantadsTheme } from './theme/bantads-theme';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes, withViewTransitions()),

    provideHttpClient(withInterceptors([tokenInterceptor, erroInterceptor])),

    providePrimeNG({
      theme: {
        preset: BantadsTheme,

        options: {
          darkModeSelector: false
        }
      }
    }),
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
