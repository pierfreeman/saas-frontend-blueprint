import { computed, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntitlementsApi } from './entitlements.api';
import type { OrganizationEntitlements } from './entitlements.api.types';
import type { ApiError } from '@org/shared/util-error';

type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

@Injectable({ providedIn: 'root' })
export class EntitlementsStore {
  readonly #api = inject(EntitlementsApi);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly entitlements = signal<OrganizationEntitlements | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<ApiError | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly plan = computed<Plan | null>(
    () => this.entitlements()?.plan ?? null,
  );
  readonly isFree = computed(() => this.plan() === 'FREE');
  readonly isPro = computed(() => this.plan() === 'PRO');
  readonly isEnterprise = computed(() => this.plan() === 'ENTERPRISE');
  readonly canUseAdvancedAnalytics = computed(
    () => this.entitlements()?.advancedAnalytics ?? false,
  );
  readonly canUseCustomReports = computed(
    () => this.entitlements()?.customReports ?? false,
  );
  readonly canUseApiAccess = computed(
    () => this.entitlements()?.apiAccess ?? false,
  );
  readonly ssoEnabled = computed(
    () => this.entitlements()?.ssoEnabled ?? false,
  );
  readonly prioritySupport = computed(
    () => this.entitlements()?.prioritySupport ?? false,
  );
  /** Maximum members allowed by the current plan. Falls back to 3 (FREE limit) if not yet loaded. */
  readonly maxSeats = computed<number>(
    () => this.entitlements()?.maxSeats ?? 3,
  );
  /** Storage quota in bytes for informational display. Falls back to 100 MiB (FREE default). */
  readonly storageLimitBytes = computed<number>(
    () => this.entitlements()?.storageLimitBytes ?? 100 * 1024 * 1024,
  );

  // ── Methods ────────────────────────────────────────────────────────────────
  async loadEntitlements(orgId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.#api.getEntitlements(orgId));
      this.entitlements.set(data);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loading.set(false);
    }
  }

  async invalidateCache(orgId: string): Promise<void> {
    try {
      await firstValueFrom(this.#api.invalidateCache(orgId));
      await this.loadEntitlements(orgId);
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }

  flush(): void {
    this.entitlements.set(null);
    this.loading.set(false);
    this.error.set(null);
  }
}
