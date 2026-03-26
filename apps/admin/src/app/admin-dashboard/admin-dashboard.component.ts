import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CardModule, TagModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-surface-900 m-0">Admin Panel</h1>
        <p-tag value="Admin only" severity="danger" />
      </div>

      <!-- Admin info -->
      <p-card>
        <div class="flex flex-col gap-1">
          <div class="text-sm text-surface-500">Logged in as</div>
          <div class="font-medium">{{ email() }}</div>
          <div class="text-sm text-surface-500 mt-2">Active organisation</div>
          <code class="text-sm bg-surface-100 px-2 py-1 rounded w-fit">{{
            activeOrgId() ?? '—'
          }}</code>
        </div>
      </p-card>

      <!-- Placeholder sections -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <p-card header="Users">
          <p class="text-surface-500 text-sm m-0">
            User management coming soon.
          </p>
        </p-card>
        <p-card header="Activity log">
          <p class="text-surface-500 text-sm m-0">Audit log coming soon.</p>
        </p-card>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent {
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);

  readonly email = () => this.#authStore.currentUser()?.email ?? '';
  readonly activeOrgId = this.#orgsStore.activeOrgId;
}
