import { Route } from '@angular/router';
import { RemoteEntry } from './entry';

export const PLATFORM_ROUTES: Route[] = [
  {
    path: '',
    component: RemoteEntry,
  },
];
