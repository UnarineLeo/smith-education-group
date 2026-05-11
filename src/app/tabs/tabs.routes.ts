import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
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
        path: 'prospectus/:id',
        loadComponent: () =>
          import('../prospectus-viewer/prospectus-viewer.component').then((m) => m.ProspectusViewerComponent),
      },
      {
        path: 'our-story',
        loadComponent: () =>
          import('../our-story/our-story.page').then((m) => m.OurStoryPage),
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
