import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  // These providers are only active when admin runs standalone (port 4203).
  // When loaded through the shell, the shell's root providers take effect instead.
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptorsFromDi()),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: 'false' } },
    }),
  ],
};
