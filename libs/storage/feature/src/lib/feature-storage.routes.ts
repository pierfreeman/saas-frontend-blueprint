import { Routes } from '@angular/router';

export const FEATURE_STORAGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./storage.component').then((m) => m.StorageComponent),
  },
];
