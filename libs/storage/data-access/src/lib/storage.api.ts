import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@org/shared/util-types';
import type {
  GenerateUploadUrlDto,
  ConfirmUploadDto,
  ListFilesParams,
  UploadUrlResponse,
  ConfirmUploadResponse,
  DownloadUrlResponse,
  FileMetadata,
} from './storage.api.types';

@Injectable({ providedIn: 'root' })
export class StorageApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  generateUploadUrl(dto: GenerateUploadUrlDto): Observable<UploadUrlResponse> {
    return this.#http.post<UploadUrlResponse>(
      `${this.#base}/files/upload-url`,
      dto,
    );
  }

  confirmUpload(dto: ConfirmUploadDto): Observable<ConfirmUploadResponse> {
    return this.#http.post<ConfirmUploadResponse>(
      `${this.#base}/files/confirm`,
      dto,
    );
  }

  getDownloadUrl(id: string): Observable<DownloadUrlResponse> {
    return this.#http.get<DownloadUrlResponse>(
      `${this.#base}/files/${id}/download`,
    );
  }

  getFile(id: string): Observable<FileMetadata> {
    return this.#http.get<FileMetadata>(`${this.#base}/files/${id}`);
  }

  listFiles(query?: ListFilesParams): Observable<FileMetadata[]> {
    let params = new HttpParams();
    if (query?.limit !== undefined) params = params.set('limit', query.limit);
    if (query?.offset !== undefined)
      params = params.set('offset', query.offset);
    return this.#http.get<FileMetadata[]>(`${this.#base}/files`, { params });
  }

  deleteFile(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/files/${id}`);
  }
}
