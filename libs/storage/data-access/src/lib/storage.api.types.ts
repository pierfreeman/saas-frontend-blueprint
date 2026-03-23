import type { components } from '@org/shared/util-types';

export type GenerateUploadUrlDto =
  components['schemas']['GenerateUploadUrlDto'];
export type ConfirmUploadDto = components['schemas']['ConfirmUploadDto'];

export interface ListFilesParams {
  limit?: number;
  offset?: number;
}

export type UploadUrlResponse = components['schemas']['UploadUrlResponseDto'];
export type ConfirmUploadResponse =
  components['schemas']['ConfirmUploadResponseDto'];
export type DownloadUrlResponse =
  components['schemas']['DownloadUrlResponseDto'];
export type FileMetadata = components['schemas']['FileMetadataResponseDto'];
