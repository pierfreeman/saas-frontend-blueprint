import { Injectable, inject, signal, computed } from '@angular/core';
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

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    this.messages.update((msgs) => [...msgs, userMsg, assistantMsg]);
    this.loading.set(true);
    this.error.set(null);

    try {
      const stream = this.#api.streamChat(orgId, {
        message: content,
        conversationId: this.conversationId() ?? undefined,
      });

      for await (const chunk of stream) {
        if (chunk.error) {
          throw { status: 500, message: chunk.error };
        }
        if (chunk.content) {
          this.#appendToLastAssistantMessage(chunk.content);
        }
      }
    } catch (err) {
      this.error.set(err as ApiError);
      this.#removeEmptyAssistantMessage();
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

  #appendToLastAssistantMessage(text: string): void {
    this.messages.update((msgs) => {
      const updated = [...msgs];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant') {
        updated[updated.length - 1] = {
          ...last,
          content: last.content + text,
        };
      }
      return updated;
    });
  }

  #removeEmptyAssistantMessage(): void {
    this.messages.update((msgs) => {
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant' && !last.content) {
        return msgs.slice(0, -1);
      }
      return msgs;
    });
  }
}
