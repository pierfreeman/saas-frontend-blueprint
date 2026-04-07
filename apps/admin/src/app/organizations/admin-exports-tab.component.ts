import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  Input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import {
  AdminApi,
  AdminExportItem,
  ExportStatus,
} from '@saas-frontend/admin/data-access';

const PAGE_SIZE = 10;

type TagSeverity = 'success' | 'info' | 'secondary' | 'warn' | 'danger';

const EXPORT_STATUS_SEVERITY: Record<ExportStatus, TagSeverity> = {
  PENDING: 'secondary',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
};

@Component({
  selector: 'app-admin-exports-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CardModule,
    SkeletonModule,
    TagModule,
    ButtonModule,
    PaginatorModule,
  ],
  template: `
    <div class="flex flex-col gap-4 pt-4">
      <!-- Trigger button -->
      <div class="flex justify-end">
        <p-button
          label="Trigger Export"
          icon="pi pi-download"
          [loading]="triggering()"
          (onClick)="triggerExport()"
        />
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex flex-col gap-2">
          @for (_ of skeletons; track $index) {
            <div
              class="flex items-center gap-3 p-3 border border-surface-200 rounded-lg"
            >
              <p-skeleton width="7rem" height="1.5rem" borderRadius="1rem" />
              <p-skeleton width="12rem" height="0.8rem" />
              <p-skeleton width="8rem" height="0.8rem" styleClass="ml-auto" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && exports().length === 0) {
        <div class="flex flex-col items-center py-8 text-surface-500">
          <span class="pi pi-download text-4xl mb-3 opacity-30"></span>
          <p>No exports found.</p>
        </div>
      }

      <!-- Export rows -->
      @if (!loading() && exports().length > 0) {
        <div class="flex flex-col gap-2">
          @for (exp of exports(); track exp.id) {
            <div
              class="flex flex-wrap items-start gap-3 p-3 border border-surface-200 rounded-lg bg-surface-0 text-sm"
            >
              <!-- Status badge -->
              <p-tag
                [value]="exp.status"
                [severity]="exportStatusSeverity(exp.status)"
                [rounded]="true"
              />

              <!-- Export ID -->
              <span
                class="font-mono text-xs text-surface-500 truncate max-w-xs"
              >
                {{ exp.id }}
              </span>

              <!-- Requested by -->
              <span class="text-surface-400 text-xs">
                by {{ exp.requestedByUserId }}
              </span>

              <!-- Download link -->
              @if (exp.status === 'COMPLETED' && exp.fileUrl) {
                <a
                  [href]="exp.fileUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary-600 text-xs underline ml-1"
                >
                  Download
                </a>
              }

              <!-- Error -->
              @if (exp.error) {
                <span
                  class="text-danger-600 text-xs font-mono truncate max-w-xs"
                >
                  {{ exp.error }}
                </span>
              }

              <!-- Timestamp -->
              <span class="text-surface-400 text-xs ml-auto whitespace-nowrap">
                {{ exp.createdAt | date: 'short' }}
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
export class AdminExportsTabComponent implements OnInit {
  @Input({ required: true }) orgId!: string;

  readonly #api = inject(AdminApi);

  readonly PAGE_SIZE = PAGE_SIZE;
  readonly skeletons = new Array(5);

  readonly exports = signal<AdminExportItem[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);
  readonly triggering = signal(false);

  ngOnInit(): void {
    this.load();
  }

  onPageChange(event: PaginatorState): void {
    this.offset.set(event.first ?? 0);
    this.load();
  }

  triggerExport(): void {
    this.triggering.set(true);
    this.#api.triggerExport(this.orgId).subscribe({
      next: () => {
        this.triggering.set(false);
        this.offset.set(0);
        this.load();
      },
      error: () => this.triggering.set(false),
    });
  }

  exportStatusSeverity(status: ExportStatus): TagSeverity {
    return EXPORT_STATUS_SEVERITY[status];
  }

  private load(): void {
    this.loading.set(true);
    this.#api
      .listOrgExports(this.orgId, { limit: PAGE_SIZE, offset: this.offset() })
      .subscribe({
        next: (result) => {
          this.exports.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
