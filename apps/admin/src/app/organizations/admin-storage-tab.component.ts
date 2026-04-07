import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { AdminApi, AdminStorageStats } from '@saas-frontend/admin/data-access';

function formatBytes(bytesStr: string): string {
  const bytes = Number(bytesStr);
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

@Component({
  selector: 'app-admin-storage-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CardModule, SkeletonModule, MessageModule],
  template: `
    @if (loading()) {
      <div class="grid grid-cols-2 gap-4 mt-4">
        <p-skeleton height="6rem" />
        <p-skeleton height="6rem" />
      </div>
    }

    @if (error()) {
      <p-message class="mt-4" severity="error" [text]="error()!" />
    }

    @if (!loading() && !error() && stats()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <!-- Total files -->
        <p-card>
          <div class="flex items-center gap-4">
            <span class="pi pi-file text-4xl text-primary-500"></span>
            <div>
              <p class="text-sm text-surface-500 m-0">Total files</p>
              <p class="text-3xl font-bold text-surface-900 m-0">
                {{ stats()!.fileCount | number }}
              </p>
            </div>
          </div>
        </p-card>

        <!-- Total storage used -->
        <p-card>
          <div class="flex items-center gap-4">
            <span class="pi pi-database text-4xl text-primary-500"></span>
            <div>
              <p class="text-sm text-surface-500 m-0">Storage used</p>
              <p class="text-3xl font-bold text-surface-900 m-0">
                {{ formattedBytes() }}
              </p>
              <p class="text-xs text-surface-400 m-0 mt-1">
                {{ stats()!.totalBytes }} bytes
              </p>
            </div>
          </div>
        </p-card>
      </div>

      @if (stats()!.fileCount === 0) {
        <p class="text-surface-400 text-center mt-6">
          No confirmed files for this organization.
        </p>
      }
    }
  `,
})
export class AdminStorageTabComponent implements OnInit {
  @Input() orgId!: string;

  readonly #api = inject(AdminApi);

  readonly stats = signal<AdminStorageStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formattedBytes = () => {
    const s = this.stats();
    return s ? formatBytes(s.totalBytes) : '—';
  };

  ngOnInit(): void {
    this.#api.getOrgStorageStats(this.orgId).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load storage stats.');
        this.loading.set(false);
      },
    });
  }
}
