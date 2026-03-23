import { Injectable, signal, computed } from '@angular/core';
import type { User } from './auth.api.types';

const STORAGE_KEY = 'saas.currentUser';

function loadFromStorage(): User | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  readonly currentUser = signal<User | null>(loadFromStorage());

  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  setUser(user: User): void {
    this.currentUser.set(user);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // sessionStorage unavailable (e.g. private mode quota)
    }
  }

  clearUser(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
