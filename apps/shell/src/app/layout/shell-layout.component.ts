import { DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import {
  NotificationRecord,
  NotificationsApi,
  NotificationsSocketService,
} from '@saas-frontend/notifications/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { ToastModule } from 'primeng/toast';
import { Subscription, filter, merge, of, switchMap } from 'rxjs';
import { NavbarComponent } from './navbar.component';

const PREVIEW_LIMIT = 10;

function typeIcon(type: string): string {
  if (type.startsWith('event.')) return 'pi-calendar';
  if (type.includes('billing') || type.includes('payment'))
    return 'pi-credit-card';
  if (type.includes('invite') || type.includes('member')) return 'pi-users';
  if (type.includes('org')) return 'pi-building';
  if (type.includes('export') || type.includes('download'))
    return 'pi-download';
  if (type.includes('alert') || type.includes('warn'))
    return 'pi-exclamation-triangle';
  return 'pi-bell';
}

function entityRef(n: NotificationRecord): { type: string; id: string } | null {
  const ref = (n.metadata as Record<string, unknown>)?.['entityRef'];
  if (
    ref &&
    typeof ref === 'object' &&
    'type' in ref &&
    'id' in ref &&
    typeof (ref as Record<string, unknown>)['type'] === 'string' &&
    typeof (ref as Record<string, unknown>)['id'] === 'string'
  ) {
    return ref as { type: string; id: string };
  }
  return null;
}

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, NavbarComponent, ToastModule, DatePipe],
  template: `
    <div class="flex h-screen overflow-hidden bg-surface-100">
      <!-- Sidebar -->
      <app-navbar />

      <!-- Main area -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <!-- Topbar -->
        <header
          class="flex items-center gap-3 px-4 lg:px-6 h-16 bg-surface-0 border-b border-surface-200 shrink-0"
        >
          <!-- Hamburger (mobile only) -->
          <button
            type="button"
            class="flex lg:hidden items-center justify-center w-9 h-9 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors shrink-0"
            aria-label="Open menu"
            (click)="navbar()?.toggleMobileMenu()"
          >
            <i class="pi pi-bars text-lg"></i>
          </button>

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
          <div class="relative" #notificationsMenu>
            <button
              type="button"
              class="flex items-center justify-center w-9 h-9 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
              aria-label="Notifications"
              (click)="toggleNotificationsOverlay($event)"
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

            @if (notificationsOpen()) {
              <div
                class="absolute right-0 mt-2 w-[24rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-surface-200 bg-surface-0 shadow-xl z-50 overflow-hidden"
              >
                <div
                  class="px-4 py-3 border-b border-surface-200 flex items-center justify-between"
                >
                  <h3 class="m-0 text-sm font-semibold text-surface-800">
                    Notifications
                  </h3>
                  <button
                    type="button"
                    class="text-xs font-medium text-primary hover:underline"
                    (click)="showAllNotifications()"
                  >
                    Show All
                  </button>
                </div>

                @if (previewLoading()) {
                  <div class="p-4 text-sm text-surface-500">Loading...</div>
                } @else if (previewNotifications().length === 0) {
                  <div class="p-6 text-sm text-center text-surface-500">
                    No notifications yet.
                  </div>
                } @else {
                  <div class="max-h-[28rem] overflow-y-auto">
                    @for (n of previewNotifications(); track n.id) {
                      <button
                        type="button"
                        class="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-surface-100 transition-colors"
                        [class.bg-primary-50]="!n.readAt"
                        [class.hover:bg-primary-100]="!n.readAt"
                        [class.bg-surface-0]="!!n.readAt"
                        [class.hover:bg-surface-50]="!!n.readAt"
                        (click)="openPreviewNotification(n)"
                      >
                        <div class="mt-2 w-2 flex-shrink-0">
                          @if (!n.readAt) {
                            <span
                              class="block w-2 h-2 rounded-full bg-primary"
                            ></span>
                          }
                        </div>

                        <div
                          class="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center flex-shrink-0"
                        >
                          <i
                            class="pi {{
                              typeIcon(n.type)
                            }} text-xs text-surface-500"
                          ></i>
                        </div>

                        <div class="min-w-0 flex-1">
                          <div class="flex items-start justify-between gap-2">
                            <p
                              class="m-0 text-sm leading-5"
                              [class.font-semibold]="!n.readAt"
                              [class.text-surface-800]="!n.readAt"
                              [class.text-surface-600]="!!n.readAt"
                            >
                              {{ n.title }}
                            </p>
                            <span
                              class="text-[10px] font-medium uppercase tracking-wide whitespace-nowrap"
                              [class.text-primary-700]="!n.readAt"
                              [class.text-surface-400]="!!n.readAt"
                            >
                              {{ !n.readAt ? 'Unread' : 'Read' }}
                            </span>
                          </div>
                          <p
                            class="m-0 mt-0.5 text-xs text-surface-500 line-clamp-2"
                          >
                            {{ n.body }}
                          </p>
                          <p class="m-0 mt-1 text-[11px] text-surface-400">
                            {{ n.createdAt | date: 'mediumDate' }} &middot;
                            {{ n.createdAt | date: 'shortTime' }}
                          </p>
                        </div>
                      </button>
                    }
                  </div>
                }
              </div>
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
export class ShellLayoutComponent implements OnDestroy {
  readonly #router = inject(Router);
  readonly #notificationsApi = inject(NotificationsApi);
  readonly #notificationsSocket = inject(NotificationsSocketService);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #subs = new Subscription();

  readonly notificationsMenu =
    viewChild<ElementRef<HTMLElement>>('notificationsMenu');

  readonly navbar = viewChild(NavbarComponent);

  readonly unreadCount = signal(0);
  readonly notificationsOpen = signal(false);
  readonly previewLoading = signal(false);
  readonly previewNotifications = signal<NotificationRecord[]>([]);
  readonly orgName = this.#orgsStore.activeOrgName;
  readonly typeIcon = typeIcon;

  constructor() {
    // Re-fetch unread count on every org switch and every navigation,
    // so the badge stays current after visiting /notifications.
    toObservable(this.#orgsStore.activeOrgId)
      .pipe(
        filter(Boolean),
        switchMap((orgId) =>
          merge(
            of(null),
            this.#router.events.pipe(filter((e) => e instanceof NavigationEnd)),
          ).pipe(switchMap(() => this.#notificationsApi.getUnreadCount(orgId))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (res) => this.unreadCount.set(res.count ?? 0),
        error: () => {
          /* badge stays stale — non-critical */
        },
      });

    this.#subs.add(
      this.#notificationsSocket.unreadCount$.subscribe(({ count, orgId }) => {
        // Only update badge if the event is for the active org (or has no orgId for back-compat).
        const activeOrg = this.#orgsStore.activeOrgId();
        if (!orgId || orgId === activeOrg) {
          this.unreadCount.set(count ?? 0);
        }
      }),
    );

    this.#subs.add(
      this.#router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => this.notificationsOpen.set(false)),
    );
  }

  ngOnDestroy(): void {
    this.#subs.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.notificationsOpen()) return;
    const container = this.notificationsMenu()?.nativeElement;
    const target = event.target as Node | null;
    if (container && target && !container.contains(target)) {
      this.notificationsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.notificationsOpen.set(false);
  }

  toggleNotificationsOverlay(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.notificationsOpen();
    this.notificationsOpen.set(next);
    if (next) this.loadPreviewNotifications();
  }

  showAllNotifications(): void {
    this.notificationsOpen.set(false);
    this.#router.navigateByUrl('/notifications');
  }

  openPreviewNotification(notification: NotificationRecord): void {
    if (!notification.readAt) {
      this.#notificationsApi.markAsRead(notification.id).subscribe({
        next: () => {
          this.previewNotifications.update((list) =>
            list.map((n) =>
              n.id === notification.id
                ? { ...n, readAt: new Date().toISOString() }
                : n,
            ),
          );
          this.unreadCount.update((count) => Math.max(0, count - 1));
        },
      });
    }

    const ref = entityRef(notification);
    if (!ref) return;
    if (ref.type === 'event') {
      this.notificationsOpen.set(false);
      this.#router.navigate(['/planning'], {
        queryParams: { eventId: ref.id },
      });
    }
  }

  private loadPreviewNotifications(): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) {
      this.previewNotifications.set([]);
      return;
    }

    this.previewLoading.set(true);
    this.#notificationsApi
      .getNotifications({
        orgId,
        limit: PREVIEW_LIMIT,
        offset: 0,
      })
      .subscribe({
        next: (list) => {
          this.previewNotifications.set(list.slice(0, PREVIEW_LIMIT));
          this.previewLoading.set(false);
        },
        error: () => this.previewLoading.set(false),
      });
  }
}
