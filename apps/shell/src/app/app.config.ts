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
import {
  AuthHttpInterceptor,
  AuthService,
  provideAuth0,
} from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { appRoutes } from './app.routes';
import { API_BASE_URL } from '@org/shared/util-types';
import { MessageService } from 'primeng/api';
import { tenantInterceptor } from '@org/organizations/data-access';
import { errorInterceptor } from './error.interceptor';
import { environment } from 'src/environments/environment';
import { AuthApi, AuthStore } from '@org/auth/data-access';
import {
  OrganizationsApi,
  OrganizationsStore,
} from '@org/organizations/data-access';

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
      theme: { preset: Aura, options: { darkModeSelector: 'false' } },
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
    provideAppInitializer(async () => {
      const auth0 = inject(AuthService);
      const authApi = inject(AuthApi);
      const authStore = inject(AuthStore);
      const orgsApi = inject(OrganizationsApi);
      const orgsStore = inject(OrganizationsStore);

      // Wait for Auth0 SDK to finish its initialisation (handles callback code
      // exchange and silent-token refresh on normal page loads).
      await firstValueFrom(
        auth0.isLoading$.pipe(filter((loading) => !loading)),
      );

      // If not authenticated, guards will redirect to login.
      const isAuthenticated = await firstValueFrom(auth0.isAuthenticated$);
      if (!isAuthenticated) return;

      try {
        // Sync the Auth0 identity with the backend (upsert on first login).
        const user = await firstValueFrom(authApi.getMe());
        authStore.setUser(user);

        // Load and default the active org (localStorage is used as cache).
        const orgs = await firstValueFrom(orgsApi.getOrganizations());
        if (!orgsStore.activeOrgId() && orgs.length > 0) {
          orgsStore.setActiveOrg(orgs[0].id ?? '', orgs[0].name ?? undefined);
        }
      } catch {
        // Safety net — guards handle the redirect if loading fails.
      }
    }),
  ],
};
