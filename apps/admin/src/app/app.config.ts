import {
  ApplicationConfig,
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
import { AuthHttpInterceptor } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { tenantInterceptor } from '@saas-frontend/organizations/data-access';

export const appConfig: ApplicationConfig = {
  // These providers are only active when admin runs standalone (port 4203).
  // When loaded through the shell, the shell's root providers take effect instead.
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([tenantInterceptor]),
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: 'false' } },
    }),
  ],
};
