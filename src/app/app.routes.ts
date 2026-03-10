import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
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
];
