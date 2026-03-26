import { Routes } from '@angular/router';

export const FEATURE_NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./notifications.component').then((m) => m.NotificationsComponent),
  },
];
