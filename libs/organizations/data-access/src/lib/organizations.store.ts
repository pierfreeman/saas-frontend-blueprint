import { Injectable, signal, computed } from '@angular/core';

const ACTIVE_ORG_KEY = 'saas.activeOrgId';
const ACTIVE_ORG_NAME_KEY = 'saas.activeOrgName';

function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class OrganizationsStore {
  readonly activeOrgId = signal<string | null>(loadFromStorage(ACTIVE_ORG_KEY));
  readonly activeOrgName = signal<string | null>(
    loadFromStorage(ACTIVE_ORG_NAME_KEY),
  );

  readonly hasActiveOrg = computed(() => this.activeOrgId() !== null);

  /** Set the active org (id + display name) and persist to localStorage. */
  setActiveOrg(orgId: string, orgName?: string): void {
    this.activeOrgId.set(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    const name = orgName ?? null;
    this.activeOrgName.set(name);
    if (name) {
      localStorage.setItem(ACTIVE_ORG_NAME_KEY, name);
    } else {
      localStorage.removeItem(ACTIVE_ORG_NAME_KEY);
    }
  }

  /** Clear the active org from memory and localStorage. */
  clearActiveOrg(): void {
    this.activeOrgId.set(null);
    this.activeOrgName.set(null);
    localStorage.removeItem(ACTIVE_ORG_KEY);
    localStorage.removeItem(ACTIVE_ORG_NAME_KEY);
  }
}
