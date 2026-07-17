import { Routes } from '@angular/router';
import { authGuard, guestGuard, sessionRedirectGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [sessionRedirectGuard], children: [] },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'dashboard',
        title: 'Inicio | TacEtarip',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'agenda',
        title: 'Agenda | TacEtarip',
        loadComponent: () => import('./pages/agenda/agenda').then((m) => m.AgendaPage),
      },
      {
        path: 'products',
        title: 'Productos | TacEtarip',
        loadComponent: () => import('./pages/products/products').then((m) => m.ProductsPage),
      },
      {
        path: 'message-templates',
        title: 'Mensajes | TacEtarip',
        loadComponent: () =>
          import('./pages/message-templates/message-templates').then((m) => m.MessageTemplatesPage),
      },
      {
        path: 'payments',
        title: 'Pagos | TacEtarip',
        loadComponent: () => import('./pages/payments/payments').then((m) => m.PaymentsPage),
      },
      {
        path: 'settings',
        title: 'Ajustes | TacEtarip',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
      {
        path: 'clients/:id',
        title: 'Cliente | TacEtarip',
        loadComponent: () =>
          import('./pages/client-detail/client-detail').then((m) => m.ClientDetailPage),
      },
    ],
  },
  { path: '**', canActivate: [sessionRedirectGuard], children: [] },
];
