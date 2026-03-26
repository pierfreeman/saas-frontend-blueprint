import { Routes } from '@angular/router';

export const FEATURE_MEMBERSHIPS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./members.component').then((m) => m.MembersComponent),
  },
];
