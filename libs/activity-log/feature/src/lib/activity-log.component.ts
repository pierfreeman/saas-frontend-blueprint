import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ActivityLogApi,
  ActivityLogRecord,
} from '@saas-frontend/activity-log/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

const PAGE_SIZE = 20;

interface ActionOption {
  label: string;
  value: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
  icon: string;
}

interface ActionGroup {
  label: string;
  items: ActionOption[];
}

const ALL_ACTIONS: ActionOption[] = [
  // Organization
  {
    label: 'Organization created',
    value: 'organization.created',
    severity: 'info',
    icon: 'pi-building',
  },
  {
    label: 'Organization updated',
    value: 'organization.updated',
    severity: 'secondary',
    icon: 'pi-building',
  },
  {
    label: 'Organization deleted',
    value: 'organization.deleted',
    severity: 'danger',
    icon: 'pi-trash',
  },
  {
    label: 'Deletion requested',
    value: 'organization.deletion.requested',
    severity: 'danger',
    icon: 'pi-exclamation-triangle',
  },
  {
    label: 'Export requested',
    value: 'organization.export.requested',
    severity: 'info',
    icon: 'pi-download',
  },
  // Members
  {
    label: 'Member added',
    value: 'membership.created',
    severity: 'info',
    icon: 'pi-user-plus',
  },
  {
    label: 'Role changed',
    value: 'membership.role_changed',
    severity: 'secondary',
    icon: 'pi-pencil',
  },
  {
    label: 'Member removed',
    value: 'membership.deleted',
    severity: 'danger',
    icon: 'pi-user-minus',
  },
  // Users
  {
    label: 'Invite sent',
    value: 'user.created.pending',
    severity: 'info',
    icon: 'pi-send',
  },
  {
    label: 'User provisioned',
    value: 'user.provisioned',
    severity: 'success',
    icon: 'pi-check-circle',
  },
  {
    label: 'User deleted',
    value: 'user.deleted',
    severity: 'danger',
    icon: 'pi-trash',
  },
  // Billing
  {
    label: 'Checkout started',
    value: 'billing.checkout.created',
    severity: 'warn',
    icon: 'pi-shopping-cart',
  },
  {
    label: 'Checkout completed',
    value: 'billing.checkout.completed',
    severity: 'success',
    icon: 'pi-check',
  },
  {
    label: 'Billing portal opened',
    value: 'billing.portal.accessed',
    severity: 'secondary',
    icon: 'pi-external-link',
  },
  {
    label: 'Subscription created',
    value: 'subscription.created',
    severity: 'success',
    icon: 'pi-credit-card',
  },
  {
    label: 'Subscription updated',
    value: 'subscription.updated',
    severity: 'secondary',
    icon: 'pi-refresh',
  },
  {
    label: 'Plan upgraded',
    value: 'subscription.upgraded',
    severity: 'success',
    icon: 'pi-arrow-up',
  },
  {
    label: 'Subscription cancelled',
    value: 'subscription.cancelled',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  {
    label: 'Subscription canceled',
    value: 'subscription.canceled',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  {
    label: 'Subscription reactivated',
    value: 'subscription.reactivated',
    severity: 'success',
    icon: 'pi-replay',
  },
  {
    label: 'Payment succeeded',
    value: 'invoice.payment_succeeded',
    severity: 'success',
    icon: 'pi-check-circle',
  },
  {
    label: 'Payment failed',
    value: 'invoice.payment_failed',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  // Planning
  {
    label: 'Event created',
    value: 'planning.event.created',
    severity: 'info',
    icon: 'pi-calendar-plus',
  },
  {
    label: 'Event updated',
    value: 'planning.event.updated',
    severity: 'secondary',
    icon: 'pi-calendar',
  },
  {
    label: 'Event deleted',
    value: 'planning.event.deleted',
    severity: 'danger',
    icon: 'pi-calendar-times',
  },
  {
    label: 'RSVP updated',
    value: 'planning.event.rsvp',
    severity: 'info',
    icon: 'pi-calendar-clock',
  },
  {
    label: 'Series split',
    value: 'planning.event.series.split',
    severity: 'secondary',
    icon: 'pi-share-alt',
  },
  // Files
  {
    label: 'File uploaded',
    value: 'file.upload.confirmed',
    severity: 'success',
    icon: 'pi-upload',
  },
  {
    label: 'File downloaded',
    value: 'file.download.requested',
    severity: 'secondary',
    icon: 'pi-download',
  },
  {
    label: 'File deleted',
    value: 'file.deleted',
    severity: 'danger',
    icon: 'pi-trash',
  },
  // Jobs
  {
    label: 'Job created',
    value: 'job.created',
    severity: 'info',
    icon: 'pi-send',
  },
  {
    label: 'Job processing',
    value: 'job.processing',
    severity: 'warn',
    icon: 'pi-sync',
  },
  {
    label: 'Job completed',
    value: 'job.completed',
    severity: 'success',
    icon: 'pi-check-circle',
  },
  {
    label: 'Job failed',
    value: 'job.failed',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  // Email
  {
    label: 'Email sent',
    value: 'email.sent',
    severity: 'success',
    icon: 'pi-envelope',
  },
  {
    label: 'Email failed',
    value: 'email.failed',
    severity: 'danger',
    icon: 'pi-envelope',
  },
  // Notifications
  {
    label: 'Notification sent',
    value: 'notification.created',
    severity: 'info',
    icon: 'pi-bell',
  },
];

const ACTION_MAP = new Map<string, ActionOption>(
  ALL_ACTIONS.map((a) => [a.value, a]),
);

const GROUPED_ACTION_OPTIONS: ActionGroup[] = [
  {
    label: 'Organization',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('organization.')),
  },
  {
    label: 'Members',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('membership.')),
  },
  {
    label: 'Users',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('user.')),
  },
  {
    label: 'Billing',
    items: ALL_ACTIONS.filter(
      (a) =>
        a.value.startsWith('billing.') ||
        a.value.startsWith('subscription.') ||
        a.value.startsWith('invoice.'),
    ),
  },
  {
    label: 'Planning',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('planning.')),
  },
  {
    label: 'Files',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('file.')),
  },
  {
    label: 'Jobs',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('job.')),
  },
  {
    label: 'Email',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('email.')),
  },
  {
    label: 'Notifications',
    items: ALL_ACTIONS.filter((a) => a.value.startsWith('notification.')),
  },
];

const ENTITY_TYPE_OPTIONS = [
  { label: 'Organization', value: 'Organization' },
  { label: 'Membership', value: 'Membership' },
  { label: 'User', value: 'User' },
  { label: 'Subscription', value: 'Subscription' },
  { label: 'Invoice', value: 'Invoice' },
  { label: 'Planning Event', value: 'PlanningEvent' },
  { label: 'Job', value: 'Job' },
  { label: 'File', value: 'File' },
  { label: 'Notification', value: 'Notification' },
];

@Component({
  selector: 'app-activity-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    CardModule,
    DatePickerModule,
    MultiSelectModule,
    SelectModule,
    TableModule,
    TagModule,
    ButtonModule,
    SkeletonModule,
    TooltipModule,
  ],
  template: `
    @if (canViewActivityLog()) {
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-surface-900 m-0">Activity Log</h1>
          <span class="text-sm text-surface-500">
            @if (!loading()) {
              {{ total() }} events
            }
          </span>
        </div>

        <!-- Filters -->
        <p-card>
          <div class="flex flex-wrap gap-3 items-end">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-surface-500 font-medium">Action</label>
              <p-multiselect
                [options]="groupedActionOptions"
                [(ngModel)]="selectedActions"
                [group]="true"
                optionLabel="label"
                optionValue="value"
                optionGroupLabel="label"
                optionGroupChildren="items"
                placeholder="All actions"
                appendTo="body"
                styleClass="w-72"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-surface-500 font-medium">Entity</label>
              <p-select
                [options]="entityTypeOptions"
                [(ngModel)]="entityTypeFilter"
                placeholder="All entities"
                [showClear]="true"
                appendTo="body"
                styleClass="w-44"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-surface-500 font-medium"
                >From date</label
              >
              <p-datepicker
                [(ngModel)]="fromDate"
                [showIcon]="true"
                [showButtonBar]="true"
                [showOnFocus]="true"
                [fluid]="true"
                dateFormat="yy-mm-dd"
                appendTo="body"
                [maxDate]="toDate ?? undefined"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-surface-500 font-medium"
                >To date</label
              >
              <p-datepicker
                [(ngModel)]="toDate"
                [showIcon]="true"
                [showButtonBar]="true"
                [showOnFocus]="true"
                [fluid]="true"
                dateFormat="yy-mm-dd"
                appendTo="body"
                [minDate]="fromDate ?? undefined"
              />
            </div>
            <p-button
              label="Apply"
              icon="pi pi-search"
              size="small"
              (onClick)="applyFilters()"
            />
            <p-button
              label="Reset"
              icon="pi pi-times"
              size="small"
              severity="secondary"
              (onClick)="resetFilters()"
            />
          </div>
        </p-card>

        <!-- Table -->
        <p-card [style]="{ padding: '0' }">
          @if (loading() && logs().length === 0) {
            <div class="flex flex-col gap-2 p-4">
              @for (_ of skeletonRows; track $index) {
                <p-skeleton height="2.5rem" />
              }
            </div>
          } @else {
            <p-table
              [value]="logs()"
              [lazy]="true"
              [totalRecords]="total()"
              [rows]="pageSize"
              [paginator]="total() > pageSize"
              [showCurrentPageReport]="true"
              currentPageReportTemplate="{first}–{last} of {totalRecords}"
              [loading]="loading()"
              (onLazyLoad)="onLazyLoad($event)"
              dataKey="id"
              [expandedRowKeys]="expandedRows()"
              styleClass="p-datatable-sm"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 3rem"></th>
                  <th style="width: 9rem">When</th>
                  <th style="width: 16rem">Action</th>
                  <th style="width: 10rem">Actor</th>
                  <th>Entity</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-row let-expanded="expanded">
                <tr>
                  <!-- Row expander -->
                  <td>
                    <button
                      type="button"
                      (click)="toggleExpandedRow(row.id)"
                      class="p-link rounded-full w-7 h-7 inline-flex items-center justify-center text-surface-500 hover:text-surface-700 hover:bg-surface-100"
                    >
                      <i
                        [class]="
                          'pi ' +
                          (expandedRows()[row.id]
                            ? 'pi-chevron-down'
                            : 'pi-chevron-right')
                        "
                      ></i>
                    </button>
                  </td>

                  <!-- Timestamp -->
                  <td class="text-sm text-surface-500 whitespace-nowrap">
                    {{ row.createdAt | date: 'dd MMM yy, HH:mm' }}
                  </td>

                  <!-- Action badge (human-readable label) -->
                  <td>
                    <p-tag
                      [value]="actionLabel(row.action)"
                      [severity]="actionSeverity(row.action)"
                      [icon]="'pi ' + actionIcon(row.action)"
                      styleClass="text-xs"
                    />
                  </td>

                  <!-- Actor -->
                  <td class="text-sm">
                    @if (row.actorRole || row.actorId) {
                      <div class="font-medium text-surface-700">
                        {{ actorDisplay(row) }}
                      </div>
                      @if (row.actorRole) {
                        <div class="text-xs text-surface-400">
                          {{ row.actorRole }}
                        </div>
                      }
                    } @else {
                      <span class="text-surface-300 italic text-xs"
                        >system</span
                      >
                    }
                  </td>

                  <!-- Entity type only -->
                  <td class="text-sm">
                    @if (row.entityType) {
                      <span class="text-surface-700">{{ row.entityType }}</span>
                    } @else {
                      <span class="text-surface-300">—</span>
                    }
                  </td>
                </tr>
              </ng-template>

              <!-- Row expansion: technical details -->
              <ng-template pTemplate="rowexpansion" #expandedrow let-row>
                <tr>
                  <td colspan="5" class="bg-surface-50 px-6 py-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div class="flex flex-col gap-1">
                        <span
                          class="text-xs font-semibold text-surface-400 uppercase tracking-wide"
                          >Event ID</span
                        >
                        <code
                          class="font-mono text-xs text-surface-700 break-all select-all"
                          >{{ row.id }}</code
                        >
                      </div>
                      @if (row.actorId) {
                        <div class="flex flex-col gap-1">
                          <span
                            class="text-xs font-semibold text-surface-400 uppercase tracking-wide"
                            >Actor ID</span
                          >
                          <code
                            class="font-mono text-xs text-surface-700 break-all select-all"
                            >{{ row.actorId }}</code
                          >
                        </div>
                      }
                      @if (row.entityId) {
                        <div class="flex flex-col gap-1">
                          <span
                            class="text-xs font-semibold text-surface-400 uppercase tracking-wide"
                            >Entity ID</span
                          >
                          <code
                            class="font-mono text-xs text-surface-700 break-all select-all"
                            >{{ row.entityId }}</code
                          >
                        </div>
                      }
                      @if (hasMetadata(row)) {
                        <div class="flex flex-col gap-1 sm:col-span-2">
                          <span
                            class="text-xs font-semibold text-surface-400 uppercase tracking-wide"
                            >Metadata</span
                          >
                          <pre
                            class="font-mono text-xs text-surface-700 bg-surface-100 rounded p-3 overflow-auto max-h-40 m-0 whitespace-pre-wrap"
                            >{{ metadataString(row) }}</pre
                          >
                        </div>
                      }
                    </div>
                  </td>
                </tr>
              </ng-template>

              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="5" class="text-center text-surface-400 py-8">
                    No activity log entries found.
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </p-card>
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center gap-4 py-16">
        <i class="pi pi-lock text-5xl text-surface-300"></i>
        <h2 class="text-xl font-semibold text-surface-700 m-0">
          Advanced Analytics
        </h2>
        <p class="text-surface-500 text-center m-0 max-w-sm">
          The Activity Log is available on Pro and Enterprise plans. Upgrade to
          track member actions, billing events, and organisation changes.
        </p>
        <a routerLink="/billing">
          <p-button label="Upgrade Plan" icon="pi pi-arrow-up" />
        </a>
      </div>
    }
  `,
})
export class ActivityLogComponent implements OnInit {
  readonly #api = inject(ActivityLogApi);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #ent = inject(EntitlementsStore);
  readonly #membershipsStore = inject(MembershipsStore);

  readonly canViewActivityLog = this.#ent.canUseAdvancedAnalytics;

  readonly logs = signal<ActivityLogRecord[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);

  readonly pageSize = PAGE_SIZE;
  readonly skeletonRows = new Array(8);

  readonly expandedRows = signal<Record<string, boolean>>({});

  toggleExpandedRow(id: string): void {
    this.expandedRows.update((curr) => {
      const next = { ...curr };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  readonly groupedActionOptions = GROUPED_ACTION_OPTIONS;
  readonly entityTypeOptions = ENTITY_TYPE_OPTIONS;

  // filter state (v-model)
  selectedActions: string[] = [];
  entityTypeFilter: string | null = null;
  fromDate: Date | null = null;
  toDate: Date | null = null;

  // active applied filters
  readonly #activeFilters = signal<{
    actions: string[];
    entityType: string;
    fromDate: string;
    toDate: string;
  }>({
    actions: [],
    entityType: '',
    fromDate: '',
    toDate: '',
  });

  readonly #orgId = computed(() => this.#orgsStore.activeOrgId());

  ngOnInit(): void {
    const orgId = this.#orgId();
    if (orgId) {
      this.#ent.loadEntitlements(orgId);
      this.#membershipsStore.loadMemberships(orgId);
    }
    this.#load(0);
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.#load(event.first ?? 0);
  }

  applyFilters(): void {
    this.#activeFilters.set({
      actions: [...this.selectedActions],
      entityType: this.entityTypeFilter ?? '',
      fromDate: this.#toApiDate(this.fromDate),
      toDate: this.#toApiDate(this.toDate),
    });
    this.#load(0);
  }

  resetFilters(): void {
    this.selectedActions = [];
    this.entityTypeFilter = null;
    this.fromDate = null;
    this.toDate = null;
    this.#activeFilters.set({
      actions: [],
      entityType: '',
      fromDate: '',
      toDate: '',
    });
    this.#load(0);
  }

  actionLabel(action: string): string {
    return ACTION_MAP.get(action)?.label ?? action;
  }

  actionSeverity(
    action: string,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return ACTION_MAP.get(action)?.severity ?? 'secondary';
  }

  actionIcon(action: string): string {
    return ACTION_MAP.get(action)?.icon ?? 'pi-circle';
  }

  hasMetadata(row: ActivityLogRecord): boolean {
    return Object.keys(row.metadata ?? {}).length > 0;
  }

  metadataString(row: ActivityLogRecord): string {
    try {
      return JSON.stringify(row.metadata, null, 2);
    } catch {
      return '';
    }
  }

  actorDisplay(row: ActivityLogRecord): string {
    const actorId = row.actorId;
    if (!actorId) return 'system';

    const member = this.#membershipsStore
      .memberships()
      .find((m) => m.userId === actorId);
    const first = member?.user?.firstName?.trim() ?? '';
    const last = member?.user?.lastName?.trim() ?? '';
    const fullName = [first, last].filter(Boolean).join(' ').trim();

    if (fullName) return fullName;
    if (member?.user?.email) return member.user.email;
    return actorId;
  }

  #toApiDate(value: Date | null): string {
    if (!value) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  #load(offset: number): void {
    const orgId = this.#orgId();
    if (!orgId) return;
    this.loading.set(true);

    const filters = this.#activeFilters();
    this.#api
      .getActivityLog(orgId, {
        limit: PAGE_SIZE,
        offset,
        ...(filters.actions.length > 0
          ? { actions: filters.actions.join(',') }
          : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
        ...(filters.toDate ? { toDate: filters.toDate } : {}),
      })
      .subscribe({
        next: (result) => {
          this.logs.set(result.logs);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
