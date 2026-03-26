import { Routes } from '@angular/router';

export const FEATURE_ACTIVITY_LOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./activity-log.component').then((m) => m.ActivityLogComponent),
  },
];
