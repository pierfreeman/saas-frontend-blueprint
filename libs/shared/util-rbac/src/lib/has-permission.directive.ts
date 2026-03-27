import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { PermissionsService } from './permissions.service';
import type { Permission } from './permissions.constants';

/**
 * Structural directive — shows the host element only when the current user
 * has the required permission.
 *
 * Usage:
 *   <button *hasPermission="PERMISSIONS.ORG_BILLING_MANAGE">Manage Billing</button>
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  readonly #tpl = inject(TemplateRef);
  readonly #vcr = inject(ViewContainerRef);
  readonly #permissions = inject(PermissionsService);

  #permission: Permission | null = null;
  #rendered = false;

  @Input() set hasPermission(value: Permission) {
    this.#permission = value;
    this.#update();
  }

  constructor() {
    effect(() => {
      // Re-run whenever permissions change (e.g. after org switch)
      this.#permissions.currentUserPermissions();
      this.#update();
    });
  }

  #update(): void {
    const granted = this.#permission
      ? this.#permissions.currentUserPermissions().has(this.#permission)
      : false;

    if (granted && !this.#rendered) {
      this.#vcr.createEmbeddedView(this.#tpl);
      this.#rendered = true;
    } else if (!granted && this.#rendered) {
      this.#vcr.clear();
      this.#rendered = false;
    }
  }
}
