import { Routes } from '@angular/router';

export const FEATURE_ORG_SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./settings.component').then((m) => m.SettingsComponent),
  },
];
