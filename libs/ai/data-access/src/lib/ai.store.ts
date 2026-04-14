import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AiApi } from './ai.api';
import type { ChatMessage } from './ai.api.types';
import type { ApiError } from '@saas-frontend/shared/util-error';

@Injectable({ providedIn: 'root' })
export class AiStore {
  readonly #api = inject(AiApi);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<ApiError | null>(null);
  readonly conversationId = signal<string | null>(null);

  readonly hasMessages = computed(() => this.messages().length > 0);

  // ── Methods ────────────────────────────────────────────────────────────────

  async sendMessage(orgId: string, content: string): Promise<void> {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.loading.set(true);
    this.error.set(null);

    try {
      const res = await firstValueFrom(
        this.#api.sendMessage(orgId, {
          message: content,
          conversationId: this.conversationId() ?? undefined,
        }),
      );
      this.conversationId.set(res.conversationId);
      this.messages.update((msgs) => [...msgs, res.message]);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loading.set(false);
    }
  }

  clearConversation(): void {
    this.messages.set([]);
    this.conversationId.set(null);
    this.error.set(null);
    this.loading.set(false);
  }

  /** Called by OrgContextService on org switch to flush tenant-scoped state. */
  flush(): void {
    this.clearConversation();
  }
}
