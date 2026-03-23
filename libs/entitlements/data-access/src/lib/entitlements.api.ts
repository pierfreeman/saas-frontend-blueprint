import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@org/shared/util-types';
import type {
  OrganizationEntitlements,
  InvalidateCacheResponse,
} from './entitlements.api.types';

@Injectable({ providedIn: 'root' })
export class EntitlementsApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  getEntitlements(orgId: string): Observable<OrganizationEntitlements> {
    return this.#http.get<OrganizationEntitlements>(
      `${this.#base}/organizations/${orgId}/entitlements`,
    );
  }

  invalidateCache(orgId: string): Observable<InvalidateCacheResponse> {
    return this.#http.post<InvalidateCacheResponse>(
      `${this.#base}/organizations/${orgId}/entitlements/invalidate`,
      {},
    );
  }
}
