import { Routes } from '@angular/router';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        m => m.LoginComponent
      )
  },
  {
  path: 'autocadastro',
  loadComponent: () =>
    import('./features/auth/autocadastro/autocadastro.component')
      .then(m => m.AutocadastroComponent)
  },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            m => m.DashboardComponent
          )
      }
    ]
  }
];