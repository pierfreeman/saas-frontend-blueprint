import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AiStore } from '@saas-frontend/ai/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, ButtonModule, InputTextModule],
  template: `
    <div class="flex flex-col h-full p-4 gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-surface-900 m-0">AI Chat</h2>
        @if (aiStore.hasMessages()) {
          <p-button
            label="New conversation"
            icon="pi pi-plus"
            severity="secondary"
            [text]="true"
            (click)="aiStore.clearConversation()"
          />
        }
      </div>

      <!-- Chat area -->
      <p-card class="flex-1 min-h-0">
        <div
          #messagesContainer
          class="flex flex-col gap-3 overflow-y-auto h-full max-h-[calc(100vh-16rem)] p-2"
        >
          @if (!aiStore.hasMessages() && !aiStore.loading()) {
            <div
              class="flex flex-col items-center justify-center h-full text-surface-400 gap-2"
            >
              <i class="pi pi-comments text-4xl"></i>
              <p class="text-sm">Start a conversation with AI</p>
            </div>
          }

          @for (msg of aiStore.messages(); track msg.id) {
            <div
              class="flex"
              [class.justify-end]="msg.role === 'user'"
              [class.justify-start]="msg.role === 'assistant'"
            >
              <div
                class="max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
                [class.bg-primary]="msg.role === 'user'"
                [class.text-primary-contrast]="msg.role === 'user'"
                [class.bg-surface-100]="msg.role === 'assistant'"
                [class.text-surface-900]="msg.role === 'assistant'"
              >
                {{ msg.content }}
              </div>
            </div>
          }

          @if (aiStore.loading()) {
            <div class="flex justify-start">
              <div
                class="bg-surface-100 rounded-2xl px-4 py-2 text-sm text-surface-400"
              >
                <i class="pi pi-spin pi-spinner mr-2"></i>Thinking…
              </div>
            </div>
          }

          @if (aiStore.error()) {
            <div class="flex justify-center">
              <div
                class="bg-red-50 text-red-600 rounded-xl px-4 py-2 text-sm"
              >
                <i class="pi pi-exclamation-circle mr-2"></i>Failed to get a
                response. The AI service may not be available yet.
              </div>
            </div>
          }
        </div>
      </p-card>

      <!-- Input bar -->
      <div class="flex gap-2">
        <input
          pInputText
          class="flex-1"
          placeholder="Type a message…"
          [value]="inputValue()"
          (input)="inputValue.set($any($event.target).value)"
          (keydown.enter)="send()"
        />
        <p-button
          icon="pi pi-send"
          [disabled]="!inputValue().trim() || aiStore.loading()"
          (click)="send()"
        />
      </div>
    </div>
  `,
})
export class ChatComponent {
  readonly aiStore = inject(AiStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly inputValue = signal('');

  readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  constructor() {
    // Auto-scroll to bottom when messages change, unless user has scrolled up.
    effect(() => {
      this.aiStore.messages();
      const el = this.messagesContainer()?.nativeElement;
      if (!el) return;
      requestAnimationFrame(() => {
        const isNearBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (isNearBottom) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  send(): void {
    const content = this.inputValue().trim();
    if (!content || this.aiStore.loading()) return;
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;
    this.inputValue.set('');
    this.aiStore.sendMessage(orgId, content);
  }
}
