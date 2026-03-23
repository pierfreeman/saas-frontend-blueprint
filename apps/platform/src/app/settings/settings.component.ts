import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CardModule, DividerModule, AvatarModule],
  template: `
    <div class="flex flex-col gap-6 max-w-2xl">
      <h1 class="text-2xl font-bold text-surface-900 m-0">Settings</h1>

      <!-- Profile -->
      <p-card header="Profile">
        <div class="flex items-center gap-4 mb-4">
          <p-avatar [label]="avatarLabel()" size="xlarge" shape="circle" />
          <div>
            <div class="font-semibold text-surface-900">{{ name() }}</div>
            <div class="text-surface-500 text-sm">{{ email() }}</div>
          </div>
        </div>
        <p class="text-surface-400 text-sm m-0">
          Profile information is managed via your identity provider.
        </p>
      </p-card>

      <!-- Organisation -->
      <p-card header="Organisation">
        <div class="flex flex-col gap-2">
          <div class="text-sm text-surface-500">Active organisation ID</div>
          <code class="text-sm bg-surface-100 px-2 py-1 rounded">{{
            activeOrgId() ?? '—'
          }}</code>
        </div>
      </p-card>

      <!-- Danger zone -->
      <p-card header="Danger zone" styleClass="border border-red-300">
        <p class="text-surface-600 text-sm mb-3">
          Permanently delete your account and all associated data.
        </p>
        <button
          disabled
          class="px-4 py-2 rounded border border-red-400 text-red-500 text-sm opacity-50 cursor-not-allowed"
        >
          Delete account
        </button>
      </p-card>
    </div>
  `,
})
export class SettingsComponent {
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);

  readonly activeOrgId = this.#orgsStore.activeOrgId;

  readonly email = () => this.#authStore.currentUser()?.email ?? '';
  readonly name = () => {
    const user = this.#authStore.currentUser();
    return user?.email?.split('@')[0] ?? 'Unknown';
  };
  readonly avatarLabel = () => this.email().charAt(0).toUpperCase() || '?';
}
