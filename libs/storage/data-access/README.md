# @saas-frontend/storage/data-access

HTTP client for the file storage endpoints (`/files/*`) — presigned upload/download URL flow.

**Import path**: `@saas-frontend/storage/data-access`

---

## Exports

| Symbol                  | Kind    | Description                                         |
| ----------------------- | ------- | --------------------------------------------------- |
| `StorageApi`            | Service | HTTP client for file upload, download, list, delete |
| `GenerateUploadUrlDto`  | Type    | Payload for generating a presigned upload URL       |
| `ConfirmUploadDto`      | Type    | Payload for confirming a completed upload           |
| `ListFilesParams`       | Type    | Query params: `limit`, `offset`                     |
| `UploadUrlResponse`     | Type    | `{ uploadUrl: string; fileId: string }`             |
| `ConfirmUploadResponse` | Type    | Confirmed file metadata                             |
| `DownloadUrlResponse`   | Type    | `{ downloadUrl: string }`                           |
| `FileMetadata`          | Type    | File record shape                                   |

---

## `StorageApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`.

### Upload flow

Files are not uploaded through the backend directly. The backend generates a presigned URL (S3-compatible), the browser uploads directly to storage, then the client confirms the upload:

```
1. generateUploadUrl(dto) → { uploadUrl, fileId }
2. fetch(uploadUrl, { method: 'PUT', body: file })   ← direct to S3
3. confirmUpload({ fileId }) → FileMetadata
```

### Methods

| Method                   | HTTP                      | Description                                     |
| ------------------------ | ------------------------- | ----------------------------------------------- |
| `generateUploadUrl(dto)` | `POST /files/upload-url`  | Generate presigned upload URL + reserve file ID |
| `confirmUpload(dto)`     | `POST /files/confirm`     | Mark file as successfully uploaded              |
| `getDownloadUrl(id)`     | `GET /files/:id/download` | Get a short-lived presigned download URL        |
| `getFile(id)`            | `GET /files/:id`          | Fetch file metadata (no binary content)         |
| `listFiles(query?)`      | `GET /files`              | Paginated list of files accessible to the user  |
| `deleteFile(id)`         | `DELETE /files/:id`       | Permanently delete a file                       |

All methods return `Observable<T>` (or `Observable<void>` for delete).

### Usage

```ts
import { StorageApi } from '@saas-frontend/storage/data-access';

providers: [
  StorageApi,
  { provide: API_BASE_URL, useValue: environment.apiUrl },
];

// Upload a file
this.#storageApi
  .generateUploadUrl({ filename: file.name, contentType: file.type, orgId })
  .pipe(
    switchMap(({ uploadUrl, fileId }) =>
      from(fetch(uploadUrl, { method: 'PUT', body: file })).pipe(
        switchMap(() => this.#storageApi.confirmUpload({ fileId })),
      ),
    ),
  )
  .subscribe((meta) => this.files.update((f) => [...f, meta]));
```

---

## File structure

```
src/lib/
  storage.api.ts        — StorageApi (HTTP)
  storage.api.types.ts  — type aliases from OpenAPI schema
src/index.ts            — public exports
```
