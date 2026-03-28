import { Injectable, inject, computed, signal } from '@angular/core';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import {
  MembershipsStore,
  type MembershipRole,
} from '@saas-frontend/memberships/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { NotificationsSocketService } from '@saas-frontend/notifications/data-access';
import { PlanningStore } from '@saas-frontend/planning/data-access';

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
  readonly #notificationsWs = inject(NotificationsSocketService);
  readonly #planningStore = inject(PlanningStore);

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
   * Current user role propagated from the platform route scope.
   * Set by `syncCurrentUser` in entry.routes.ts after memberships are loaded.
   * Used by root-level components (navbar) that cannot access route-scoped stores.
   */
  readonly #navRole = signal<MembershipRole | null>(null);
  readonly currentNavRole = this.#navRole.asReadonly();
  readonly canManageOrg = computed(
    () => this.#navRole() === 'OWNER' || this.#navRole() === 'ADMIN',
  );

  setNavRole(role: MembershipRole | null): void {
    this.#navRole.set(role);
  }

  /**
   * Orchestrates a full org switch:
   * 1. Flush all tenant-scoped downstream stores
   * 2. Disconnect the notifications WS (it is tenant-scoped: each org gets its own
   *    filtered stream — users should only receive notifications for the active org)
   * 3. Persist the new org ID + name (synchronous — safe to navigate immediately after)
   * 4. Kick off memberships + entitlements reload and reconnect the WS in the background
   *
   * Returns synchronously so callers can navigate without leaving Angular's zone.
   * The background reload keeps the UI in a loading state until data arrives.
   */
  switchOrg(orgId: string, orgName?: string): void {
    // 1. Flush all tenant-scoped state
    this.#membershipsStore.flush();
    this.#entitlementsStore.flush();
    this.#planningStore.flush();
    this.#navRole.set(null);

    // 2. Disconnect WS before switching context so no stale org events arrive
    this.#notificationsWs.disconnect();

    // 3. Persist new active org — guards and components read this signal immediately
    this.#orgsStore.setActiveOrg(orgId, orgName);

    // 4. Reload tenant-scoped data + reconnect WS in background (fire-and-forget)
    void Promise.all([
      this.#membershipsStore.loadMemberships(orgId),
      this.#entitlementsStore.loadEntitlements(orgId),
    ]);
    this.#notificationsWs.connect(orgId);
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
