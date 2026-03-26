import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type {
  ActivityLogParams,
  ActivityLogList,
} from './activity-log.api.types';

@Injectable({ providedIn: 'root' })
export class ActivityLogApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  /** GET /organizations/:orgId/activity-log — paginated, filterable. Restricted to OWNER and ADMIN. */
  getActivityLog(
    orgId: string,
    query?: ActivityLogParams,
  ): Observable<ActivityLogList> {
    let params = new HttpParams();
    if (query?.action) params = params.set('action', query.action);
    if (query?.fromDate) params = params.set('fromDate', query.fromDate);
    if (query?.toDate) params = params.set('toDate', query.toDate);
    if (query?.limit !== undefined) params = params.set('limit', query.limit);
    if (query?.offset !== undefined)
      params = params.set('offset', query.offset);
    return this.#http.get<ActivityLogList>(
      `${this.#base}/organizations/${orgId}/activity-log`,
      { params },
    );
  }
}
