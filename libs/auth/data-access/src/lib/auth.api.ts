import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@org/shared/util-types';
import type { User } from './auth.api.types';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  /** GET /auth/me — syncs Auth0 identity with the local DB (upsert) and returns the user profile. */
  getMe(): Observable<User> {
    return this.#http.get<User>(`${this.#base}/auth/me`);
  }
}
