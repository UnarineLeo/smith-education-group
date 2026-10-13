import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'admin-login',
    loadComponent: () => import('./admin-login/admin-login.page').then((m) => m.AdminLoginPage)
  },
  {
    path: 'admin-portal',
    redirectTo: '/tabs/admin-portal',
    pathMatch: 'full'
  },
  {
    path: 'contact', redirectTo: '/tabs/contact-us', pathMatch: 'full'
  },
  {
    path: 'home', redirectTo: '/tabs/home', pathMatch: 'full'
  },
  {
    path: 'payments',
    loadComponent: () => import('./payments/payments.page').then((m) => m.PaymentsPage)
  },
  {
    path: 'terms', redirectTo: '/tabs/terms', pathMatch: 'full'
  },
  {
    path: 'privacy', redirectTo: '/tabs/privacy', pathMatch: 'full'
  },
  {
    path: 'popia', redirectTo: '/tabs/popia', pathMatch: 'full'
  },
];
