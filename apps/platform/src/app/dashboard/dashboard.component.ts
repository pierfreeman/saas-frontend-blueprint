import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CardModule],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Welcome header -->
      <div>
        <h1 class="text-2xl font-bold text-surface-900 m-0">
          Welcome back{{ name() ? ', ' + name() : '' }}!
        </h1>
        <p class="text-surface-500 mt-1 mb-0">{{ email() }}</p>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <p-card styleClass="text-center">
          <div class="text-3xl font-bold text-primary">—</div>
          <div class="text-surface-500 text-sm mt-1">Members</div>
        </p-card>
        <p-card styleClass="text-center">
          <div class="text-3xl font-bold text-primary">—</div>
          <div class="text-surface-500 text-sm mt-1">Events (30d)</div>
        </p-card>
        <p-card styleClass="text-center">
          <div class="text-3xl font-bold text-primary">—</div>
          <div class="text-surface-500 text-sm mt-1">Storage used</div>
        </p-card>
      </div>

      <!-- Recent activity placeholder -->
      <p-card header="Recent activity">
        <p class="text-surface-500 text-sm m-0">No activity yet.</p>
      </p-card>
    </div>
  `,
})
export class DashboardComponent {
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);

  readonly email = this.#authStore.currentUser
    ? () => this.#authStore.currentUser()?.email ?? ''
    : () => '';

  readonly name = () => {
    const user = this.#authStore.currentUser();
    return user?.email?.split('@')[0] ?? '';
  };

  readonly activeOrgId = this.#orgsStore.activeOrgId;
}
