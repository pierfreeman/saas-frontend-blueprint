import type { Components } from '@saas-frontend/shared/util-types';

export type GenerateUploadUrlDto =
  Components['schemas']['GenerateUploadUrlDto'];
export type ConfirmUploadDto = Components['schemas']['ConfirmUploadDto'];

export interface ListFilesParams {
  limit?: number;
  offset?: number;
}

export type UploadUrlResponse = Components['schemas']['UploadUrlResponseDto'];
export type ConfirmUploadResponse =
  Components['schemas']['ConfirmUploadResponseDto'];
export type DownloadUrlResponse =
  Components['schemas']['DownloadUrlResponseDto'];
export type FileMetadata = Components['schemas']['FileMetadataResponseDto'];

/**
 * Response from GET /files/quota.
 * BigInt fields are serialized as strings by the backend to preserve precision.
 */
export interface StorageQuotaResponse {
  /** Total storage quota in bytes (string). Null if unlimited. */
  storageLimitBytes: string | null;
  /** Current storage used in bytes (string). */
  storageUsedBytes: string;
  /** Number of files in the organization. */
  fileCount: number;
  /** Maximum allowed file count. Null if unlimited. */
  fileCountLimit: number | null;
  /** Maximum allowed size per individual file, in bytes (string). */
  maxFileSizeBytes: string;
}
