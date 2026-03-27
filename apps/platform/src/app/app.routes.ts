import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    /* v8 ignore next 3 */
    loadChildren: () =>
      import('./remote-entry/entry.routes').then((m) => m.PLATFORM_ROUTES),
  },
];
