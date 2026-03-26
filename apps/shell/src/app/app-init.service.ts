import { Injectable, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthApi, AuthStore } from '@saas-frontend/auth/data-access';
import {
  OrganizationsApi,
  OrganizationsStore,
} from '@saas-frontend/organizations/data-access';
import { NotificationsSocketService } from '@saas-frontend/notifications/data-access';

/**
 * Coordinates the post-Auth0-load bootstrap sequence:
 * 1. Waits for the Auth0 SDK to finish (code exchange + silent refresh)
 * 2. If authenticated, syncs the backend user profile into AuthStore
 * 3. Sets the active organisation (restores from localStorage or defaults to first)
 * 4. Opens the tenant-scoped notifications WebSocket
 *
 * Using a service ensures all inject() calls happen in the constructor, which
 * is always a guaranteed injection context — avoiding edge cases with inject()
 * inside async provideAppInitializer callbacks in Angular 21.
 */
@Injectable({ providedIn: 'root' })
export class AppInitService {
  readonly #auth0 = inject(AuthService);
  readonly #authApi = inject(AuthApi);
  readonly #authStore = inject(AuthStore);
  readonly #orgsApi = inject(OrganizationsApi);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #notificationsWs = inject(NotificationsSocketService);

  async initialize(): Promise<void> {
    // Wait for Auth0 SDK to finish its initialisation (handles callback code
    // exchange and silent-token refresh on normal page loads).
    await firstValueFrom(
      this.#auth0.isLoading$.pipe(filter((loading) => !loading)),
    );

    // If not authenticated, guards will redirect to login.
    const isAuthenticated = await firstValueFrom(this.#auth0.isAuthenticated$);
    if (!isAuthenticated) return;

    try {
      // Sync the Auth0 identity with the backend (upsert on first login).
      const user = await firstValueFrom(this.#authApi.getMe());
      this.#authStore.setUser(user);

      // Load and default the active org (localStorage is used as cache).
      const orgs = await firstValueFrom(this.#orgsApi.getOrganizations());
      if (!this.#orgsStore.activeOrgId() && orgs.length > 0) {
        this.#orgsStore.setActiveOrg(
          orgs[0].id ?? '',
          orgs[0].name ?? undefined,
        );
      }

      // Establish the notifications WS for the active org.
      // Tenant-scoped: the server filters events to this org only.
      const activeOrgId = this.#orgsStore.activeOrgId();
      if (activeOrgId) this.#notificationsWs.connect(activeOrgId);
    } catch {
      // Safety net — guards handle the redirect if loading fails.
    }
  }
}
