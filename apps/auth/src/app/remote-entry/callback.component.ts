import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { filter, switchMap, take } from 'rxjs';
import { AuthApi, AuthStore } from '@org/auth/data-access';
import {
  OrganizationsApi,
  OrganizationsStore,
} from '@org/organizations/data-access';

@Component({
  selector: 'app-callback',
  template: `<p>Completing login…</p>`,
})
export class CallbackComponent implements OnInit {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly #authApi = inject(AuthApi);
  readonly #authStore = inject(AuthStore);
  readonly #orgsApi = inject(OrganizationsApi);
  readonly #orgsStore = inject(OrganizationsStore);

  ngOnInit() {
    this.#auth.isAuthenticated$
      .pipe(
        filter((ok) => ok),
        take(1),
        // 1. Sync the Auth0 identity with the backend (upserts on first login)
        switchMap(() => this.#authApi.getMe()),
        // 2. Store the user in the shared AuthStore
        switchMap((user) => {
          this.#authStore.setUser(user);
          return this.#orgsApi.getOrganizations();
        }),
      )
      .subscribe((orgs) => {
        // 3. Restore a previously selected org or default to the first one
        this.#orgsStore.hydrateFromStorage();
        if (!this.#orgsStore.activeOrgId() && orgs.length > 0) {
          this.#orgsStore.setActiveOrg(orgs[0].id!);
        }
        // 4. Enter the app
        this.#router.navigateByUrl('/');
      });
  }
}
