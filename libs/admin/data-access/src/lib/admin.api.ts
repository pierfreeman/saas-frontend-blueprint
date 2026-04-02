import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ADMIN_API_BASE_URL } from '@saas-frontend/shared/util-types';
import type {
  AdminOrganizationDetail,
  AdminOrganizationListItem,
  PaginatedAdminOrganizationsResult,
  PaginatedAdminMembersResult,
  AdminBillingOverview,
  AdminBillingPortalResponse,
  PaginatedAdminActivityResult,
  OrganizationEntitlements,
  MembershipRole,
  ListOrganizationsQuery,
  ListMembersQuery,
  ListActivityQuery,
} from './admin.api.types';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(ADMIN_API_BASE_URL);

  // ── Organizations ───────────────────────────────────────────────────────────

  getOrganizations(
    query: ListOrganizationsQuery = {},
  ): Observable<PaginatedAdminOrganizationsResult> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.offset != null)
      params = params.set('offset', String(query.offset));
    return this.#http.get<PaginatedAdminOrganizationsResult>(
      `${this.#base}/admin/organizations`,
      { params },
    );
  }

  getOrganizationDetail(orgId: string): Observable<AdminOrganizationDetail> {
    return this.#http.get<AdminOrganizationDetail>(
      `${this.#base}/admin/organizations/${orgId}`,
    );
  }

  // ── Memberships ─────────────────────────────────────────────────────────────

  listMembers(
    orgId: string,
    query: ListMembersQuery = {},
  ): Observable<PaginatedAdminMembersResult> {
    let params = new HttpParams();
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.offset != null)
      params = params.set('offset', String(query.offset));
    return this.#http.get<PaginatedAdminMembersResult>(
      `${this.#base}/admin/organizations/${orgId}/memberships`,
      { params },
    );
  }

  changeRole(
    orgId: string,
    memberId: string,
    newRole: MembershipRole,
  ): Observable<AdminOrganizationListItem> {
    return this.#http.patch<AdminOrganizationListItem>(
      `${this.#base}/admin/organizations/${orgId}/memberships/${memberId}/role`,
      { newRole },
    );
  }

  inviteMember(
    orgId: string,
    email: string,
    role: MembershipRole,
  ): Observable<void> {
    return this.#http.post<void>(
      `${this.#base}/admin/organizations/${orgId}/memberships`,
      { email, role },
    );
  }

  removeMember(orgId: string, memberId: string): Observable<void> {
    return this.#http.delete<void>(
      `${this.#base}/admin/organizations/${orgId}/memberships/${memberId}`,
    );
  }

  // ── Billing ─────────────────────────────────────────────────────────────────

  getBillingOverview(orgId: string): Observable<AdminBillingOverview> {
    return this.#http.get<AdminBillingOverview>(
      `${this.#base}/admin/organizations/${orgId}/billing`,
    );
  }

  getBillingPortalUrl(
    orgId: string,
    returnUrl: string,
  ): Observable<AdminBillingPortalResponse> {
    return this.#http.post<AdminBillingPortalResponse>(
      `${this.#base}/admin/organizations/${orgId}/billing/portal`,
      { returnUrl },
    );
  }

  // ── Activity log ────────────────────────────────────────────────────────────

  getOrgActivity(
    orgId: string,
    query: ListActivityQuery = {},
  ): Observable<PaginatedAdminActivityResult> {
    let params = new HttpParams();
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.offset != null)
      params = params.set('offset', String(query.offset));
    if (query.action) params = params.set('action', query.action);
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);
    return this.#http.get<PaginatedAdminActivityResult>(
      `${this.#base}/admin/organizations/${orgId}/activity-log`,
      { params },
    );
  }

  getAllActivity(
    query: ListActivityQuery = {},
  ): Observable<PaginatedAdminActivityResult> {
    let params = new HttpParams();
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.offset != null)
      params = params.set('offset', String(query.offset));
    if (query.action) params = params.set('action', query.action);
    if (query.orgId) params = params.set('orgId', query.orgId);
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);
    return this.#http.get<PaginatedAdminActivityResult>(
      `${this.#base}/admin/activity-log`,
      { params },
    );
  }

  // ── Entitlements ────────────────────────────────────────────────────────────

  getEntitlements(orgId: string): Observable<OrganizationEntitlements> {
    return this.#http.get<OrganizationEntitlements>(
      `${this.#base}/admin/organizations/${orgId}/entitlements`,
    );
  }

  invalidateEntitlements(orgId: string): Observable<void> {
    return this.#http.post<void>(
      `${this.#base}/admin/organizations/${orgId}/entitlements/invalidate`,
      {},
    );
  }
}
