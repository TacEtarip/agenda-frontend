import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/products/products').then((m) => m.ProductsPage),
  },
  {
    path: 'message-templates',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/message-templates/message-templates').then(
        (m) => m.MessageTemplatesPage,
      ),
  },
  {
    path: 'payments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/payments/payments').then((m) => m.PaymentsPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings').then((m) => m.SettingsPage),
  },
  {
    path: 'clients/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/client-detail/client-detail').then(
        (m) => m.ClientDetailPage,
      ),
  },
  { path: '**', redirectTo: 'login' },
];
