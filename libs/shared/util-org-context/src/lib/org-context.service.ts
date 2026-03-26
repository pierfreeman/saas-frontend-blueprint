import { Injectable, inject, computed } from '@angular/core';
import { OrganizationsStore } from '@org/organizations/data-access';
import { MembershipsStore } from '@org/memberships/data-access';
import { EntitlementsStore } from '@org/entitlements/data-access';
import { NotificationsSocketService } from '@org/notifications/data-access';

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
