import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  AdminApi,
  AdminStorageStats,
  SetFeatureFlagOverridePayload,
} from '@saas-frontend/admin/data-access';

function formatBytes(bytesStr: string): string {
  const bytes = Number(bytesStr);
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

const GB_IN_BYTES = 1_073_741_824;

@Component({
  selector: 'app-admin-storage-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    CardModule,
    SkeletonModule,
    MessageModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <!-- ─── Set Storage Quota Dialog ─── -->
    <p-dialog
      header="Set Storage Quota"
      [modal]="true"
      [(visible)]="showQuotaDialog"
      [style]="{ width: '26rem' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="quotaGb" class="text-sm font-medium text-surface-700">
            Storage Limit (GB)
          </label>
          <p-inputnumber
            inputId="quotaGb"
            [(ngModel)]="quotaGb"
            [min]="1"
            [max]="10000"
            [showButtons]="true"
            suffix=" GB"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="quotaReason" class="text-sm font-medium text-surface-700">
            Reason
          </label>
          <input
            id="quotaReason"
            pInputText
            [(ngModel)]="quotaReason"
            placeholder="e.g. Custom plan agreed with account team"
            class="w-full"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="showQuotaDialog.set(false)"
        />
        <p-button
          label="Set Quota"
          [loading]="savingQuota()"
          [disabled]="!quotaGb() || !quotaReason().trim()"
          (onClick)="submitQuota()"
        />
      </ng-template>
    </p-dialog>

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

      <div class="flex justify-end mt-4">
        <p-button
          label="Set Storage Quota"
          icon="pi pi-cog"
          severity="secondary"
          (onClick)="openQuotaDialog()"
        />
      </div>
    }
  `,
})
export class AdminStorageTabComponent implements OnInit {
  @Input() orgId!: string;

  readonly #api = inject(AdminApi);
  readonly #messageService = inject(MessageService);

  readonly stats = signal<AdminStorageStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Quota dialog
  readonly showQuotaDialog = signal(false);
  readonly quotaGb = signal<number | null>(null);
  readonly quotaReason = signal('');
  readonly savingQuota = signal(false);

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

  openQuotaDialog(): void {
    this.quotaGb.set(null);
    this.quotaReason.set('');
    this.showQuotaDialog.set(true);
  }

  submitQuota(): void {
    const gb = this.quotaGb();
    const reason = this.quotaReason().trim();
    if (!gb || !reason) return;

    const payload: SetFeatureFlagOverridePayload = {
      key: 'storageLimitBytes',
      value: gb * GB_IN_BYTES,
      reason,
    };

    this.savingQuota.set(true);
    this.#api.setFeatureFlagOverride(this.orgId, payload).subscribe({
      next: () => {
        this.savingQuota.set(false);
        this.showQuotaDialog.set(false);
        this.#messageService.add({
          severity: 'success',
          summary: 'Storage quota updated',
          detail: `Quota set to ${gb} GB.`,
        });
      },
      error: () => {
        this.savingQuota.set(false);
        this.#messageService.add({
          severity: 'error',
          summary: 'Could not update storage quota',
        });
      },
    });
  }
}
