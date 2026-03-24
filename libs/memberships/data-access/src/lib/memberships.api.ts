import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@org/shared/util-types';
import type {
  CreateMembershipDto,
  UpdateMembershipDto,
  Membership,
  MembershipSummary,
  DeleteMembershipResponse,
  InviteMemberDto,
  InviteMemberResponse,
} from './memberships.api.types';

@Injectable({ providedIn: 'root' })
export class MembershipsApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  getMemberships(orgId: string): Observable<MembershipSummary[]> {
    return this.#http.get<MembershipSummary[]>(
      `${this.#base}/organizations/${orgId}/memberships`,
    );
  }

  createMembership(
    orgId: string,
    dto: CreateMembershipDto,
  ): Observable<Membership> {
    return this.#http.post<Membership>(
      `${this.#base}/organizations/${orgId}/memberships`,
      dto,
    );
  }

  updateMembership(
    orgId: string,
    id: string,
    dto: UpdateMembershipDto,
  ): Observable<MembershipSummary> {
    return this.#http.patch<MembershipSummary>(
      `${this.#base}/organizations/${orgId}/memberships/${id}`,
      dto,
    );
  }

  deleteMembership(
    orgId: string,
    id: string,
  ): Observable<DeleteMembershipResponse> {
    return this.#http.delete<DeleteMembershipResponse>(
      `${this.#base}/organizations/${orgId}/memberships/${id}`,
    );
  }

  inviteMember(
    orgId: string,
    dto: InviteMemberDto,
  ): Observable<InviteMemberResponse> {
    return this.#http.post<InviteMemberResponse>(
      `${this.#base}/organizations/${orgId}/memberships/invite`,
      dto,
    );
  }
}
