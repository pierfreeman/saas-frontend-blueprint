import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import {
  AdminApi,
  ActivityLogRecord,
  ListActivityQuery,
} from '@saas-frontend/admin/data-access';

const PAGE_SIZE = 30;

@Component({
  selector: 'app-admin-all-activity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    CardModule,
    SkeletonModule,
    PaginatorModule,
    InputTextModule,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-surface-900 m-0">Activity Log</h1>
        <p class="text-surface-500 mt-1 mb-0 text-sm">
          Cross-organization activity feed — {{ total() }} events total
        </p>
      </div>

      <!-- Filters -->
      <p-card>
        <div class="flex flex-wrap gap-3">
          <input
            pInputText
            type="text"
            placeholder="Filter by org ID..."
            class="flex-1 min-w-48"
            [(ngModel)]="orgIdFilter"
            (ngModelChange)="onFilterChange()"
          />
          <input
            pInputText
            type="text"
            placeholder="Filter by action..."
            class="flex-1 min-w-48"
            [(ngModel)]="actionFilter"
            (ngModelChange)="onFilterChange()"
          />
        </div>
      </p-card>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex flex-col gap-2">
          @for (_ of skeletons; track $index) {
            <div
              class="flex items-center gap-3 p-3 border border-surface-200 rounded-lg"
            >
              <p-skeleton width="8rem" height="0.8rem" />
              <p-skeleton width="6rem" height="0.8rem" />
              <p-skeleton width="16rem" height="0.8rem" />
              <p-skeleton width="4rem" height="0.8rem" styleClass="ml-auto" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && logs().length === 0) {
        <p-card>
          <div class="flex flex-col items-center py-12 text-surface-500">
            <span class="pi pi-list text-5xl mb-4 opacity-30"></span>
            <p class="text-lg font-medium">No activity found</p>
          </div>
        </p-card>
      }

      <!-- Log rows -->
      @if (!loading() && logs().length > 0) {
        <div class="flex flex-col gap-1">
          @for (log of logs(); track log.id) {
            <div
              class="flex flex-wrap items-start gap-3 px-4 py-2 border border-surface-100 rounded-lg bg-surface-0 font-mono text-xs"
            >
              <span class="text-surface-400 whitespace-nowrap">
                {{ log.createdAt | date: 'short' }}
              </span>
              <span class="text-surface-400 text-[10px] my-auto">
                {{ log.orgId }}
              </span>
              <span class="font-semibold text-primary-700 flex-shrink-0">
                {{ log.action }}
              </span>
              @if (log.actorRole) {
                <span class="text-surface-500">{{ log.actorRole }}</span>
              }
              @if (log.entityType && log.entityId) {
                <span class="text-surface-400">
                  {{ log.entityType }}:{{ log.entityId }}
                </span>
              }
            </div>
          }
        </div>

        @if (total() > PAGE_SIZE) {
          <p-paginator
            [rows]="PAGE_SIZE"
            [totalRecords]="total()"
            [first]="offset()"
            (onPageChange)="onPageChange($event)"
          />
        }
      }
    </div>
  `,
})
export class AdminAllActivityComponent implements OnInit {
  readonly #api = inject(AdminApi);

  readonly PAGE_SIZE = PAGE_SIZE;
  readonly skeletons = Array(10);

  readonly logs = signal<ActivityLogRecord[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);

  orgIdFilter = '';
  actionFilter = '';

  private filterTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(): void {
    if (this.filterTimeout) clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => {
      this.offset.set(0);
      this.load();
    }, 300);
  }

  onPageChange(event: PaginatorState): void {
    this.offset.set(event.first ?? 0);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const query: ListActivityQuery = {
      limit: PAGE_SIZE,
      offset: this.offset(),
    };
    if (this.orgIdFilter) query.orgId = this.orgIdFilter;
    if (this.actionFilter) query.action = this.actionFilter;

    this.#api.getAllActivity(query).subscribe({
      next: (result) => {
        this.logs.set(result.logs);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
