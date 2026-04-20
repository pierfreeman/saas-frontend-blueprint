import { Injectable, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type { ChatRequest, SseChunk } from './ai.api.types';

/**
 * Low-level AI API client. Uses `fetch()` instead of `HttpClient` because
 * the backend returns an SSE stream (`text/event-stream`) that Angular's
 * `HttpClient` cannot consume incrementally.
 */
@Injectable({ providedIn: 'root' })
export class AiApi {
  readonly #auth = inject(AuthService);
  readonly #base = inject(API_BASE_URL);

  /**
   * Opens an SSE stream to the AI chat endpoint and yields parsed chunks.
   * The caller is responsible for assembling the full assistant message.
   */
  async *streamChat(
    orgId: string,
    dto: ChatRequest,
  ): AsyncGenerator<SseChunk> {
    const token = await firstValueFrom(
      this.#auth.getAccessTokenSilently(),
    );

    const res = await fetch(
      `${this.#base}/organizations/${orgId}/ai/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-org-id': orgId,
        },
        body: JSON.stringify(dto),
      },
    );

    if (!res.ok) {
      throw { status: res.status, message: res.statusText } as never;
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;

          try {
            yield JSON.parse(payload) as SseChunk;
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
