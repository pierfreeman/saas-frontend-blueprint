import { Routes } from '@angular/router';

export const FEATURE_PLANNING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./planning.component').then((m) => m.PlanningComponent),
  },
];
