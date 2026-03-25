# @org/activity-log/data-access

HTTP client for the org activity log endpoint (`/organizations/:orgId/activity-log`).

**Import path**: `@org/activity-log/data-access`

---

## Exports

| Symbol              | Kind    | Description                                                     |
| ------------------- | ------- | --------------------------------------------------------------- |
| `ActivityLogApi`    | Service | HTTP client for fetching paginated activity log                 |
| `ActivityLogParams` | Type    | Query params: `action`, `fromDate`, `toDate`, `limit`, `offset` |
| `ActivityLogList`   | Type    | Paginated response containing log entries                       |

---

## `ActivityLogApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`.

Restricted to `OWNER` and `ADMIN` roles on the backend.

### Methods

| Method                          | HTTP                                     | Description                        |
| ------------------------------- | ---------------------------------------- | ---------------------------------- |
| `getActivityLog(orgId, query?)` | `GET /organizations/:orgId/activity-log` | Paginated, filterable activity log |

### Query parameters

```ts
interface ActivityLogParams {
  action?: string; // Filter by event action type
  fromDate?: string; // ISO 8601 start date
  toDate?: string; // ISO 8601 end date
  limit?: number; // Page size
  offset?: number; // Page offset
}
```

### Usage

```ts
import { ActivityLogApi } from '@org/activity-log/data-access';

providers: [
  ActivityLogApi,
  { provide: API_BASE_URL, useValue: environment.apiUrl },
];

this.#activityLogApi
  .getActivityLog(orgId, { limit: 20, offset: 0 })
  .subscribe((log) => this.log.set(log));
```

---

## File structure

```
src/lib/
  activity-log.api.ts        — ActivityLogApi (HTTP)
  activity-log.api.types.ts  — type aliases from OpenAPI schema
src/index.ts                 — public exports
```
