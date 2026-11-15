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
      },
      translation: {
        dayNames: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
        dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
        dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
        monthNames: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
        monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
        dateFormat: 'dd/mm/yy',
        firstDayOfWeek: 0,
        today: 'Hoje',
        clear: 'Limpar',
        weekHeader: 'Sem',
        weak: 'Fraca',
        medium: 'Média',
        strong: 'Forte',
        passwordPrompt: 'Digite uma senha',
        emptyMessage: 'Nenhum resultado encontrado',
        emptyFilterMessage: 'Nenhum resultado encontrado',
        accept: 'Sim',
        reject: 'Não',
        cancel: 'Cancelar',
        chooseYear: 'Escolher ano',
        chooseMonth: 'Escolher mês',
        chooseDate: 'Escolher data',
        prevDecade: 'Década anterior',
        nextDecade: 'Próxima década',
        prevYear: 'Ano anterior',
        nextYear: 'Próximo ano',
        prevMonth: 'Mês anterior',
        nextMonth: 'Próximo mês'
      }
    }),
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
