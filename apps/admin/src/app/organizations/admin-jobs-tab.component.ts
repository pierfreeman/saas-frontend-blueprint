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
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import {
  AdminApi,
  AdminJobItem,
  JobStatus,
  ListJobsQuery,
} from '@saas-frontend/admin/data-access';

const PAGE_SIZE = 20;

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn' | 'danger';

const JOB_STATUS_SEVERITY: Record<JobStatus, TagSeverity> = {
  PENDING: 'secondary',
  PROCESSING: 'info',
  DONE: 'success',
  FAILED: 'danger',
};

const STATUS_OPTIONS: { label: string; value: JobStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Done', value: 'DONE' },
  { label: 'Failed', value: 'FAILED' },
];

@Component({
  selector: 'app-admin-jobs-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    CardModule,
    SkeletonModule,
    TagModule,
    SelectModule,
    ButtonModule,
    PaginatorModule,
  ],
  template: `
    <div class="flex flex-col gap-4 pt-4">
      <!-- Filter bar -->
      <div class="flex flex-wrap gap-3 items-center">
        <p-select
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by status"
          [(ngModel)]="statusFilter"
          (onChange)="onFilterChange()"
          class="w-44"
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
              <p-skeleton width="10rem" height="0.8rem" />
              <p-skeleton width="5rem" height="1.5rem" borderRadius="1rem" />
              <p-skeleton width="6rem" height="0.8rem" styleClass="ml-auto" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && jobs().length === 0) {
        <div class="flex flex-col items-center py-8 text-surface-500">
          <span class="pi pi-cog text-4xl mb-3 opacity-30"></span>
          <p>No jobs found.</p>
        </div>
      }

      <!-- Job rows -->
      @if (!loading() && jobs().length > 0) {
        <div class="flex flex-col gap-2">
          @for (job of jobs(); track job.id) {
            <div
              class="flex flex-wrap items-start gap-3 p-3 border border-surface-200 rounded-lg bg-surface-0 text-sm"
            >
              <!-- Status badge -->
              <p-tag
                [value]="job.status"
                [severity]="jobStatusSeverity(job.status)"
                [rounded]="true"
              />

              <!-- Type -->
              <span class="font-semibold font-mono text-surface-700">
                {{ job.type }}
              </span>

              <!-- Attempt count -->
              <span class="text-surface-400 text-xs">
                attempt {{ job.attempts }}
              </span>

              <!-- Error -->
              @if (job.error) {
                <span
                  class="text-danger-600 text-xs font-mono truncate max-w-xs"
                >
                  {{ job.error }}
                </span>
              }

              <!-- Timestamp -->
              <span class="text-surface-400 text-xs ml-auto whitespace-nowrap">
                {{ job.createdAt | date: 'short' }}
              </span>
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
export class AdminJobsTabComponent implements OnInit {
  @Input({ required: true }) orgId!: string;

  readonly #api = inject(AdminApi);

  readonly PAGE_SIZE = PAGE_SIZE;
  readonly skeletons = new Array(8);
  readonly statusOptions = STATUS_OPTIONS;

  readonly jobs = signal<AdminJobItem[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);

  statusFilter: JobStatus | null = null;

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

  jobStatusSeverity(status: JobStatus): TagSeverity {
    return JOB_STATUS_SEVERITY[status];
  }

  private load(): void {
    this.loading.set(true);
    const query: ListJobsQuery = {
      limit: PAGE_SIZE,
      offset: this.offset(),
    };
    if (this.statusFilter) query.status = this.statusFilter;

    this.#api.getOrgJobs(this.orgId, query).subscribe({
      next: (result) => {
        this.jobs.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
