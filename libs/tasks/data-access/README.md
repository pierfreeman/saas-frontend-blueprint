# @org/tasks/data-access

HTTP client for the background job endpoints (`/tasks/*`).

**Import path**: `@org/tasks/data-access`

---

## Exports

| Symbol                   | Kind    | Description                                       |
| ------------------------ | ------- | ------------------------------------------------- |
| `TasksApi`               | Service | HTTP client for submitting and tracking jobs      |
| `CreateTaskDto`          | Type    | Payload for creating a background job             |
| `CreateHeavyJobResponse` | Type    | `{ jobId: string }` — ID to poll for status       |
| `JobStatus`              | Type    | Job status object: `status`, `progress`, `result` |

---

## `TasksApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`.

### Methods

| Method                | HTTP                    | Description                                          |
| --------------------- | ----------------------- | ---------------------------------------------------- |
| `createHeavyJob(dto)` | `POST /tasks/heavy-job` | Enqueue a background job; returns a `jobId` to track |
| `getJobStatus(jobId)` | `GET /tasks/:jobId`     | Poll for job completion status and result            |

All methods return `Observable<T>`.

### Polling pattern

Long-running background tasks (org export, org deletion) are submitted via the task queue and polled for completion:

```ts
import { TasksApi } from '@org/tasks/data-access';
import { interval, switchMap, takeWhile } from 'rxjs';

providers: [TasksApi, { provide: API_BASE_URL, useValue: environment.apiUrl }];

// Submit and poll
this.#tasksApi
  .createHeavyJob({ type: 'EXPORT', orgId })
  .pipe(
    switchMap(({ jobId }) =>
      interval(2000).pipe(
        switchMap(() => this.#tasksApi.getJobStatus(jobId)),
        takeWhile(
          (s) => s.status === 'PENDING' || s.status === 'RUNNING',
          true,
        ),
      ),
    ),
  )
  .subscribe((status) => {
    if (status.status === 'DONE') {
      /* handle result */
    }
  });
```

---

## File structure

```
src/lib/
  tasks.api.ts        — TasksApi (HTTP)
  tasks.api.types.ts  — type aliases from OpenAPI schema
src/index.ts          — public exports
```
