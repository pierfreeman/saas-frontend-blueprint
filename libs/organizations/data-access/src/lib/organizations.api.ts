import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@org/shared/util-types';
import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  Organization,
  OrganizationSummary,
  RequestDeletionResponse,
  RequestExportResponse,
} from './organizations.api.types';

@Injectable({ providedIn: 'root' })
export class OrganizationsApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  getOrganizations(): Observable<OrganizationSummary[]> {
    return this.#http.get<OrganizationSummary[]>(`${this.#base}/organizations`);
  }

  getOrganization(id: string): Observable<Organization> {
    return this.#http.get<Organization>(`${this.#base}/organizations/${id}`);
  }

  createOrganization(dto: CreateOrganizationDto): Observable<Organization> {
    return this.#http.post<Organization>(`${this.#base}/organizations`, dto);
  }

  updateOrganization(
    id: string,
    dto: UpdateOrganizationDto,
  ): Observable<Organization> {
    return this.#http.patch<Organization>(
      `${this.#base}/organizations/${id}`,
      dto,
    );
  }

  requestDeletion(id: string): Observable<RequestDeletionResponse> {
    return this.#http.post<RequestDeletionResponse>(
      `${this.#base}/organizations/${id}/delete`,
      null,
    );
  }

  requestExport(id: string): Observable<RequestExportResponse> {
    return this.#http.post<RequestExportResponse>(
      `${this.#base}/organizations/${id}/export`,
      null,
    );
  }
}
