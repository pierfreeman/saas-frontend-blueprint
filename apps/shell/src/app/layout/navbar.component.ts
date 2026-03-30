import { Component, computed, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationEnd,
} from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@auth0/auth0-angular';
import { AvatarModule } from 'primeng/avatar';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { OrgContextService } from '@saas-frontend/shared/util-org-context';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    AvatarModule,
    DrawerModule,
    MenuModule,
    TooltipModule,
  ],
  template: `
    <!-- Desktop sidebar (hidden on mobile) -->
    <aside
      class="hidden lg:flex flex-col w-17 h-full bg-surface-0 border-r border-surface-200 shrink-0 select-none"
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
        <!-- Dashboard -->
        <a
          routerLink="/dashboard"
          routerLinkActive="!text-primary"
          pTooltip="Dashboard"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-home"></i>
        </a>

        <!-- Planning -->
        <a
          routerLink="/planning"
          routerLinkActive="!text-primary"
          pTooltip="Planning"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-calendar"></i>
        </a>

        <!-- Storage -->
        <a
          routerLink="/storage"
          routerLinkActive="!text-primary"
          pTooltip="Storage"
          tooltipPosition="right"
          class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
        >
          <i class="pi pi-folder"></i>
        </a>
      </nav>

      <!-- Bottom Actions -->
      <div
        class="flex flex-col items-center gap-1 pb-4 pt-2 border-t border-surface-100"
      >
        <!-- Organisation Settings — OWNER / ADMIN only -->
        @if (showOrgSettings()) {
          <a
            routerLink="/org-settings"
            routerLinkActive="!text-primary"
            pTooltip="Organisation Settings"
            tooltipPosition="right"
            class="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors no-underline"
          >
            <i class="pi pi-building"></i>
          </a>
        }

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

        <!-- User Avatar with contextual menu -->
        <p-menu
          #menu
          [model]="avatarMenuItems"
          [popup]="true"
          appendTo="body"
        />
        <p-avatar
          [image]="avatarPicture() ?? undefined"
          [label]="avatarPicture() ? undefined : avatarLabel()"
          shape="circle"
          class="cursor-pointer mt-1"
          pTooltip="Account"
          tooltipPosition="right"
          (click)="menu.toggle($event)"
        />
      </div>
    </aside>

    <!-- Mobile navigation drawer (visible only on mobile, triggered by topbar hamburger) -->
    <p-drawer
      [visible]="mobileMenuOpen()"
      (visibleChange)="mobileMenuOpen.set($event)"
      position="left"
      [style]="{ width: '17.5rem' }"
    >
      <!-- Header -->
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center shrink-0"
          >
            <span class="text-white font-bold text-sm leading-none">S</span>
          </div>
          <span class="font-semibold text-surface-900">Menu</span>
        </div>
      </ng-template>

      <!-- Primary nav links -->
      <nav class="flex flex-col gap-0.5">
        <a
          routerLink="/dashboard"
          routerLinkActive="bg-primary-50 !text-primary font-medium"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors no-underline"
        >
          <i class="pi pi-home text-lg w-5 text-center shrink-0"></i>
          <span class="text-sm">Dashboard</span>
        </a>
        <a
          routerLink="/planning"
          routerLinkActive="bg-primary-50 !text-primary font-medium"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors no-underline"
        >
          <i class="pi pi-calendar text-lg w-5 text-center shrink-0"></i>
          <span class="text-sm">Planning</span>
        </a>
        <a
          routerLink="/storage"
          routerLinkActive="bg-primary-50 !text-primary font-medium"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors no-underline"
        >
          <i class="pi pi-folder text-lg w-5 text-center shrink-0"></i>
          <span class="text-sm">Storage</span>
        </a>
        @if (showOrgSettings()) {
          <a
            routerLink="/org-settings"
            routerLinkActive="bg-primary-50 !text-primary font-medium"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors no-underline"
          >
            <i class="pi pi-building text-lg w-5 text-center shrink-0"></i>
            <span class="text-sm">Organisation Settings</span>
          </a>
        }
      </nav>

      <!-- Bottom actions -->
      <div class="mt-4 pt-4 border-t border-surface-200 flex flex-col gap-0.5">
        <button
          type="button"
          (click)="navigateTo('/personal-settings')"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors w-full text-left"
        >
          <i class="pi pi-user text-lg w-5 text-center shrink-0"></i>
          <span class="text-sm">Personal Settings</span>
        </button>
        <button
          type="button"
          (click)="navigateTo('/org/select')"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors w-full text-left"
        >
          <i
            class="pi pi-arrow-right-arrow-left text-lg w-5 text-center shrink-0"
          ></i>
          <span class="text-sm">Switch organization</span>
        </button>
        <button
          type="button"
          (click)="mobilLogout()"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full text-left"
        >
          <i class="pi pi-sign-out text-lg w-5 text-center shrink-0"></i>
          <span class="text-sm">Logout</span>
        </button>
      </div>
    </p-drawer>
  `,
})
export class NavbarComponent {
  readonly #auth = inject(AuthService);
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #orgContext = inject(OrgContextService);
  readonly #router = inject(Router);

  readonly mobileMenuOpen = signal(false);

  constructor() {
    // Auto-close the mobile drawer on every navigation.
    this.#router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mobileMenuOpen.set(false));
  }

  /** Called by ShellLayoutComponent's hamburger button. */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  /** Navigate and close the mobile drawer. */
  navigateTo(path: string): void {
    this.#router.navigateByUrl(path);
  }

  /** Logout from the mobile drawer. */
  mobilLogout(): void {
    this.#logout();
  }

  readonly avatarLabel = computed(() => {
    const email = this.#authStore.currentUser()?.email ?? '';
    return email.charAt(0).toUpperCase() || '?';
  });

  readonly avatarPicture = computed(
    () => this.#authStore.currentUser()?.pictureUrl ?? null,
  );

  /** Show the Organisation Settings icon only for OWNER and ADMIN. */
  readonly showOrgSettings = this.#orgContext.canManageOrg;

  readonly avatarMenuItems: MenuItem[] = [
    {
      label: 'Personal Settings',
      icon: 'pi pi-user',
      command: () => void this.#router.navigate(['/personal-settings']),
    },
    {
      label: 'Switch organization',
      icon: 'pi pi-building',
      command: () => void this.#router.navigate(['/org/select']),
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
