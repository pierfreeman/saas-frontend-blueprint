import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  StorageApi,
  FileMetadata,
  StorageQuotaResponse,
} from '@saas-frontend/storage/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { StorageComponent } from './storage.component';

const mockFile = (overrides: Partial<FileMetadata> = {}): FileMetadata =>
  ({
    id: 'file-1',
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    size: '1024000',
    status: 'COMPLETED',
    createdAt: '2026-03-29T10:00:00.000Z',
    updatedAt: '2026-03-29T10:00:00.000Z',
    ...overrides,
  }) as FileMetadata;

const mockQuota = (used: number, limit: number): StorageQuotaResponse =>
  ({
    storageUsedBytes: String(used),
    storageLimitBytes: String(limit),
  }) as StorageQuotaResponse;

describe('StorageComponent', () => {
  let component: StorageComponent;
  let storageApiMock: ReturnType<typeof createStorageApiMock>;
  let orgsStoreMock: { activeOrgId: ReturnType<typeof signal<string | null>> };

  function createStorageApiMock() {
    return {
      generateUploadUrl: vi.fn(() =>
        of({
          uploadUrl: 'https://s3.amazonaws.com/upload',
          fileId: 'file-new',
        }),
      ),
      confirmUpload: vi.fn(() => of({ message: 'Upload confirmed' })),
      getDownloadUrl: vi.fn(() =>
        of({ downloadUrl: 'https://s3.amazonaws.com/download' }),
      ),
      listFiles: vi.fn(() => of([mockFile()])),
      deleteFile: vi.fn(() => of(undefined)),
      getStorageQuota: vi.fn(() =>
        of(mockQuota(50 * 1024 * 1024, 100 * 1024 * 1024)),
      ),
      getFile: vi.fn(() => of(mockFile())),
    } as unknown as StorageApi;
  }

  beforeEach(async () => {
    storageApiMock = createStorageApiMock();
    orgsStoreMock = {
      activeOrgId: signal<string | null>('org-1'),
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: StorageApi, useValue: storageApiMock },
        { provide: OrganizationsStore, useValue: orgsStoreMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    component = TestBed.runInInjectionContext(() => new StorageComponent());

    // Wait for initial load triggered by constructor
    await new Promise((r) => setTimeout(r, 0));
  });

  // ── Computed — quota ───────────────────────────────────────────────────────
  describe('usagePercent', () => {
    it('returns 0 when quota is null', () => {
      component.quota.set(null);
      expect(component.usagePercent()).toBe(0);
    });

    it('calculates correct percentage', () => {
      component.quota.set(mockQuota(50 * 1024 * 1024, 100 * 1024 * 1024));
      expect(component.usagePercent()).toBe(50);
    });

    it('caps at 100 when used exceeds limit', () => {
      component.quota.set(mockQuota(150 * 1024 * 1024, 100 * 1024 * 1024));
      expect(component.usagePercent()).toBe(100);
    });
  });

  describe('isNearLimit', () => {
    it('returns true when usagePercent >= 80', () => {
      component.quota.set(mockQuota(85 * 1024 * 1024, 100 * 1024 * 1024));
      expect(component.isNearLimit()).toBe(true);
    });

    it('returns false when usagePercent < 80', () => {
      component.quota.set(mockQuota(70 * 1024 * 1024, 100 * 1024 * 1024));
      expect(component.isNearLimit()).toBe(false);
    });
  });

  describe('isAtLimit', () => {
    it('returns true when usagePercent >= 100', () => {
      component.quota.set(mockQuota(100 * 1024 * 1024, 100 * 1024 * 1024));
      expect(component.isAtLimit()).toBe(true);
    });

    it('returns false when usagePercent < 100', () => {
      component.quota.set(mockQuota(95 * 1024 * 1024, 100 * 1024 * 1024));
      expect(component.isAtLimit()).toBe(false);
    });
  });

  describe('formattedUsed and formattedLimit', () => {
    it('formats bytes correctly', () => {
      component.quota.set(mockQuota(52428800, 104857600)); // 50 MB / 100 MB
      expect(component.formattedUsed()).toBe('50.0 MB');
      expect(component.formattedLimit()).toBe('100.0 MB');
    });
  });

  // ── deleteFile() ───────────────────────────────────────────────────────────
  describe('deleteFile()', () => {
    it('adds file.id to deletingIds during the call', async () => {
      const file = mockFile({ id: 'file-1' });
      component.files.set([file]);

      const deletePromise = component.deleteFile(file);
      expect(component.deletingIds().has('file-1')).toBe(true);

      await deletePromise;
    });

    it('removes file.id from deletingIds after completion', async () => {
      const file = mockFile({ id: 'file-1' });
      component.files.set([file]);

      await component.deleteFile(file);
      expect(component.deletingIds().has('file-1')).toBe(false);
    });

    it('removes file from files list on success', async () => {
      const file = mockFile({ id: 'file-1' });
      component.files.set([file, mockFile({ id: 'file-2' })]);

      await component.deleteFile(file);

      expect(component.files()).toHaveLength(1);
      expect(component.files()[0].id).toBe('file-2');
    });

    it('keeps file in files list on error', async () => {
      storageApiMock.deleteFile = vi.fn(() =>
        throwError(() => new Error('Delete failed')),
      );
      const file = mockFile({ id: 'file-1' });
      component.files.set([file]);

      await component.deleteFile(file);

      expect(component.files()).toHaveLength(1);
      expect(component.files()[0].id).toBe('file-1');
    });

    it('calls getStorageQuota after a successful delete', async () => {
      const file = mockFile({ id: 'file-1' });
      component.files.set([file]);

      await component.deleteFile(file);

      // Initial load + after delete = 2 calls
      expect(storageApiMock.getStorageQuota).toHaveBeenCalled();
    });
  });

  // ── loadMore() ─────────────────────────────────────────────────────────────
  describe('loadMore()', () => {
    it('appends results to files', async () => {
      component.files.set([mockFile({ id: 'file-1' })]);
      storageApiMock.listFiles = vi.fn(() => of([mockFile({ id: 'file-2' })]));

      await component.loadMore();

      expect(component.files()).toHaveLength(2);
      expect(component.files()[0].id).toBe('file-1');
      expect(component.files()[1].id).toBe('file-2');
    });

    it('sets hasMore to true when result length equals PAGE_SIZE', async () => {
      const files = Array.from({ length: 20 }, (_, i) =>
        mockFile({ id: `file-${i}` }),
      );
      storageApiMock.listFiles = vi.fn(() => of(files));

      await component.loadMore();

      expect(component.hasMore()).toBe(true);
    });

    it('sets hasMore to false when result length is less than PAGE_SIZE', async () => {
      const files = Array.from({ length: 10 }, (_, i) =>
        mockFile({ id: `file-${i}` }),
      );
      storageApiMock.listFiles = vi.fn(() => of(files));

      await component.loadMore();

      expect(component.hasMore()).toBe(false);
    });

    it('sets loadingMore to false after completion', async () => {
      await component.loadMore();
      expect(component.loadingMore()).toBe(false);
    });

    it('sets loadingMore to false after error', async () => {
      storageApiMock.listFiles = vi.fn(() =>
        throwError(() => new Error('Load failed')),
      );

      await component.loadMore();
      expect(component.loadingMore()).toBe(false);
    });
  });

  // ── onFileSelected() ───────────────────────────────────────────────────────
  describe('onFileSelected()', () => {
    let mockInput: HTMLInputElement;
    let mockFileObj: File;
    let globalFetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFileObj = new File(['content'], 'test.txt', { type: 'text/plain' });
      mockInput = {
        files: [mockFileObj],
        value: 'test.txt',
      } as unknown as HTMLInputElement;

      globalFetchSpy = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        } as Response),
      );
      global.fetch = globalFetchSpy;
    });

    it('returns early when no file selected', async () => {
      mockInput.files = null;
      await component.onFileSelected(mockInput);

      expect(storageApiMock.generateUploadUrl).not.toHaveBeenCalled();
    });

    it('calls generateUploadUrl with correct parameters', async () => {
      await component.onFileSelected(mockInput);

      expect(storageApiMock.generateUploadUrl).toHaveBeenCalledWith({
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: 7, // 'content'.length
      });
    });

    it('PUTs file to presigned URL', async () => {
      await component.onFileSelected(mockInput);

      expect(globalFetchSpy).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/upload',
        expect.objectContaining({
          method: 'PUT',
          body: mockFileObj,
        }),
      );
    });

    it('calls confirmUpload after successful PUT', async () => {
      await component.onFileSelected(mockInput);

      expect(storageApiMock.confirmUpload).toHaveBeenCalledWith({
        fileId: 'file-new',
      });
    });

    it('resets uploading to false after success', async () => {
      await component.onFileSelected(mockInput);
      expect(component.uploading()).toBe(false);
    });

    it('sets uploadError when PUT fails', async () => {
      globalFetchSpy = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response),
      );
      global.fetch = globalFetchSpy;

      await component.onFileSelected(mockInput);

      expect(component.uploadError()).toBeTruthy();
      expect(component.uploading()).toBe(false);
    });

    it('sets uploadError when generateUploadUrl fails', async () => {
      storageApiMock.generateUploadUrl = vi.fn(() =>
        throwError(() => new Error('URL generation failed')),
      );

      await component.onFileSelected(mockInput);

      expect(component.uploadError()).toBe('URL generation failed');
      expect(component.uploading()).toBe(false);
    });
  });

  // ── downloadFile() ─────────────────────────────────────────────────────────
  describe('downloadFile()', () => {
    let windowOpenSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      windowOpenSpy = vi.fn();
      global.window.open = windowOpenSpy;
    });

    it('calls getDownloadUrl with file id', async () => {
      const file = mockFile({ id: 'file-1' });

      await component.downloadFile(file);

      expect(storageApiMock.getDownloadUrl).toHaveBeenCalledWith('file-1');
    });

    it('opens download URL in new tab', async () => {
      const file = mockFile({ id: 'file-1' });

      await component.downloadFile(file);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/download',
        '_blank',
        'noopener',
      );
    });

    it('silently ignores errors', async () => {
      storageApiMock.getDownloadUrl = vi.fn(() =>
        throwError(() => new Error('Download failed')),
      );
      const file = mockFile({ id: 'file-1' });

      await expect(component.downloadFile(file)).resolves.not.toThrow();
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });

  // ── formatBytes() ──────────────────────────────────────────────────────────
  describe('formatBytes()', () => {
    it('returns — for null', () => {
      expect(component.formatBytes(null)).toBe('—');
    });

    it('returns — for non-numeric string', () => {
      expect(component.formatBytes('abc')).toBe('—');
    });

    it('returns bytes for values < 1024', () => {
      expect(component.formatBytes('512')).toBe('512 B');
    });

    it('returns KB for values < 1 MB', () => {
      expect(component.formatBytes('2048')).toBe('2.0 KB');
    });

    it('returns MB for values < 1 GB', () => {
      expect(component.formatBytes('5242880')).toBe('5.0 MB');
    });

    it('returns GB for values >= 1 GB', () => {
      expect(component.formatBytes('2147483648')).toBe('2.00 GB');
    });
  });

  // ── mimeIcon() ─────────────────────────────────────────────────────────────
  describe('mimeIcon()', () => {
    it('returns pi-file for null', () => {
      expect(component.mimeIcon(null)).toBe('pi pi-file');
    });

    it('returns pi-image for image/* types', () => {
      expect(component.mimeIcon('image/png')).toBe('pi pi-image');
    });

    it('returns pi-video for video/* types', () => {
      expect(component.mimeIcon('video/mp4')).toBe('pi pi-video');
    });

    it('returns pi-volume-up for audio/* types', () => {
      expect(component.mimeIcon('audio/mpeg')).toBe('pi pi-volume-up');
    });

    it('returns pi-file-pdf for pdf types', () => {
      expect(component.mimeIcon('application/pdf')).toBe('pi pi-file-pdf');
    });

    it('returns pi-file-plus for zip types', () => {
      expect(component.mimeIcon('application/zip')).toBe('pi pi-file-plus');
    });

    it('returns pi-file-plus for tar types', () => {
      expect(component.mimeIcon('application/x-tar')).toBe('pi pi-file-plus');
    });

    it('returns pi-file-plus for gzip types', () => {
      expect(component.mimeIcon('application/gzip')).toBe('pi pi-file-plus');
    });

    it('returns pi-table for spreadsheet types', () => {
      expect(
        component.mimeIcon(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).toBe('pi pi-table');
    });

    it('returns pi-table for excel types', () => {
      expect(component.mimeIcon('application/vnd.ms-excel')).toBe(
        'pi pi-table',
      );
    });

    it('returns pi-table for csv types', () => {
      expect(component.mimeIcon('text/csv')).toBe('pi pi-table');
    });

    it('returns pi-file for unknown types', () => {
      expect(component.mimeIcon('text/plain')).toBe('pi pi-file');
    });
  });

  // ── statusSeverity() ───────────────────────────────────────────────────────
  describe('statusSeverity()', () => {
    it('returns success for COMPLETED', () => {
      expect(component.statusSeverity('COMPLETED')).toBe('success');
    });

    it('returns warn for PENDING', () => {
      expect(component.statusSeverity('PENDING')).toBe('warn');
    });

    it('returns secondary for EXPIRED', () => {
      expect(component.statusSeverity('EXPIRED')).toBe('secondary');
    });

    it('returns danger for ABORTED', () => {
      expect(component.statusSeverity('ABORTED')).toBe('danger');
    });
  });
});
