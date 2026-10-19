import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      ...['privacy', 'terms', 'popia'].map(path => ({ path, loadComponent: () => import('../legal/legal.page').then(m => m.LegalPage) })),
      { path: 'about-us', loadComponent: () => import('../about-us/about-us.page').then(m => m.AboutUsPage) },
      { path: 'services', loadComponent: () => import('../services/services.page').then(m => m.ServicesPage) },
      { path: 'tutors', loadComponent: () => import('../tutors/tutors.page').then(m => m.TutorsPage) },
      { path: 'success-stories', loadComponent: () => import('../success-stories/success-stories.page').then(m => m.SuccessStoriesPage) },
      { path: 'resources', loadComponent: () => import('../resources/resources.page').then(m => m.ResourcesPage) },

      {
        path: 'home',
        loadComponent: () =>
          import('../home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'universities',
        loadComponent: () =>
          import('../universities/universities.page').then((m) => m.Universities),
      },
      {
        path: 'our-story',
        loadComponent: () =>
          import('../about-us/about-us.page').then((m) => m.AboutUsPage),
      },
      {
        path: 'contact-us',
        loadComponent: () =>
          import('../contact-us/contact-us.page').then((m) => m.ContactUsPage),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: '/tabs/home',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
