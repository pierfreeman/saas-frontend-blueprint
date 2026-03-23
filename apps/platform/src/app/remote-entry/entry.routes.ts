import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { API_BASE_URL } from '@org/shared/util-types';
import { AuthApi } from '@org/auth/data-access';
import { environment } from 'src/environments/environment';

export const PLATFORM_ROUTES: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    // Provide API_BASE_URL from THIS bundle so the token reference matches
    // what AuthApi (also from this bundle) looks up via inject().
    providers: [
      AuthApi,
      { provide: API_BASE_URL, useValue: environment.apiUrl },
    ],
  },
];
