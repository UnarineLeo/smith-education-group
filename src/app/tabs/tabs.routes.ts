import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      ...['privacy', 'terms', 'popia'].map(path => ({ path, loadComponent: () => import('../legal/legal.page').then(m => m.LegalPage) })),
      { path: 'about-us', data: { page: 'about' }, loadComponent: () => import('../education/education.page').then(m => m.EducationPage) },
      { path: 'services', data: { page: 'services' }, loadComponent: () => import('../education/education.page').then(m => m.EducationPage) },
      { path: 'tutors', data: { page: 'tutors' }, loadComponent: () => import('../education/education.page').then(m => m.EducationPage) },
      { path: 'success-stories', data: { page: 'stories' }, loadComponent: () => import('../education/education.page').then(m => m.EducationPage) },
      { path: 'resources', data: { page: 'resources' }, loadComponent: () => import('../education/education.page').then(m => m.EducationPage) },

      {
        path: 'home',
        data: { page: 'home' },
        loadComponent: () =>
          import('../education/education.page').then((m) => m.EducationPage),
      },
      {
        path: 'universities',
        loadComponent: () =>
          import('../universities/universities.page').then((m) => m.Universities),
      },
      {
        path: 'prospectus/:id',
        loadComponent: () =>
          import('../prospectus-viewer/prospectus-viewer.component').then((m) => m.ProspectusViewerComponent),
      },
      {
        path: 'programmes',
        loadComponent: () => import('../programmes/programmes.page').then(m => m.Programmes)
      },
      {
        path: 'our-story',
        data: { page: 'about' },
        loadComponent: () =>
          import('../education/education.page').then((m) => m.EducationPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'admin-login',
        loadComponent: () =>
          import('../admin-login/admin-login.page').then((m) => m.AdminLoginPage),
      },
      {
        path: 'admin-portal',
        loadComponent: () =>
          import('../admin-portal/admin-portal.page').then((m) => m.AdminPortalPage),
      },
      {
        path: 'contact-us',
        data: { page: 'contact' },
        loadComponent: () =>
          import('../education/education.page').then((m) => m.EducationPage),
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
