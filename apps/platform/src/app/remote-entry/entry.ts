import { Component, inject } from '@angular/core';
import { AuthStore } from '@org/auth/data-access';
import type { User } from '@org/auth/data-access';

@Component({
  selector: 'app-platform-entry',
  template: `
    @if (user()) {
      <p>
        Logged in as <strong>{{ user()!.email }}</strong>
      </p>
    } @else {
      <p>Loading…</p>
    }
  `,
})
export class RemoteEntry {
  readonly #authStore = inject(AuthStore);

  readonly user = this.#authStore.currentUser;
}
