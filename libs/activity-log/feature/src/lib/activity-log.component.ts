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
import { forkJoin } from 'rxjs';
import {
  ActivityLogApi,
  ActivityLogRecord,
  ACTIVITY_LOG_ACTIONS,
  ENTITY_TYPE_OPTIONS,
  ENTITY_TYPE_MAP,
  getActionLabel,
  getActionSeverity,
  getActionIcon,
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

interface ActionGroup {
  label: string;
  items: { label: string; value: string }[];
}

const GROUPED_ACTION_OPTIONS: ActionGroup[] = [
  {
    label: 'Organization',
    items: ACTIVITY_LOG_ACTIONS.filter((a) =>
      a.value.startsWith('organization.'),
    ),
  },
  {
    label: 'Members',
    items: ACTIVITY_LOG_ACTIONS.filter((a) =>
      a.value.startsWith('membership.'),
    ),
  },
  {
    label: 'Users',
    items: ACTIVITY_LOG_ACTIONS.filter((a) => a.value.startsWith('user.')),
  },
  {
    label: 'Billing',
    items: ACTIVITY_LOG_ACTIONS.filter(
      (a) =>
        a.value.startsWith('billing.') ||
        a.value.startsWith('subscription.') ||
        a.value.startsWith('invoice.'),
    ),
  },
  {
    label: 'Planning',
    items: ACTIVITY_LOG_ACTIONS.filter((a) => a.value.startsWith('planning.')),
  },
  {
    label: 'Files',
    items: ACTIVITY_LOG_ACTIONS.filter((a) => a.value.startsWith('file.')),
  },
  {
    label: 'Jobs',
    items: ACTIVITY_LOG_ACTIONS.filter((a) => a.value.startsWith('job.')),
  },
  {
    label: 'Email',
    items: ACTIVITY_LOG_ACTIONS.filter((a) => a.value.startsWith('email.')),
  },
  {
    label: 'Notifications',
    items: ACTIVITY_LOG_ACTIONS.filter((a) =>
      a.value.startsWith('notification.'),
    ),
  },
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
          <div class="flex items-center gap-3">
            <span class="text-sm text-surface-500">
              @if (!loading()) {
                {{ total() }} events
              }
            </span>
            <p-button
              label="Export CSV"
              icon="pi pi-download"
              size="small"
              severity="secondary"
              [loading]="downloadingCsv()"
              [disabled]="total() === 0 || loading()"
              (onClick)="downloadCsv()"
            />
          </div>
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
              <label class="text-xs text-surface-500 font-medium">Actor</label>
              <p-select
                [options]="actorOptions()"
                [(ngModel)]="actorIdFilter"
                optionLabel="label"
                optionValue="value"
                placeholder="All actors"
                [showClear]="true"
                appendTo="body"
                styleClass="w-52"
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
                      <span class="text-surface-700">{{
                        entityTypeLabel(row.entityType)
                      }}</span>
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
  readonly downloadingCsv = signal(false);

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
  actorIdFilter: string | null = null;
  fromDate: Date | null = null;
  toDate: Date | null = null;

  // active applied filters
  readonly #activeFilters = signal<{
    actions: string[];
    entityType: string;
    actorId: string;
    fromDate: string;
    toDate: string;
  }>({
    actions: [],
    entityType: '',
    actorId: '',
    fromDate: '',
    toDate: '',
  });

  readonly #orgId = computed(() => this.#orgsStore.activeOrgId());

  readonly actorOptions = computed(() => {
    const members = this.#membershipsStore.memberships();
    return members
      .filter((m): m is typeof m & { userId: string } => !!m.userId)
      .map((m) => {
        const first = m.user?.firstName?.trim() ?? '';
        const last = m.user?.lastName?.trim() ?? '';
        const fullName = [first, last].filter(Boolean).join(' ').trim();
        const label = fullName || m.user?.email || m.userId;
        return { label, value: m.userId };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  ngOnInit(): void {
    const orgId = this.#orgId();
    if (orgId) {
      this.#ent.loadEntitlements(orgId);
      this.#membershipsStore.loadMemberships(orgId);
    }
    this.#load(0);
  }

  #suppressLazyLoad = false;

  onLazyLoad(event: TableLazyLoadEvent): void {
    if (this.#suppressLazyLoad) return;
    this.#load(event.first ?? 0);
  }

  applyFilters(): void {
    this.#activeFilters.set({
      actions: [...this.selectedActions],
      entityType: this.entityTypeFilter ?? '',
      actorId: this.actorIdFilter ?? '',
      fromDate: this.#toApiDate(this.fromDate),
      toDate: this.#toApiDate(this.toDate),
    });
    this.#load(0);
  }

  resetFilters(): void {
    this.selectedActions = [];
    this.entityTypeFilter = null;
    this.actorIdFilter = null;
    this.fromDate = null;
    this.toDate = null;
    this.#activeFilters.set({
      actions: [],
      entityType: '',
      actorId: '',
      fromDate: '',
      toDate: '',
    });
    this.#load(0);
  }

  actionLabel(action: string): string {
    return getActionLabel(action);
  }

  actionSeverity(
    action: string,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return getActionSeverity(action);
  }

  actionIcon(action: string): string {
    return getActionIcon(action);
  }

  entityTypeLabel(value: string): string {
    return ENTITY_TYPE_MAP.get(value) ?? value;
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

  downloadCsv(): void {
    const orgId = this.#orgId();
    if (!orgId || this.total() === 0) return;

    this.downloadingCsv.set(true);

    const BATCH = 500;
    const total = this.total();
    const pages = Math.ceil(total / BATCH);
    const filters = this.#activeFilters();

    const buildParams = (offset: number) => ({
      limit: BATCH,
      offset,
      ...(filters.actions.length > 0
        ? { actions: filters.actions.join(',') }
        : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
      ...(filters.toDate ? { toDate: filters.toDate } : {}),
    });

    const requests = Array.from({ length: pages }, (_, i) =>
      this.#api.getActivityLog(orgId, buildParams(i * BATCH)),
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const allLogs = results.flatMap((r) => r.logs);
        const csv = this.#buildCsv(allLogs);
        const date = new Date().toISOString().slice(0, 10);
        this.#triggerDownload(csv, `activity-log-${date}.csv`);
        this.downloadingCsv.set(false);
      },
      error: () => {
        this.downloadingCsv.set(false);
      },
    });
  }

  #buildCsv(logs: ActivityLogRecord[]): string {
    const esc = (v: string | null | undefined): string => {
      const s = v ?? '';
      return `"${s.replaceAll('"', '""')}"`;
    };
    const header = [
      'id',
      'created_at',
      'action',
      'action_label',
      'entity_type',
      'entity_id',
      'actor_id',
      'actor_role',
      'metadata',
    ].join(',');
    const rows = logs.map((log) =>
      [
        log.id,
        log.createdAt,
        log.action,
        getActionLabel(log.action),
        log.entityType ?? '',
        log.entityId ?? '',
        log.actorId ?? '',
        log.actorRole ?? '',
        JSON.stringify(log.metadata ?? {}),
      ]
        .map(esc)
        .join(','),
    );
    return [header, ...rows].join('\r\n');
  }

  #triggerDownload(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
    this.#suppressLazyLoad = true;
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
        ...(filters.actorId ? { actorId: filters.actorId } : {}),
        ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
        ...(filters.toDate ? { toDate: filters.toDate } : {}),
      })
      .subscribe({
        next: (result) => {
          this.logs.set(result.logs);
          this.total.set(result.total);
          this.loading.set(false);
          setTimeout(() => {
            this.#suppressLazyLoad = false;
          }, 0);
        },
        error: () => {
          this.loading.set(false);
          setTimeout(() => {
            this.#suppressLazyLoad = false;
          }, 0);
        },
      });
  }
}
