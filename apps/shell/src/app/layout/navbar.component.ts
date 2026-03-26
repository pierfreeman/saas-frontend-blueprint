import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    AvatarModule,
    MenuModule,
    TooltipModule,
  ],
  template: `
    <aside
      class="flex flex-col w-[68px] h-full bg-surface-0 border-r border-surface-200 shrink-0 select-none"
    >
      <!-- Brand -->
      <a
        routerLink="/dashboard"
        class="flex items-center justify-center h-16 border-b border-surface-100 no-underline shrink-0"
        aria-label="Home"
      >
        <div
          class="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center"
        >
          <span class="text-white font-bold text-sm leading-none">S</span>
        </div>
      </a>

      <!-- Primary Navigation -->
      <nav class="flex flex-col items-center gap-1 py-3 flex-1">
        <a
          routerLink="/dashboard"
          routerLinkActive="!text-primary"
          pTooltip="Dashboard"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-home"></i>
        </a>
        <a
          routerLink="/activity-log"
          routerLinkActive="!text-primary"
          pTooltip="Activity Log"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-history"></i>
        </a>
        <a
          routerLink="/members"
          routerLinkActive="!text-primary"
          pTooltip="Members"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-users"></i>
        </a>
        <a
          routerLink="/billing"
          routerLinkActive="!text-primary"
          pTooltip="Billing"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-credit-card"></i>
        </a>
        <a
          routerLink="/storage"
          routerLinkActive="!text-primary"
          pTooltip="Storage"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-database"></i>
        </a>
      </nav>

      <!-- Bottom Actions -->
      <div
        class="flex flex-col items-center gap-1 pb-4 pt-2 border-t border-surface-100"
      >
        <!-- Help -->
        <button
          type="button"
          pTooltip="Help"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          aria-label="Help"
        >
          <i class="pi pi-question-circle"></i>
        </button>

        <!-- Settings -->
        <a
          routerLink="/settings"
          routerLinkActive="!text-primary"
          pTooltip="Settings"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-cog"></i>
        </a>

        <!-- User Avatar -->
        <p-menu
          #menu
          [model]="avatarMenuItems"
          [popup]="true"
          appendTo="body"
        />
        <p-avatar
          [label]="avatarLabel()"
          shape="circle"
          class="cursor-pointer mt-1"
          pTooltip="Account"
          tooltipPosition="right"
          (click)="menu.toggle($event)"
        />
      </div>
    </aside>
  `,
})
export class NavbarComponent {
  readonly #auth = inject(AuthService);
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #router = inject(Router);

  readonly avatarLabel = computed(() => {
    const email = this.#authStore.currentUser()?.email ?? '';
    return email.charAt(0).toUpperCase() || '?';
  });

  readonly avatarMenuItems: MenuItem[] = [
    {
      label: 'Switch organization',
      icon: 'pi pi-building',
      command: () => this.#router.navigate(['/org/select']),
    },
    { separator: true },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.#logout(),
    },
  ];

  #logout(): void {
    this.#authStore.clearUser();
    this.#orgsStore.clearActiveOrg();
    this.#auth.logout({ openUrl: false });
    this.#router.navigateByUrl('/auth');
  }
}
