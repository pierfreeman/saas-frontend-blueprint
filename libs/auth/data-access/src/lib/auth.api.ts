import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type { User } from './auth.api.types';

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  pictureUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  /** GET /auth/me — syncs Auth0 identity with the local DB (upsert) and returns the user profile. */
  getMe(): Observable<User> {
    return this.#http.get<User>(`${this.#base}/auth/me`);
  }

  /** PATCH /auth/me — updates the current user's profile fields. */
  updateMe(dto: UpdateProfileDto): Observable<User> {
    return this.#http.patch<User>(`${this.#base}/auth/me`, dto);
  }

  /** POST /auth/me/change-password — sends a password reset email (database-connection users only). */
  requestPasswordChange(): Observable<void> {
    return this.#http.post<void>(`${this.#base}/auth/me/change-password`, {});
  }
}
