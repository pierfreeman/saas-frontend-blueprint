import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';

export interface AdminUserProfile {
  adminUserId: string;
  auth0Id: string;
  email: string;
  displayName: string | null;
}

const STORAGE_KEY = 'saas.adminUser';

function loadFromStorage(): AdminUserProfile | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminUserProfile) : null;
  } catch {
    return null;
  }
}

/**
 * AdminAuthStore
 *
 * Manages authentication state for the standalone admin portal.
 * Backed by `@auth0/auth0-angular` (Admin-Users-DB connection).
 * Profile is persisted to sessionStorage during the session.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthStore {
  readonly #auth0 = inject(AuthService);

  readonly currentUser = signal<AdminUserProfile | null>(loadFromStorage());

  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  setUser(user: AdminUserProfile): void {
    this.currentUser.set(user);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // sessionStorage unavailable (e.g. private mode quota exceeded)
    }
  }

  clearUser(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  logout(): Promise<void> {
    this.clearUser();
    return firstValueFrom(
      this.#auth0.logout({
        logoutParams: { returnTo: globalThis.location.origin },
      }),
    ).then(() => undefined);
  }
}
