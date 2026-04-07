import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  Input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import {
  AdminApi,
  ActivityLogRecord,
  ListActivityQuery,
} from '@saas-frontend/admin/data-access';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-activity-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    CardModule,
    SkeletonModule,
    TagModule,
    ButtonModule,
    PaginatorModule,
    InputTextModule,
  ],
  template: `
    <div class="flex flex-col gap-4 pt-4">
      <!-- Filter bar -->
      <div class="flex flex-wrap gap-3">
        <input
          pInputText
          type="text"
          placeholder="Filter by action (e.g. membership.)"
          class="flex-1 min-w-48"
          [(ngModel)]="actionFilter"
          (ngModelChange)="onFilterChange()"
        />
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex flex-col gap-2">
          @for (_ of skeletons; track $index) {
            <div
              class="flex items-center gap-3 p-3 border border-surface-200 rounded-lg"
            >
              <p-skeleton width="8rem" height="1rem" />
              <p-skeleton width="16rem" height="0.8rem" />
              <p-skeleton width="5rem" height="0.8rem" styleClass="ml-auto" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && logs().length === 0) {
        <div class="flex flex-col items-center py-8 text-surface-500">
          <span class="pi pi-list text-4xl mb-3 opacity-30"></span>
          <p>No activity found.</p>
        </div>
      }

      <!-- Log rows -->
      @if (!loading() && logs().length > 0) {
        <div class="flex flex-col gap-2">
          @for (log of logs(); track log.id) {
            <div
              class="flex flex-wrap items-start gap-3 p-3 border border-surface-200 rounded-lg bg-surface-0 font-mono text-xs"
            >
              <!-- Timestamp -->
              <span class="text-surface-400 whitespace-nowrap">
                {{ log.createdAt | date: 'short' }}
              </span>

              <!-- Action -->
              <span
                class="font-semibold text-primary-700 min-w-0 flex-shrink-0"
              >
                {{ log.action }}
              </span>

              <!-- Actor -->
              @if (log.actorId) {
                <span class="text-surface-500"
                  >by {{ log.actorRole ?? 'user' }}</span
                >
              }

              <!-- Entity -->
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
export class AdminActivityTabComponent implements OnInit {
  @Input({ required: true }) orgId!: string;

  readonly #api = inject(AdminApi);

  readonly PAGE_SIZE = PAGE_SIZE;
  readonly skeletons = new Array(8);

  readonly logs = signal<ActivityLogRecord[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);

  actionFilter = '';

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(): void {
    this.offset.set(0);
    this.load();
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
    if (this.actionFilter) query.action = this.actionFilter;

    this.#api.getOrgActivity(this.orgId, query).subscribe({
      next: (result) => {
        this.logs.set(result.logs);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
