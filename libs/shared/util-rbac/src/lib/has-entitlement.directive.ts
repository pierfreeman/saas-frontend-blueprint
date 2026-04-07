import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import {
  EntitlementsStore,
  type OrganizationEntitlements,
} from '@saas-frontend/entitlements/data-access';

/** All keys of OrganizationEntitlements except the plan tier string. */
export type EntitlementKey = Exclude<keyof OrganizationEntitlements, 'plan'>;

/**
 * Structural directive — shows the host element only when the named
 * entitlement flag is active for the current organisation.
 *
 * - Boolean flags: rendered when the value is `true`.
 * - Numeric flags (`maxSeats`, `storageLimitBytes`): rendered when the value is `> 0`.
 *
 * Usage:
 *   <div *hasEntitlement="'ssoEnabled'">SSO Settings</div>
 *   <section *hasEntitlement="'advancedAnalytics'">Analytics</section>
 */
@Directive({
  selector: '[hasEntitlement]',
  standalone: true,
})
export class HasEntitlementDirective {
  readonly #tpl = inject(TemplateRef);
  readonly #vcr = inject(ViewContainerRef);
  readonly #store = inject(EntitlementsStore);

  #key: EntitlementKey | null = null;
  #rendered = false;

  @Input() set hasEntitlement(key: EntitlementKey) {
    this.#key = key;
    this.#update();
  }

  constructor() {
    effect(() => {
      this.#store.entitlements(); // track signal dependency
      this.#update();
    });
  }

  #update(): void {
    if (!this.#key) return;

    const e = this.#store.entitlements();
    const raw = e?.[this.#key];
    let granted: boolean;
    if (typeof raw === 'boolean') {
      granted = raw;
    } else if (typeof raw === 'number') {
      granted = raw > 0;
    } else {
      granted = false;
    }

    if (granted && !this.#rendered) {
      this.#vcr.createEmbeddedView(this.#tpl);
      this.#rendered = true;
    } else if (!granted && this.#rendered) {
      this.#vcr.clear();
      this.#rendered = false;
    }
  }
}
