import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  StorageApi,
  FileMetadata,
  StorageQuotaResponse,
} from '@saas-frontend/storage/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

const PAGE_SIZE = 20;

function formatBytes(bytes: string | null): string {
  if (!bytes) return '—';
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1_073_741_824) return `${(n / 1_048_576).toFixed(1)} MB`;
  return `${(n / 1_073_741_824).toFixed(2)} GB`;
}

function mimeIcon(mimeType: string | null): string {
  if (!mimeType) return 'pi pi-file';
  if (mimeType.startsWith('image/')) return 'pi pi-image';
  if (mimeType.startsWith('video/')) return 'pi pi-video';
  if (mimeType.startsWith('audio/')) return 'pi pi-volume-up';
  if (mimeType.includes('pdf')) return 'pi pi-file-pdf';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('gzip')
  )
    return 'pi pi-file-plus';
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv')
  )
    return 'pi pi-table';
  return 'pi pi-file';
}

function statusSeverity(
  status: FileMetadata['status'],
): 'success' | 'warn' | 'secondary' | 'danger' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
      return 'warn';
    case 'EXPIRED':
      return 'secondary';
    case 'ABORTED':
      return 'danger';
  }
}

@Component({
  selector: 'app-storage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    ProgressBarModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
    DatePipe,
    RouterLink,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Page header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-surface-900 m-0">Storage</h1>
        <p-button
          label="Upload file"
          icon="pi pi-upload"
          size="small"
          [loading]="uploading()"
          [disabled]="isAtLimit()"
          (onClick)="fileInput.click()"
        />
        <input
          #fileInput
          type="file"
          class="hidden"
          (change)="onFileSelected(fileInput)"
        />
      </div>

      <!-- Storage quota bar -->
      @if (quota(); as q) {
        <div
          class="p-4 rounded border bg-surface-0"
          [class.border-surface-200]="!isNearLimit()"
          [class.border-orange-300]="isNearLimit() && !isAtLimit()"
          [class.border-red-400]="isAtLimit()"
        >
          <div class="flex items-center justify-between mb-2 text-sm">
            <span class="font-medium text-surface-700">Storage used</span>
            <span class="text-surface-500"
              >{{ formattedUsed() }} / {{ formattedLimit() }}</span
            >
          </div>
          <p-progressBar
            [value]="usagePercent()"
            [showValue]="false"
            styleClass="h-2"
            [style]="{ height: '8px' }"
          />
          @if (isAtLimit()) {
            <div class="mt-2 text-sm text-red-600 flex items-center gap-2">
              <i class="pi pi-exclamation-circle"></i>
              Storage limit reached.
              <a routerLink="/billing" class="underline font-medium"
                >Upgrade your plan</a
              >
              to upload more files.
            </div>
          } @else if (isNearLimit()) {
            <div class="mt-2 text-sm text-orange-600 flex items-center gap-2">
              <i class="pi pi-exclamation-triangle"></i>
              You're using over 80% of your storage quota.
            </div>
          }
        </div>
      } @else if (loadingQuota()) {
        <p-skeleton width="100%" height="4rem" borderRadius="8px" />
      }

      <!-- Upload error -->
      @if (uploadError()) {
        <div
          class="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"
        >
          <i class="pi pi-exclamation-triangle"></i>
          {{ uploadError() }}
        </div>
      }

      <!-- Upload progress indicator -->
      @if (uploading()) {
        <div
          class="p-4 rounded bg-surface-50 border border-surface-200 flex items-center gap-3 text-sm text-surface-600"
        >
          <i class="pi pi-spin pi-spinner text-primary"></i>
          Uploading file…
        </div>
      }

      <!-- File list -->
      <div class="flex flex-col gap-1">
        @if (loading()) {
          @for (_ of skeletonRows; track $index) {
            <div
              class="flex items-center gap-3 p-3 rounded border border-surface-200 bg-surface-0"
            >
              <p-skeleton shape="circle" size="2rem" />
              <p-skeleton width="40%" height="1rem" />
              <p-skeleton width="8%" height="1rem" />
              <p-skeleton width="15%" height="1rem" />
              <p-skeleton width="10%" height="1.5rem" borderRadius="12px" />
              <p-skeleton width="12%" height="1rem" />
            </div>
          }
        } @else if (files().length === 0) {
          <div
            class="p-12 text-center text-surface-400 border border-dashed border-surface-300 rounded"
          >
            <i class="pi pi-folder-open text-4xl mb-3 block"></i>
            <p class="m-0 font-medium">No files uploaded yet</p>
            <p class="m-0 text-sm mt-1">
              Click "Upload file" to add your first file.
            </p>
          </div>
        } @else {
          @for (file of files(); track file.id) {
            <div
              class="flex items-center gap-3 p-3 rounded border border-surface-200 bg-surface-0 hover:bg-surface-50 transition-colors"
            >
              <!-- MIME icon -->
              <i
                [class]="
                  mimeIcon(file.mimeType) +
                  ' text-lg text-surface-400 w-8 text-center shrink-0'
                "
              ></i>

              <!-- Filename -->
              <span
                class="flex-1 text-sm font-medium text-surface-800 truncate min-w-0"
                [pTooltip]="file.filename"
                tooltipPosition="top"
              >
                {{ file.filename }}
              </span>

              <!-- Size -->
              <span class="text-xs text-surface-500 w-20 text-right shrink-0">
                {{ formatBytes(file.size) }}
              </span>

              <!-- MIME type label -->
              <span
                class="text-xs text-surface-400 w-32 truncate shrink-0 hidden md:block"
              >
                {{ file.mimeType ?? '—' }}
              </span>

              <!-- Status badge -->
              <p-tag
                [value]="file.status"
                [severity]="statusSeverity(file.status)"
                class="shrink-0"
              />

              <!-- Date -->
              <span
                class="text-xs text-surface-400 w-28 shrink-0 hidden sm:block"
              >
                {{ file.createdAt | date: 'dd MMM yyyy' }}
              </span>

              <!-- Actions -->
              <div class="flex items-center gap-1 shrink-0">
                <p-button
                  icon="pi pi-download"
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  size="small"
                  pTooltip="Download"
                  tooltipPosition="top"
                  [disabled]="file.status !== 'COMPLETED'"
                  (onClick)="downloadFile(file)"
                />
                <p-button
                  icon="pi pi-trash"
                  [text]="true"
                  [rounded]="true"
                  severity="danger"
                  size="small"
                  pTooltip="Delete"
                  tooltipPosition="top"
                  [loading]="deletingIds().has(file.id)"
                  (onClick)="deleteFile(file)"
                />
              </div>
            </div>
          }

          <!-- Load more -->
          @if (hasMore()) {
            <div class="flex justify-center pt-4">
              <p-button
                label="Load more"
                icon="pi pi-chevron-down"
                [text]="true"
                severity="secondary"
                [loading]="loadingMore()"
                (onClick)="loadMore()"
              />
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class StorageComponent {
  readonly #storageApi = inject(StorageApi);
  readonly #orgsStore = inject(OrganizationsStore);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly loadingQuota = signal(true);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly files = signal<FileMetadata[]>([]);
  readonly quota = signal<StorageQuotaResponse | null>(null);
  readonly hasMore = signal(false);
  readonly deletingIds = signal<Set<string>>(new Set());

  // ── Quota computed ─────────────────────────────────────────────────────────
  readonly usagePercent = computed<number>(() => {
    const q = this.quota();
    if (!q || !q.storageLimitBytes) return 0;
    const used = Number(q.storageUsedBytes);
    const limit = Number(q.storageLimitBytes);
    return limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  });
  readonly isNearLimit = computed(() => this.usagePercent() >= 80);
  readonly isAtLimit = computed(() => this.usagePercent() >= 100);
  readonly formattedUsed = computed(() =>
    formatBytes(this.quota()?.storageUsedBytes ?? null),
  );
  readonly formattedLimit = computed(() =>
    formatBytes(this.quota()?.storageLimitBytes ?? null),
  );

  readonly skeletonRows = Array(5);

  #offset = 0;

  // Reload file list whenever the active org changes.
  constructor() {
    toObservable(this.#orgsStore.activeOrgId)
      .pipe(filter(Boolean), takeUntilDestroyed())
      .subscribe(() => this.#resetAndLoad());
  }

  // Expose pure helpers to the template.
  readonly formatBytes = formatBytes;
  readonly mimeIcon = mimeIcon;
  readonly statusSeverity = statusSeverity;

  /** Called when the user picks a file from the OS file picker. */
  async onFileSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    // Reset value so the same file can be re-selected after an error.
    input.value = '';

    this.uploading.set(true);
    this.uploadError.set(null);

    try {
      // 1. Get a presigned upload URL from our backend.
      const res = await firstValueFrom(
        this.#storageApi.generateUploadUrl({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      );

      // 2. PUT the file directly to the presigned URL.
      //    Using fetch() bypasses Angular interceptors (no Auth header on S3).
      const putRes = await fetch(res.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      // 3. Confirm the upload with the backend so it marks the file COMPLETED.
      await firstValueFrom(
        this.#storageApi.confirmUpload({ fileId: res.fileId }),
      );

      // 4. Refresh the list and quota.
      await this.#resetAndLoad();
    } catch (err) {
      this.uploadError.set(
        err instanceof Error ? err.message : 'Upload failed',
      );
    } finally {
      this.uploading.set(false);
    }
  }

  /** Opens the file's presigned download URL in a new tab. */
  async downloadFile(file: FileMetadata): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.#storageApi.getDownloadUrl(file.id),
      );
      window.open(res.downloadUrl, '_blank', 'noopener');
    } catch {
      // Silently ignore — user can retry.
    }
  }

  /** Deletes a file and removes it from the list optimistically. */
  async deleteFile(file: FileMetadata): Promise<void> {
    this.deletingIds.update((s) => new Set([...s, file.id]));
    try {
      await firstValueFrom(this.#storageApi.deleteFile(file.id));
      this.files.update((list) => list.filter((f) => f.id !== file.id));
      // Refresh quota to reflect freed storage.
      void this.#loadQuota();
    } catch {
      // Keep the file in the list on error.
    } finally {
      this.deletingIds.update((s) => {
        const next = new Set(s);
        next.delete(file.id);
        return next;
      });
    }
  }

  /** Appends the next page of files. */
  async loadMore(): Promise<void> {
    this.loadingMore.set(true);
    try {
      const result = await firstValueFrom(
        this.#storageApi.listFiles({ limit: PAGE_SIZE, offset: this.#offset }),
      );
      this.hasMore.set(result.length === PAGE_SIZE);
      this.files.update((list) => [...list, ...result]);
      this.#offset += result.length;
    } catch {
      // Silently ignore.
    } finally {
      this.loadingMore.set(false);
    }
  }

  async #resetAndLoad(): Promise<void> {
    this.#offset = 0;
    this.loading.set(true);
    this.files.set([]);
    try {
      const [result] = await Promise.all([
        firstValueFrom(
          this.#storageApi.listFiles({ limit: PAGE_SIZE, offset: 0 }),
        ),
        this.#loadQuota(),
      ]);
      this.hasMore.set(result.length === PAGE_SIZE);
      this.files.set(result);
      this.#offset = result.length;
    } catch {
      // Silently ignore.
    } finally {
      this.loading.set(false);
    }
  }

  async #loadQuota(): Promise<void> {
    this.loadingQuota.set(true);
    try {
      const q = await firstValueFrom(this.#storageApi.getStorageQuota());
      this.quota.set(q);
    } catch {
      // Quota is informational; silently ignore errors.
    } finally {
      this.loadingQuota.set(false);
    }
  }
}
