import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-org-settings-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, RouterLink, RouterLinkActive],
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-2xl font-bold text-surface-900 m-0">
        Organisation Settings
      </h1>

      <!-- Inner tab nav -->
      <nav class="flex gap-1 border-b border-surface-200 -mb-2">
        <a
          routerLink="organization"
          routerLinkActive="border-b-2 border-primary text-primary font-medium"
          class="px-4 py-2.5 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-t-lg transition-colors no-underline"
        >
          Organization
        </a>
        <a
          routerLink="members"
          routerLinkActive="border-b-2 border-primary text-primary font-medium"
          class="px-4 py-2.5 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-t-lg transition-colors no-underline"
        >
          Members
        </a>
        <a
          routerLink="billing"
          routerLinkActive="border-b-2 border-primary text-primary font-medium"
          class="px-4 py-2.5 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-t-lg transition-colors no-underline"
        >
          Billing
        </a>
        <a
          routerLink="activity-log"
          routerLinkActive="border-b-2 border-primary text-primary font-medium"
          class="px-4 py-2.5 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-t-lg transition-colors no-underline"
        >
          Activity Log
        </a>
      </nav>

      <!-- Tab content -->
      <router-outlet />
    </div>
  `,
})
export class OrgSettingsLayoutComponent {}
