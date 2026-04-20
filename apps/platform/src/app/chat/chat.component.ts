import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { AiStore } from '@saas-frontend/ai/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4">
        <h2 class="text-base font-medium text-surface-600 m-0">AI Chat</h2>
        @if (aiStore.hasMessages()) {
          <p-button
            icon="pi pi-plus"
            severity="secondary"
            [text]="true"
            [rounded]="true"
            size="small"
            (click)="aiStore.clearConversation()"
          />
        }
      </div>

      <!-- Messages -->
      <div class="flex-1 min-h-0 overflow-y-auto" #messagesContainer>
        <div class="max-w-3xl mx-auto px-6 py-4 flex flex-col gap-6">
          @if (!aiStore.hasMessages() && !aiStore.loading()) {
            <div
              class="flex flex-col items-center justify-center py-24 text-surface-300 gap-3"
            >
              <i class="pi pi-comments text-5xl"></i>
              <p class="text-sm font-light">Start a conversation</p>
            </div>
          }

          @for (msg of aiStore.messages(); track msg.id) {
            @if (msg.role === 'user') {
              <div class="flex justify-end">
                <div
                  class="bg-surface-200 text-surface-900 rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[80%]"
                >
                  {{ msg.content }}
                </div>
              </div>
            } @else {
              <div class="text-surface-800 text-sm leading-relaxed whitespace-pre-wrap">
                {{ msg.content }}
              </div>
            }
          }

          @if (aiStore.loading()) {
            <div class="text-surface-400 text-sm">
              <i class="pi pi-spin pi-spinner mr-2"></i>Thinking…
            </div>
          }

          @if (aiStore.error()) {
            <div
              class="bg-red-50 text-red-500 rounded-xl px-4 py-2.5 text-sm inline-block"
            >
              <i class="pi pi-exclamation-circle mr-2"></i>Failed to get a
              response. The AI service may not be available yet.
            </div>
          }
        </div>
      </div>

      <!-- Input -->
      <div class="max-w-3xl mx-auto w-full px-6 pb-4 pt-2">
        <div class="bg-surface-50 rounded-2xl border border-surface-200 p-3 flex flex-col gap-2">
          <textarea
            rows="1"
            class="w-full bg-transparent border-none outline-none text-sm resize-none p-0 placeholder:text-surface-400"
            placeholder="Enter a message..."
            [ngModel]="inputValue()"
            (ngModelChange)="inputValue.set($event)"
            (keydown)="onKeydown($event)"
          ></textarea>
          <div class="flex items-center justify-end">
            <p-button
              icon="pi pi-arrow-up"
              [rounded]="true"
              size="small"
              [disabled]="!inputValue().trim() || aiStore.loading()"
              (click)="send()"
            />
          </div>
        </div>
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

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
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
