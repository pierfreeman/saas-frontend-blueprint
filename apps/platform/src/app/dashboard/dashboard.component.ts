import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import {
  MembershipsApi,
  MembershipsStore,
} from '@saas-frontend/memberships/data-access';
import {
  BillingApi,
  SubscriptionResponse,
} from '@saas-frontend/billing/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import {
  StorageApi,
  StorageQuotaResponse,
} from '@saas-frontend/storage/data-access';
import {
  ActivityLogApi,
  ActivityLogRecord,
} from '@saas-frontend/activity-log/data-access';
import {
  PlanningApi,
  EventOccurrence,
  RSVPStatus,
} from '@saas-frontend/planning/data-access';

interface AgendaEvent {
  eventId: string;
  originalStartUtc: string;
  title: string;
  startUtc: string;
  endUtc: string;
  isAllDay: boolean;
  location: string | null;
  userRsvp: RSVPStatus | null;
  rsvpLabel: string;
  rsvpSeverity: 'success' | 'danger' | 'warn' | 'secondary';
}

interface ActivityItem {
  id: string;
  label: string;
  entityType: string | null;
  relativeTime: string;
  actorRole: string | null;
}

function formatStorageBytes(bytes: string | null | undefined): string {
  if (!bytes) return '—';
  const n = Number.parseInt(bytes, 10);
  if (Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1_073_741_824) return `${(n / 1_048_576).toFixed(1)} MB`;
  return `${(n / 1_073_741_824).toFixed(2)} GB`;
}

function formatActivityAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const RSVP_LABEL: Record<RSVPStatus, string> = {
  YES: 'Going',
  NO: 'Not going',
  MAYBE: 'Maybe',
  PENDING: 'Pending',
};

const RSVP_SEVERITY: Record<
  RSVPStatus,
  'success' | 'danger' | 'warn' | 'secondary'
> = {
  YES: 'success',
  NO: 'danger',
  MAYBE: 'warn',
  PENDING: 'secondary',
};

function toAgendaEvent(occ: EventOccurrence, userId: string): AgendaEvent {
  const attendee = occ.attendees.find((a) => a.userId === userId);
  const rsvp = attendee?.status ?? null;
  return {
    eventId: occ.eventId,
    originalStartUtc: occ.originalStartUtc,
    title: occ.title,
    startUtc: occ.startUtc,
    endUtc: occ.endUtc,
    isAllDay: occ.isAllDay,
    location: occ.location,
    userRsvp: rsvp,
    rsvpLabel: rsvp ? RSVP_LABEL[rsvp] : '',
    rsvpSeverity: rsvp ? RSVP_SEVERITY[rsvp] : 'secondary',
  };
}

function toActivityItem(log: ActivityLogRecord): ActivityItem {
  return {
    id: log.id,
    label: formatActivityAction(log.action),
    entityType: log.entityType,
    relativeTime: formatRelativeTime(log.createdAt),
    actorRole: log.actorRole,
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CardModule, SkeletonModule, TagModule, RouterLink, DatePipe],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Welcome header -->
      <div>
        <h1 class="text-2xl font-bold text-surface-900 m-0">
          Welcome back{{ name() ? ', ' + name() : '' }}!
        </h1>
        <p class="text-surface-500 mt-1 mb-0">{{ email() }}</p>
      </div>

      <!-- Stat cards — admin/owner sees all four; members see only Storage -->
      @if (isAdminOrOwner()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Members -->
          <a routerLink="/members" class="no-underline">
            <p-card
              styleClass="text-center hover:shadow-md transition-shadow cursor-pointer"
            >
              @if (loadingMembers()) {
                <p-skeleton
                  height="2.25rem"
                  width="3rem"
                  styleClass="mx-auto mb-1"
                />
              } @else {
                <div class="text-3xl font-bold text-primary">
                  {{ memberCount() }}
                </div>
              }
              <div class="text-surface-500 text-sm mt-1">Members</div>
            </p-card>
          </a>

          <!-- Plan -->
          <p-card styleClass="text-center">
            @if (loadingBilling()) {
              <p-skeleton
                height="2.25rem"
                width="5rem"
                styleClass="mx-auto mb-1"
              />
            } @else {
              <div class="text-3xl font-bold text-primary">
                {{ planLabel() }}
              </div>
            }
            <div class="text-surface-500 text-sm mt-1">Plan</div>
          </p-card>

          <!-- Seats -->
          <p-card styleClass="text-center">
            @if (loadingBilling()) {
              <p-skeleton
                height="2.25rem"
                width="3rem"
                styleClass="mx-auto mb-1"
              />
            } @else {
              <div class="text-3xl font-bold text-primary">
                {{ seatCount() }}
              </div>
            }
            <div class="text-surface-500 text-sm mt-1">Seats</div>
          </p-card>

          <!-- Storage -->
          <a routerLink="/storage" class="no-underline">
            <p-card
              styleClass="text-center hover:shadow-md transition-shadow cursor-pointer"
            >
              @if (loadingStorage()) {
                <p-skeleton
                  height="2.25rem"
                  width="6rem"
                  styleClass="mx-auto mb-1"
                />
              } @else {
                <div class="text-3xl font-bold text-primary">
                  {{ storageUsedLabel() }}
                </div>
              }
              <div class="text-surface-500 text-sm mt-1">
                Storage
                @if (storageLimitLabel()) {
                  <span class="text-surface-400">
                    / {{ storageLimitLabel() }}</span
                  >
                }
              </div>
            </p-card>
          </a>
        </div>
      } @else {
        <!-- Members: Storage card only -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a routerLink="/storage" class="no-underline">
            <p-card
              styleClass="text-center hover:shadow-md transition-shadow cursor-pointer"
            >
              @if (loadingStorage()) {
                <p-skeleton
                  height="2.25rem"
                  width="6rem"
                  styleClass="mx-auto mb-1"
                />
              } @else {
                <div class="text-3xl font-bold text-primary">
                  {{ storageUsedLabel() }}
                </div>
              }
              <div class="text-surface-500 text-sm mt-1">
                Storage
                @if (storageLimitLabel()) {
                  <span class="text-surface-400">
                    / {{ storageLimitLabel() }}</span
                  >
                }
              </div>
            </p-card>
          </a>
        </div>
      }

      <!-- Upcoming events + Recent activity — side by side on larger screens -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Today's Agenda — all users -->
        <p-card header="Upcoming events" styleClass="h-full">
          @if (loadingAgenda()) {
            <div class="flex flex-col gap-3">
              @for (i of [1, 2, 3]; track i) {
                <p-skeleton height="3rem" />
              }
            </div>
          } @else if (upcomingEvents().length === 0) {
            <p class="text-surface-500 text-sm m-0">No upcoming events.</p>
          } @else {
            <div class="flex flex-col gap-2">
              @for (
                evt of upcomingEvents();
                track evt.eventId + evt.originalStartUtc
              ) {
                <a
                  [routerLink]="['/planning']"
                  [queryParams]="{ eventId: evt.eventId }"
                  class="flex items-start gap-3 p-3 border border-surface-200 rounded-lg no-underline hover:bg-surface-50 transition-colors"
                >
                  <!-- Date badge -->
                  <div
                    class="flex flex-col items-center min-w-10 text-center shrink-0"
                  >
                    <span
                      class="text-xs text-surface-500 uppercase font-semibold leading-none"
                      >{{ evt.startUtc | date: 'MMM' }}</span
                    >
                    <span
                      class="text-2xl font-bold text-primary leading-tight"
                      >{{ evt.startUtc | date: 'd' }}</span
                    >
                  </div>

                  <!-- Details -->
                  <div class="flex flex-col flex-1 min-w-0">
                    <span class="font-medium text-surface-900 truncate">{{
                      evt.title
                    }}</span>
                    <span class="text-xs text-surface-500 mt-0.5">
                      @if (evt.isAllDay) {
                        All day
                      } @else {
                        {{ evt.startUtc | date: 'HH:mm' }} –
                        {{ evt.endUtc | date: 'HH:mm' }}
                      }
                      @if (evt.location) {
                        &nbsp;·&nbsp;{{ evt.location }}
                      }
                    </span>
                  </div>

                  <!-- RSVP badge -->
                  @if (evt.userRsvp) {
                    <p-tag
                      [value]="evt.rsvpLabel"
                      [severity]="evt.rsvpSeverity"
                      styleClass="text-xs shrink-0"
                    />
                  }
                </a>
              }
            </div>
          }
        </p-card>

        <!-- Recent activity — admin/owner only -->
        @if (isAdminOrOwner()) {
          <p-card header="Recent activity" styleClass="h-full">
            @if (loadingActivity()) {
              <div class="flex flex-col gap-2">
                @for (i of [1, 2, 3, 4, 5]; track i) {
                  <p-skeleton height="1.75rem" />
                }
              </div>
            } @else if (recentActivity().length === 0) {
              <p class="text-surface-500 text-sm m-0">No activity yet.</p>
            } @else {
              <div class="flex flex-col divide-y divide-surface-100">
                @for (item of recentActivity(); track item.id) {
                  <div class="flex items-center justify-between py-2 gap-4">
                    <div class="flex flex-col min-w-0">
                      <span
                        class="text-sm font-medium text-surface-800 truncate"
                        >{{ item.label }}</span
                      >
                      @if (item.entityType) {
                        <span class="text-xs text-surface-400">{{
                          item.entityType
                        }}</span>
                      }
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      @if (item.actorRole) {
                        <p-tag
                          [value]="item.actorRole"
                          severity="secondary"
                          styleClass="text-xs"
                        />
                      }
                      <span
                        class="text-xs text-surface-400 whitespace-nowrap"
                        >{{ item.relativeTime }}</span
                      >
                    </div>
                  </div>
                }
              </div>
            }
          </p-card>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly #authStore = inject(AuthStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #membershipsApi = inject(MembershipsApi);
  readonly #membershipsStore = inject(MembershipsStore);
  readonly #billingApi = inject(BillingApi);
  readonly #entsStore = inject(EntitlementsStore);
  readonly #storageApi = inject(StorageApi);
  readonly #activityLogApi = inject(ActivityLogApi);
  readonly #planningApi = inject(PlanningApi);

  readonly memberCount = signal<number | null>(null);
  readonly subscription = signal<SubscriptionResponse | null>(null);
  readonly storageQuota = signal<StorageQuotaResponse | null>(null);
  readonly upcomingEvents = signal<AgendaEvent[]>([]);
  readonly recentActivity = signal<ActivityItem[]>([]);

  readonly loadingMembers = signal(true);
  readonly loadingBilling = signal(true);
  readonly loadingStorage = signal(true);
  readonly loadingAgenda = signal(true);
  readonly loadingActivity = signal(false);

  readonly email = () => this.#authStore.currentUser()?.email ?? '';
  readonly name = () => this.#authStore.currentUser()?.firstName ?? '';

  readonly isAdminOrOwner = computed(() => {
    const role = this.#membershipsStore.currentUserRole();
    return role === 'OWNER' || role === 'ADMIN';
  });

  readonly planLabel = () => {
    const sub = this.subscription();
    if (!sub) return '—';
    const status = sub.billingStatus;
    if (status === 'NONE') return 'Free';
    if (status === 'ACTIVE' || status === 'TRIALING') return 'Pro';
    if (status === 'CANCELED' || status === 'PAUSED') return 'Free';
    return (
      status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ')
    );
  };

  readonly seatCount = () => this.#entsStore.maxSeats();

  readonly storageUsedLabel = computed(() =>
    formatStorageBytes(this.storageQuota()?.storageUsedBytes ?? null),
  );
  readonly storageLimitLabel = computed(() =>
    formatStorageBytes(this.storageQuota()?.storageLimitBytes ?? null),
  );

  ngOnInit(): void {
    const orgId = this.#orgsStore.activeOrgId();
    const userId = this.#authStore.currentUser()?.id ?? '';

    if (!orgId) {
      this.loadingMembers.set(false);
      this.loadingBilling.set(false);
      this.loadingStorage.set(false);
      this.loadingAgenda.set(false);
      return;
    }

    // Members, billing, storage (admin/owner already loads these eagerly in the
    // guard; for members we still call the API to get a fresh count).
    this.#membershipsApi.getMemberships(orgId).subscribe({
      next: (list) => {
        this.memberCount.set(list.length);
        this.loadingMembers.set(false);
      },
      error: () => this.loadingMembers.set(false),
    });

    this.#billingApi.getSubscription(orgId).subscribe({
      next: (sub) => {
        this.subscription.set(sub);
        this.loadingBilling.set(false);
      },
      error: () => this.loadingBilling.set(false),
    });

    this.#storageApi.getStorageQuota().subscribe({
      next: (quota) => {
        this.storageQuota.set(quota);
        this.loadingStorage.set(false);
      },
      error: () => this.loadingStorage.set(false),
    });

    // Upcoming events — next 7 days, limited to events the user is part of.
    const now = new Date();
    const from = now.toISOString();
    const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    this.#planningApi.listEvents(orgId, { from, to }).subscribe({
      next: (occurrences) => {
        const events = occurrences
          .filter(
            (occ) =>
              !occ.isCancelled &&
              (occ.createdByUserId === userId ||
                occ.attendees.some((a) => a.userId === userId)),
          )
          .sort((a, b) => a.startUtc.localeCompare(b.startUtc))
          .slice(0, 3)
          .map((occ) => toAgendaEvent(occ, userId));
        this.upcomingEvents.set(events);
        this.loadingAgenda.set(false);
      },
      error: () => this.loadingAgenda.set(false),
    });

    // Activity log — restricted to OWNER and ADMIN.
    if (this.isAdminOrOwner()) {
      this.loadingActivity.set(true);
      this.#activityLogApi.getActivityLog(orgId, { limit: 5 }).subscribe({
        next: ({ logs }) => {
          this.recentActivity.set(logs.map(toActivityItem));
          this.loadingActivity.set(false);
        },
        error: () => this.loadingActivity.set(false),
      });
    }
  }
}
