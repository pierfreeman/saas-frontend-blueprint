import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type {
  CreateCheckoutSessionDto,
  CreatePortalSessionDto,
  CancelSubscriptionDto,
  CheckoutSessionResponse,
  PortalSessionResponse,
  SubscriptionResponse,
  CancelSubscriptionResponse,
} from './billing.api.types';

@Injectable({ providedIn: 'root' })
export class BillingApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  createCheckoutSession(
    dto: CreateCheckoutSessionDto,
  ): Observable<CheckoutSessionResponse> {
    return this.#http.post<CheckoutSessionResponse>(
      `${this.#base}/billing/checkout`,
      dto,
    );
  }

  createPortalSession(
    dto: CreatePortalSessionDto,
  ): Observable<PortalSessionResponse> {
    return this.#http.post<PortalSessionResponse>(
      `${this.#base}/billing/portal`,
      dto,
    );
  }

  getSubscription(orgId: string): Observable<SubscriptionResponse> {
    const params = new HttpParams().set('orgId', orgId);
    return this.#http.get<SubscriptionResponse>(
      `${this.#base}/billing/subscription`,
      { params },
    );
  }

  cancelSubscription(
    dto: CancelSubscriptionDto,
  ): Observable<CancelSubscriptionResponse> {
    return this.#http.post<CancelSubscriptionResponse>(
      `${this.#base}/billing/cancel`,
      dto,
    );
  }
}
