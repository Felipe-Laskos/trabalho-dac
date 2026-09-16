import { Routes } from '@angular/router';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { clienteGuard, gerenteGuard } from './core/guards/perfil.guard';
import { convidadoGuard } from './core/guards/convidado.guard';

const emConstrucao = () =>
  import('./features/em-construcao.component').then((m) => m.EmConstrucaoComponent);

const homeGerente = () =>
  import('./features/gerente/home/home-gerente.component').then((m) => m.HomeGerenteComponent);

const operacao = () =>
  import('./features/cliente/operacao/operacao-page.component').then((m) => m.OperacaoPageComponent);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  {
    path: 'login',
    canActivate: [convidadoGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'autocadastro',
    loadComponent: () =>
      import('./features/auth/autocadastro/autocadastro.component').then(
        (m) => m.AutocadastroComponent,
      ),
  },
  {
    path: 'acesso-negado',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/acesso-negado/acesso-negado.component').then(
        (m) => m.AcessoNegadoComponent,
      ),
  },

  {
    path: 'cliente',
    component: AppLayoutComponent,
    canActivate: [authGuard, clienteGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/cliente/home/home-cliente.component').then(
            (m) => m.HomeClienteComponent,
          ),
      },
      { path: 'deposito', loadComponent: operacao, data: { tipo: 'DEPOSITO' } },
      { path: 'saque', loadComponent: operacao, data: { tipo: 'SAQUE' } },
      { path: 'transferencia', loadComponent: operacao, data: { tipo: 'TRANSFERENCIA' } },
      { path: 'extrato', loadComponent: emConstrucao },
    ],
  },

  {
    path: 'gerente',
    component: AppLayoutComponent,
    canActivate: [authGuard, gerenteGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: homeGerente },
      { path: 'solicitacoes', loadComponent: homeGerente },
      { path: 'clientes', loadComponent: emConstrucao },
      { path: 'gerentes', loadComponent: emConstrucao },
      { path: 'gerentes/novo', loadComponent: emConstrucao },
      { path: 'gerentes/:cpf/editar', loadComponent: emConstrucao },
      { path: 'relatorio', loadComponent: emConstrucao },
    ],
  },

  {
    path: 'dev/componentes',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },

  { path: '**', redirectTo: 'login' },
];
