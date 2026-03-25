import { Component, inject, computed, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationEnd,
} from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, merge, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';
import { NotificationsApi } from '@org/notifications/data-access';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    ButtonModule,
    MenuModule,
    AvatarModule,
    RouterLink,
    RouterLinkActive,
  ],
  template: `
    <header
      class="flex items-center justify-between px-6 h-14 bg-surface-0 border-b border-surface-200 shadow-sm"
    >
      <!-- Logo + primary nav -->
      <div class="flex items-center gap-6">
        <a
          routerLink="/dashboard"
          class="font-bold text-lg tracking-tight text-primary no-underline"
        >
          SaaS App
        </a>

        <nav class="hidden sm:flex items-center gap-1">
          <a
            routerLink="/dashboard"
            routerLinkActive="text-primary font-semibold"
            class="px-3 py-1.5 rounded text-sm text-surface-600 hover:bg-surface-100 no-underline transition-colors"
          >
            Dashboard
          </a>
          <a
            routerLink="/members"
            routerLinkActive="text-primary font-semibold"
            class="px-3 py-1.5 rounded text-sm text-surface-600 hover:bg-surface-100 no-underline transition-colors"
          >
            Members
          </a>
          <a
            routerLink="/settings"
            routerLinkActive="text-primary font-semibold"
            class="px-3 py-1.5 rounded text-sm text-surface-600 hover:bg-surface-100 no-underline transition-colors"
          >
            Settings
          </a>
          <a
            routerLink="/billing"
            routerLinkActive="text-primary font-semibold"
            class="px-3 py-1.5 rounded text-sm text-surface-600 hover:bg-surface-100 no-underline transition-colors"
          >
            Billing
          </a>
          <a
            routerLink="/activity-log"
            routerLinkActive="text-primary font-semibold"
            class="px-3 py-1.5 rounded text-sm text-surface-600 hover:bg-surface-100 no-underline transition-colors"
          >
            Activity Log
          </a>
        </nav>
      </div>

      <div class="flex items-center gap-4">
        <!-- Notifications bell -->
        <div class="relative">
          <p-button
            icon="pi pi-bell"
            [text]="true"
            [rounded]="true"
            severity="secondary"
            routerLink="/notifications"
            aria-label="Notifications"
          />
          @if (unreadCount() > 0) {
            <span
              class="absolute top-0 right-0 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 pointer-events-none"
            >
              {{ unreadCount() > 99 ? '99+' : unreadCount() }}
            </span>
          }
        </div>

        <!-- Org switcher -->
        @if (activeOrgId()) {
          <p-button
            [label]="activeOrgName() ?? activeOrgId()!"
            severity="secondary"
            size="small"
            icon="pi pi-building"
            routerLink="/org/select"
          />
        }

        <!-- Avatar menu -->
        <p-menu #menu [model]="avatarMenuItems" [popup]="true" />
        <p-avatar
          [label]="avatarLabel()"
          shape="circle"
          class="cursor-pointer"
          (click)="menu.toggle($event)"
        />
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly #auth = inject(AuthService);
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #router = inject(Router);
  readonly #notificationsApi = inject(NotificationsApi);

  readonly activeOrgId = this.#orgsStore.activeOrgId;
  readonly activeOrgName = this.#orgsStore.activeOrgName;
  readonly unreadCount = signal(0);

  constructor() {
    // Re-fetch unread count whenever the active org changes, and again after
    // every navigation (so the badge refreshes after visiting /notifications).
    toObservable(this.activeOrgId)
      .pipe(
        filter(Boolean),
        switchMap(() =>
          merge(
            of(null),
            this.#router.events.pipe(filter((e) => e instanceof NavigationEnd)),
          ).pipe(switchMap(() => this.#notificationsApi.getUnreadCount())),
        ),
      )
      .subscribe({
        next: (res) => this.unreadCount.set(res.count ?? 0),
        error: () => {},
      });
  }

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
    // openUrl: false prevents redirect to Auth0 logout endpoint,
    // which requires the returnTo URL to be pre-authorised in Auth0 dashboard.
    // The SDK still clears the local session and auth cookies.
    this.#auth.logout({ openUrl: false });
    this.#router.navigateByUrl('/auth');
  }
}
