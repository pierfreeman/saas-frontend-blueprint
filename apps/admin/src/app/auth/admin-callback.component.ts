import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { ADMIN_API_BASE_URL } from '@saas-frontend/shared/util-types';
import { firstValueFrom } from 'rxjs';
import { AdminAuthStore, AdminUserProfile } from './admin-auth.store';

/**
 * AdminCallbackComponent
 *
 * Handles the Auth0 PKCE redirect callback.
 * On successful token exchange, fetches GET /admin/me to hydrate AdminAuthStore,
 * then navigates to the admin dashboard.
 */
@Component({
  selector: 'app-admin-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>
  `,
})
export class AdminCallbackComponent implements OnInit {
  readonly #auth0 = inject(AuthService);
  readonly #http = inject(HttpClient);
  readonly #adminApiBase = inject(ADMIN_API_BASE_URL);
  readonly #store = inject(AdminAuthStore);
  readonly #router = inject(Router);

  ngOnInit(): void {
    this.#auth0.isAuthenticated$.subscribe(async (isAuthenticated) => {
      if (!isAuthenticated) return;

      try {
        const profile = await firstValueFrom(
          this.#http.get<AdminUserProfile>(`${this.#adminApiBase}/admin/me`),
        );
        this.#store.setUser(profile);
        await this.#router.navigate(['/organizations']);
      } catch {
        await this.#router.navigate(['/login']);
      }
    });
  }
}
