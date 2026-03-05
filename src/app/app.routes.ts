import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products/products').then((m) => m.ProductsPage),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings').then((m) => m.SettingsPage),
  },
  {
    path: 'clients/:id',
    loadComponent: () =>
      import('./pages/client-detail/client-detail').then(
        (m) => m.ClientDetailPage,
      ),
  },
  { path: '**', redirectTo: 'login' },
];

