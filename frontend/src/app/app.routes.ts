import { Routes } from '@angular/router';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';

const emConstrucao = () =>
  import('./features/em-construcao.component').then((m) => m.EmConstrucaoComponent);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Rotas Públicas
  { path: 'login', loadComponent: emConstrucao },
  { path: 'autocadastro', loadComponent: emConstrucao },
  { path: 'acesso-negado', loadComponent: emConstrucao },

  // Rotas Cliente
  {
    path: 'cliente',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: emConstrucao },
      { path: 'deposito', loadComponent: emConstrucao },
      { path: 'saque', loadComponent: emConstrucao },
      { path: 'transferencia', loadComponent: emConstrucao },
      { path: 'extrato', loadComponent: emConstrucao },
    ],
  },

  // Rotas gerente
  {
    path: 'gerente',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'solicitacoes' },
      { path: 'solicitacoes', loadComponent: emConstrucao },
      { path: 'clientes', loadComponent: emConstrucao },
      { path: 'gerentes', loadComponent: emConstrucao },
      { path: 'gerentes/novo', loadComponent: emConstrucao },
      { path: 'gerentes/:cpf/editar', loadComponent: emConstrucao },
      { path: 'relatorio', loadComponent: emConstrucao },
    ],
  },

  // Página de teste
  // TO DO - REMOVER
  {
    path: 'dashboard',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
