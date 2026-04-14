import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type { ChatRequest, ChatResponse } from './ai.api.types';

@Injectable({ providedIn: 'root' })
export class AiApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  sendMessage(orgId: string, dto: ChatRequest): Observable<ChatResponse> {
    return this.#http.post<ChatResponse>(
      `${this.#base}/organizations/${orgId}/ai/chat`,
      dto,
    );
  }
}
