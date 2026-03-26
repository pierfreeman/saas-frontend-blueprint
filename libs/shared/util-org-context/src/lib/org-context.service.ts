import { Injectable, inject, computed } from '@angular/core';
import { OrganizationsStore } from '@org/organizations/data-access';
import { MembershipsStore } from '@org/memberships/data-access';
import { EntitlementsStore } from '@org/entitlements/data-access';

/**
 * Single orchestration point for org-context state.
 *
 * Exposes reactive signals for components that need to read current-org data,
 * and provides methods that coordinate multi-store updates so individual
 * components don't have to know which stores to flush/reload on an org switch.
 */
@Injectable({ providedIn: 'root' })
export class OrgContextService {
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #membershipsStore = inject(MembershipsStore);
  readonly #entitlementsStore = inject(EntitlementsStore);

  /** The currently active organization ID — reactive signal. */
  readonly activeOrgId = computed(() => this.#orgsStore.activeOrgId());

  /** The currently active organization display name — reactive signal. */
  readonly activeOrgName = computed(() => this.#orgsStore.activeOrgName());

  /** Current org plan — delegates to EntitlementsStore. */
  readonly plan = computed(() => this.#entitlementsStore.plan());
  readonly isFree = computed(() => this.#entitlementsStore.isFree());
  readonly isPro = computed(() => this.#entitlementsStore.isPro());
  readonly isEnterprise = computed(() =>
    this.#entitlementsStore.isEnterprise(),
  );

  /**
   * Orchestrates a full org switch:
   * 1. Flush all tenant-scoped downstream stores
   * 2. Persist the new org ID + name (synchronous — safe to navigate immediately after)
   * 3. Kick off memberships + entitlements reload in the background
   *
   * Returns synchronously so callers can navigate without leaving Angular's zone.
   * The background reload keeps the UI in a loading state until data arrives.
   */
  switchOrg(orgId: string, orgName?: string): void {
    // 1. Flush all tenant-scoped state
    this.#membershipsStore.flush();
    this.#entitlementsStore.flush();

    // 2. Persist new active org — guards and components read this signal immediately
    this.#orgsStore.setActiveOrg(orgId, orgName);

    // 3. Reload tenant-scoped data in background (fire-and-forget)
    void Promise.all([
      this.#membershipsStore.loadMemberships(orgId),
      this.#entitlementsStore.loadEntitlements(orgId),
    ]);
  }

  /** Load entitlements for the given org — delegates to EntitlementsStore. */
  async loadEntitlements(orgId: string): Promise<void> {
    await this.#entitlementsStore.loadEntitlements(orgId);
  }

  /**
   * Invalidate the server-side entitlements cache and reload.
   * Used after Stripe redirects to ensure plan/feature-flag state is current.
   */
  async invalidateEntitlements(orgId: string): Promise<void> {
    await this.#entitlementsStore.invalidateCache(orgId);
  }
}
