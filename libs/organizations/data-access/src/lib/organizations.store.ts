import { Injectable, signal, computed } from '@angular/core';

const ACTIVE_ORG_KEY = 'saas.activeOrgId';

@Injectable({ providedIn: 'root' })
export class OrganizationsStore {
  readonly activeOrgId = signal<string | null>(null);

  readonly hasActiveOrg = computed(() => this.activeOrgId() !== null);

  /** Restore the last active org from localStorage (call on app bootstrap). */
  hydrateFromStorage(): void {
    const stored = localStorage.getItem(ACTIVE_ORG_KEY);
    if (stored) this.activeOrgId.set(stored);
  }

  /** Set the active org and persist to localStorage. */
  setActiveOrg(orgId: string): void {
    this.activeOrgId.set(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
  }

  /** Clear the active org from memory and localStorage. */
  clearActiveOrg(): void {
    this.activeOrgId.set(null);
    localStorage.removeItem(ACTIVE_ORG_KEY);
  }
}
