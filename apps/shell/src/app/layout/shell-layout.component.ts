import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, merge, of, switchMap } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { NavbarComponent } from './navbar.component';
import { NotificationsApi } from '@org/notifications/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, NavbarComponent, ToastModule],
  template: `
    <div class="flex h-screen overflow-hidden bg-surface-100">
      <!-- Sidebar -->
      <app-navbar />

      <!-- Main area -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <!-- Topbar -->
        <header
          class="flex items-center gap-3 px-6 h-16 bg-surface-0 border-b border-surface-200 shrink-0"
        >
          <!-- Org name (left) -->
          <span class="text-sm font-medium text-surface-500 mr-auto truncate">
            {{ orgName() }}
          </span>

          <!-- Search -->
          <div class="relative flex items-center">
            <i
              class="pi pi-search absolute left-3 text-surface-400 text-sm pointer-events-none"
            ></i>
            <input
              type="text"
              placeholder="Search"
              class="pl-9 pr-4 h-9 w-52 text-sm rounded-lg border border-surface-200 bg-surface-50 text-surface-700 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <!-- Notification bell -->
          <div class="relative">
            <button
              type="button"
              class="flex items-center justify-center w-9 h-9 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
              aria-label="Notifications"
              (click)="goToNotifications()"
            >
              <i class="pi pi-bell text-lg"></i>
            </button>
            @if (unreadCount() > 0) {
              <span
                class="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-medium leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 pointer-events-none"
              >
                {{ unreadCount() > 99 ? '99+' : unreadCount() }}
              </span>
            }
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
    <p-toast position="bottom-right" />
  `,
})
export class ShellLayoutComponent {
  readonly #router = inject(Router);
  readonly #notificationsApi = inject(NotificationsApi);
  readonly #orgsStore = inject(OrganizationsStore);

  readonly unreadCount = signal(0);
  readonly orgName = this.#orgsStore.activeOrgName;

  constructor() {
    // Re-fetch unread count on every org switch and every navigation,
    // so the badge stays current after visiting /notifications.
    toObservable(this.#orgsStore.activeOrgId)
      .pipe(
        filter(Boolean),
        switchMap(() =>
          merge(
            of(null),
            this.#router.events.pipe(filter((e) => e instanceof NavigationEnd)),
          ).pipe(switchMap(() => this.#notificationsApi.getUnreadCount())),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (res) => this.unreadCount.set(res.count ?? 0),
        error: () => {
          /* badge stays stale — non-critical */
        },
      });
  }

  goToNotifications(): void {
    this.#router.navigateByUrl('/notifications');
  }
}
