import { Route } from '@angular/router';
import { CallbackComponent } from './callback.component';
import { LoginComponent } from './login.component';
import { API_BASE_URL } from '@org/shared/util-types';
import { AuthApi } from '@org/auth/data-access';
import { OrganizationsApi } from '@org/organizations/data-access';
import { environment } from 'src/environments/environment';

export const AUTH_ROUTES: Route[] = [
  { path: '', component: LoginComponent },
  {
    path: 'callback',
    component: CallbackComponent,
    // Provide API services from THIS bundle so the API_BASE_URL token reference
    // matches what AuthApi / OrganizationsApi look up via inject().
    providers: [
      AuthApi,
      OrganizationsApi,
      { provide: API_BASE_URL, useValue: environment.apiUrl },
    ],
  },
];
