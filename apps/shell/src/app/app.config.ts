import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

const AppTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{zinc.50}',
          100: '{zinc.100}',
          200: '{zinc.200}',
          300: '{zinc.300}',
          400: '{zinc.400}',
          500: '{zinc.500}',
          600: '{zinc.600}',
          700: '{zinc.700}',
          800: '{zinc.800}',
          900: '{zinc.900}',
          950: '{zinc.950}',
        },
      },
    },
  },
});
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthHttpInterceptor, provideAuth0 } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { MessageService } from 'primeng/api';
import { tenantInterceptor } from '@saas-frontend/organizations/data-access';
import { errorInterceptor } from '@saas-frontend/shared/util-error';
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
        preset: AppTheme,
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
