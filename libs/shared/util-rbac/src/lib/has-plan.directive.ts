import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { EntitlementsStore } from '@org/entitlements/data-access';

type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

/**
 * Structural directive — shows the host element only when the active org
 * is on one of the specified plans.
 *
 * Usage:
 *   <div *hasPlan="['PRO', 'ENTERPRISE']">Pro feature</div>
 */
@Directive({
  selector: '[hasPlan]',
  standalone: true,
})
export class HasPlanDirective {
  readonly #tpl = inject(TemplateRef);
  readonly #vcr = inject(ViewContainerRef);
  readonly #store = inject(EntitlementsStore);

  #plans: Plan[] = [];
  #rendered = false;

  @Input() set hasPlan(value: Plan | Plan[]) {
    this.#plans = Array.isArray(value) ? value : [value];
    this.#update();
  }

  constructor() {
    effect(() => {
      void this.#store.plan();
      this.#update();
    });
  }

  #update(): void {
    const current = this.#store.plan();
    const granted = current !== null && this.#plans.includes(current);

    if (granted && !this.#rendered) {
      this.#vcr.createEmbeddedView(this.#tpl);
      this.#rendered = true;
    } else if (!granted && this.#rendered) {
      this.#vcr.clear();
      this.#rendered = false;
    }
  }
}
