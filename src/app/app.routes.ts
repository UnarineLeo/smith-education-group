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
    loadComponent: () => import('./admin-portal/admin-portal.page').then((m) => m.AdminPortalPage)
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact-us/contact-us.page').then((m) => m.ContactUsPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then( m => m.HomePage)
  },
  {
    path: 'payments',
    loadComponent: () => import('./payments/payments.page').then((m) => m.PaymentsPage)
  },
  {
    path: 'terms',
    loadComponent: () => import('./legal/legal.page').then((m) => m.LegalPage)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./legal/legal.page').then((m) => m.LegalPage)
  },
  {
    path: 'popia',
    loadComponent: () => import('./legal/legal.page').then((m) => m.LegalPage)
  },
];
