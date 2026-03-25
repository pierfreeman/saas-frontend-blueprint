import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  NotificationRecord,
  NotificationsApi,
  NotificationsSocketService,
} from '@org/notifications/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Subscription } from 'rxjs';

const PAGE_SIZE = 20;

/** Map notification type to a PrimeIcons icon class. */
function typeIcon(type: string): string {
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

@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, SkeletonModule, DatePipe],
  template: `
    <div class="max-w-2xl mx-auto py-6 px-4 flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-surface-800 m-0">
          Notifications
        </h1>
        <div class="flex items-center gap-2">
          @if (unreadIds().length > 0) {
            <p-button
              label="Mark all read"
              severity="secondary"
              size="small"
              [loading]="markingAll()"
              (onClick)="markAllAsRead()"
            />
          }
          <p-button
            [label]="unreadOnly() ? 'Show all' : 'Unread only'"
            [severity]="unreadOnly() ? 'primary' : 'secondary'"
            size="small"
            (onClick)="toggleUnreadOnly()"
          />
        </div>
      </div>

      <!-- Loading skeletons -->
      @if (loading() && notifications().length === 0) {
        @for (_ of skeletons; track $index) {
          <div
            class="flex items-start gap-3 p-4 bg-surface-0 rounded-lg border border-surface-200"
          >
            <p-skeleton shape="circle" size="2.25rem" />
            <div class="flex-1 flex flex-col gap-2 pt-1">
              <p-skeleton width="55%" height="0.875rem" />
              <p-skeleton width="85%" height="0.75rem" />
              <p-skeleton width="30%" height="0.7rem" />
            </div>
          </div>
        }
      }

      <!-- Empty state -->
      @if (!loading() && notifications().length === 0) {
        <div
          class="text-center py-16 text-surface-400 flex flex-col items-center gap-3"
        >
          <i class="pi pi-bell-slash text-5xl"></i>
          <p class="m-0 text-base">
            {{ unreadOnly() ? 'All caught up!' : 'No notifications yet.' }}
          </p>
        </div>
      }

      <!-- Notification list -->
      @for (n of notifications(); track n.id) {
        <div
          class="flex items-start gap-3 p-4 rounded-lg border border-surface-200 bg-surface-0 hover:bg-surface-50 transition-colors group"
          [class.cursor-pointer]="!n.readAt"
          (click)="!n.readAt && markAsRead(n)"
        >
          <!-- Unread indicator dot -->
          <div class="mt-2.5 w-2 flex-shrink-0">
            @if (!n.readAt) {
              <span class="block w-2 h-2 rounded-full bg-primary"></span>
            }
          </div>

          <!-- Type icon avatar -->
          <div
            class="flex-shrink-0 w-9 h-9 rounded-full bg-surface-100 flex items-center justify-center"
          >
            <i class="pi {{ typeIcon(n.type) }} text-sm text-surface-500"></i>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <p
                class="m-0 text-sm text-surface-800"
                [class.font-semibold]="!n.readAt"
              >
                {{ n.title }}
              </p>
              <span (click)="$event.stopPropagation()">
                <p-button
                  icon="pi pi-trash"
                  [text]="true"
                  [rounded]="true"
                  severity="danger"
                  size="small"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  (onClick)="deleteNotification(n.id)"
                />
              </span>
            </div>
            <p class="m-0 mt-0.5 text-sm text-surface-500 line-clamp-2">
              {{ n.body }}
            </p>
            <p class="m-0 mt-1 text-xs text-surface-400">
              {{ n.createdAt | date: 'mediumDate' }} &middot;
              {{ n.createdAt | date: 'shortTime' }}
              @if (n.readAt) {
                &middot; <span class="text-surface-300">Read</span>
              }
            </p>
          </div>
        </div>
      }

      <!-- Load more -->
      @if (hasMore()) {
        <div class="text-center">
          <p-button
            label="Load more"
            severity="secondary"
            [loading]="loading()"
            (onClick)="loadMore()"
          />
        </div>
      }
    </div>
  `,
})
export class NotificationsComponent implements OnInit, OnDestroy {
  readonly #api = inject(NotificationsApi);
  readonly #socket = inject(NotificationsSocketService);
  readonly #orgsStore = inject(OrganizationsStore);

  readonly notifications = signal<NotificationRecord[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly markingAll = signal(false);
  readonly unreadOnly = signal(false);
  readonly unreadCount = signal(0);

  readonly #offset = signal(0);
  readonly #subs = new Subscription();

  readonly hasMore = computed(() => this.notifications().length < this.total());

  readonly unreadIds = computed(() =>
    this.notifications()
      .filter((n) => !n.readAt)
      .map((n) => n.id),
  );

  readonly skeletons = Array(6);

  readonly typeIcon = typeIcon;

  ngOnInit(): void {
    this.#load(true);
    this.#socket.connect();
    this.#subs.add(
      this.#socket.notification$.subscribe((n) =>
        this.#onRealtimeNotification(n),
      ),
    );
    this.#subs.add(
      this.#socket.unreadCount$.subscribe(({ count }) =>
        this.unreadCount.set(count),
      ),
    );
  }

  ngOnDestroy(): void {
    this.#subs.unsubscribe();
  }

  toggleUnreadOnly(): void {
    this.unreadOnly.update((v) => !v);
    this.#offset.set(0);
    this.notifications.set([]);
    this.total.set(0);
    this.#load(true);
  }

  loadMore(): void {
    this.#offset.set(this.notifications().length);
    this.#load(false);
  }

  markAsRead(notification: NotificationRecord): void {
    this.#api.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) =>
            n.id === notification.id
              ? { ...n, readAt: new Date().toISOString() }
              : n,
          ),
        );
      },
      error: () => {},
    });
  }

  markAllAsRead(): void {
    const ids = this.unreadIds();
    if (!ids.length) return;

    this.markingAll.set(true);
    this.#api.markManyAsRead({ ids }).subscribe({
      next: () => {
        const readAt = new Date().toISOString();
        this.notifications.update((list) =>
          list.map((n) => (n.readAt ? n : { ...n, readAt })),
        );
        this.markingAll.set(false);
      },
      error: () => this.markingAll.set(false),
    });
  }

  deleteNotification(id: string): void {
    this.#api.deleteNotification(id).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== id));
        this.total.update((t) => Math.max(0, t - 1));
      },
      error: () => {},
    });
  }

  #load(reset: boolean): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;

    this.loading.set(true);

    this.#api
      .getNotifications({
        orgId,
        unreadOnly: this.unreadOnly(),
        limit: PAGE_SIZE,
        offset: this.#offset(),
      })
      .subscribe({
        next: (list) => {
          this.notifications.update((prev) =>
            reset ? list : [...prev, ...list],
          );
          // The backend returns a flat array; track length to infer hasMore.
          // If fewer than PAGE_SIZE items came back, we've reached the end.
          if (reset) {
            this.total.set(
              list.length < PAGE_SIZE ? list.length : list.length + PAGE_SIZE, // optimistic: assume at least one more page
            );
          } else if (list.length < PAGE_SIZE) {
            // Reached the last page — clamp total to current length.
            this.total.set(this.notifications().length);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  /** Prepend a server-pushed notification to the list, respecting the active filter. */
  #onRealtimeNotification(n: NotificationRecord): void {
    // If showing unread-only, skip notifications that somehow arrive already read.
    if (this.unreadOnly() && n.readAt) return;

    this.notifications.update((list) => [n, ...list]);
    this.total.update((t) => t + 1);
    if (!n.readAt) {
      this.unreadCount.update((c) => c + 1);
    }
  }
}
