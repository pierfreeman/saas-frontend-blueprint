import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthHttpInterceptor, provideAuth0 } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';
import {
  ADMIN_API_BASE_URL,
  SaasTheme,
} from '@saas-frontend/shared/util-types';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(appRoutes),

    // Auth0 — Admin-Users-DB SPA application
    provideAuth0({
      domain: environment.auth0Domain,
      clientId: environment.auth0ClientId,
      authorizationParams: {
        redirect_uri: environment.auth0RedirectUri,
        audience: environment.auth0Audience,
      },
      httpInterceptor: {
        allowedList: [
          {
            // Attach Bearer token to all admin API calls
            uri: `${environment.adminApiUrl}/admin/*`,
            tokenOptions: {
              authorizationParams: { audience: environment.auth0Audience },
            },
          },
        ],
      },
    }),

    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    { provide: ADMIN_API_BASE_URL, useValue: environment.adminApiUrl },

    providePrimeNG({
      theme: {
        preset: SaasTheme,
        options: { darkModeSelector: '.dark' },
      },
    }),
  ],
};
