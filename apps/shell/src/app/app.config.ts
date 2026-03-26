import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthHttpInterceptor, provideAuth0 } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';
import { API_BASE_URL } from '@org/shared/util-types';
import { MessageService } from 'primeng/api';
import { tenantInterceptor } from '@org/organizations/data-access';
import { errorInterceptor } from '@org/shared/util-error';
import { environment } from 'src/environments/environment';
import { AppInitService } from './app-init.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    MessageService,
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([tenantInterceptor, errorInterceptor]),
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    providePrimeNG({
      theme: {
        preset: Aura,
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
        ],
      },
    }),
    provideAppInitializer(() => inject(AppInitService).initialize()),
  ],
};
