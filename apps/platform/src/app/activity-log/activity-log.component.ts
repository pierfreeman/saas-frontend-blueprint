import { DatePipe, SlicePipe } from '@angular/common';
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
} from '@org/activity-log/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';
import { EntitlementsStore } from '@org/entitlements/data-access';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

const PAGE_SIZE = 20;

/** Map action prefixes to PrimeNG tag severity + icon. */
function actionMeta(action: string): {
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
  icon: string;
} {
  if (action.startsWith('org.deleted') || action.includes('delete'))
    return { severity: 'danger', icon: 'pi-trash' };
  if (action.includes('cancel') || action.includes('downgrade'))
    return { severity: 'warn', icon: 'pi-exclamation-triangle' };
  if (action.startsWith('org.') || action.startsWith('membership.'))
    return { severity: 'info', icon: 'pi-building' };
  if (
    action.includes('billing') ||
    action.includes('subscription') ||
    action.includes('checkout')
  )
    return { severity: 'success', icon: 'pi-credit-card' };
  return { severity: 'secondary', icon: 'pi-circle' };
}

@Component({
  selector: 'app-activity-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    SlicePipe,
    FormsModule,
    RouterLink,
    CardModule,
    TableModule,
    TagModule,
    InputTextModule,
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
              <label class="text-xs text-surface-500 font-medium"
                >Action filter</label
              >
              <input
                pInputText
                size="small"
                [(ngModel)]="actionFilter"
                placeholder="e.g. membership.role"
                class="w-56"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-surface-500 font-medium"
                >From date</label
              >
              <input
                pInputText
                type="date"
                size="small"
                [(ngModel)]="fromDate"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-surface-500 font-medium"
                >To date</label
              >
              <input pInputText type="date" size="small" [(ngModel)]="toDate" />
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
              styleClass="p-datatable-sm"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 9rem">When</th>
                  <th style="width: 12rem">Action</th>
                  <th style="width: 6rem">Role</th>
                  <th>Entity</th>
                  <th>Metadata</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-row>
                <tr>
                  <!-- Timestamp -->
                  <td class="text-sm text-surface-500 whitespace-nowrap">
                    {{ row.createdAt | date: 'dd MMM yy, HH:mm' }}
                  </td>

                  <!-- Action badge -->
                  <td>
                    <p-tag
                      [value]="row.action"
                      [severity]="actionSeverity(row.action)"
                      [icon]="'pi ' + actionIcon(row.action)"
                      styleClass="text-xs font-mono"
                    />
                  </td>

                  <!-- Role -->
                  <td class="text-sm">
                    @if (row.actorRole) {
                      <span class="text-surface-600">{{ row.actorRole }}</span>
                    } @else {
                      <span class="text-surface-300 italic">system</span>
                    }
                  </td>

                  <!-- Entity -->
                  <td class="text-sm">
                    @if (row.entityType) {
                      <span class="text-surface-700">{{ row.entityType }}</span>
                      @if (row.entityId) {
                        <span
                          class="text-surface-400 font-mono text-xs ml-1"
                          [pTooltip]="row.entityId"
                          tooltipPosition="top"
                        >
                          #{{ row.entityId | slice: 0 : 8 }}…
                        </span>
                      }
                    } @else {
                      <span class="text-surface-300">—</span>
                    }
                  </td>

                  <!-- Metadata -->
                  <td
                    class="text-xs text-surface-500 font-mono max-w-xs truncate"
                  >
                    @if (hasMetadata(row)) {
                      <span
                        [pTooltip]="metadataString(row)"
                        tooltipPosition="top"
                      >
                        {{ metadataString(row) }}
                      </span>
                    } @else {
                      <span class="text-surface-300">—</span>
                    }
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

  readonly canViewActivityLog = this.#ent.canUseAdvancedAnalytics;

  readonly logs = signal<ActivityLogRecord[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);

  readonly pageSize = PAGE_SIZE;
  readonly skeletonRows = Array(8);

  // filter state (v-model)
  actionFilter = '';
  fromDate = '';
  toDate = '';

  // active applied filters
  readonly #activeFilters = signal<{
    action: string;
    fromDate: string;
    toDate: string;
  }>({
    action: '',
    fromDate: '',
    toDate: '',
  });

  readonly #orgId = computed(() => this.#orgsStore.activeOrgId());

  ngOnInit(): void {
    const orgId = this.#orgId();
    if (orgId) void this.#ent.loadEntitlements(orgId);
    this.#load(0);
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.#load(event.first ?? 0);
  }

  applyFilters(): void {
    this.#activeFilters.set({
      action: this.actionFilter.trim(),
      fromDate: this.fromDate,
      toDate: this.toDate,
    });
    this.#load(0);
  }

  resetFilters(): void {
    this.actionFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.#activeFilters.set({ action: '', fromDate: '', toDate: '' });
    this.#load(0);
  }

  actionSeverity(
    action: string,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return actionMeta(action).severity;
  }

  actionIcon(action: string): string {
    return actionMeta(action).icon;
  }

  hasMetadata(row: ActivityLogRecord): boolean {
    return Object.keys(row.metadata ?? {}).length > 0;
  }

  metadataString(row: ActivityLogRecord): string {
    try {
      return JSON.stringify(row.metadata);
    } catch {
      return '';
    }
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
        ...(filters.action ? { action: filters.action } : {}),
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
