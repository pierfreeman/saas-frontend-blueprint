import {
  HTTP_INTERCEPTORS,
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { AuthHttpInterceptor, provideAuth0 } from '@auth0/auth0-angular';
import { tenantInterceptor } from '@saas-frontend/organizations/data-access';
import { errorInterceptor } from '@saas-frontend/shared/util-error';
import { API_BASE_URL, SaasTheme } from '@saas-frontend/shared/util-types';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { environment } from 'src/environments/environment';
import { AppInitService } from './app-init.service';
import { appRoutes } from './app.routes';

// Prevents ngrok's interstitial warning page from being returned instead of the
// actual API response. The header is ignored by non-ngrok servers.
const ngrokInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  if (!req.url.startsWith(apiBaseUrl)) return next(req);
  return next(req.clone({ setHeaders: { 'ngrok-skip-browser-warning': '1' } }));
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    MessageService,
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([ngrokInterceptor, tenantInterceptor, errorInterceptor]),
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    providePrimeNG({
      theme: {
        preset: SaasTheme,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),
    provideAuth0({
      domain: environment.auth0Domain,
      clientId: environment.auth0ClientId,
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
      authorizationParams: {
        audience: environment.auth0Audience,
        redirect_uri: environment.auth0RedirectUri,
      },
      httpInterceptor: {
        allowedList: [
          {
            uri: `${environment.apiUrl}/*`,
            tokenOptions: {
              authorizationParams: {
                audience: environment.auth0Audience,
              },
            },
          },
          {
            uri: `${environment.adminApiUrl}/*`,
            tokenOptions: {
              authorizationParams: {
                audience: environment.auth0Audience,
              },
            },
          },
        ],
      },
    }),
    provideAppInitializer(() => inject(AppInitService).initialize()),
  ],
};
