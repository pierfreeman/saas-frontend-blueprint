import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  viewChild,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { AiStore } from '@saas-frontend/ai/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';

type ChatModel = 'gpt-4o' | 'gpt-5' | 'gpt-5-mini';

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TooltipModule, FormsModule],
  styles: [
    `
      /* Typing dots */
      @keyframes dot {
        0%,
        80%,
        100% {
          opacity: 0.25;
          transform: translateY(0);
        }
        40% {
          opacity: 1;
          transform: translateY(-2px);
        }
      }
      .typing-dot {
        animation: dot 1.2s infinite ease-in-out;
      }
      .typing-dot:nth-child(2) {
        animation-delay: 0.15s;
      }
      .typing-dot:nth-child(3) {
        animation-delay: 0.3s;
      }

      /* Subtle scrollbar */
      .scroll-area::-webkit-scrollbar {
        width: 10px;
      }
      .scroll-area::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 999px;
      }
      .scroll-area:hover::-webkit-scrollbar-thumb {
        background: var(--surface-300, #b9c0cc);
      }

      /* Long URL / unbroken token safety */
      .msg {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      /* Respect motion preferences */
      @media (prefers-reduced-motion: reduce) {
        .typing-dot {
          animation: none;
          opacity: 0.6;
        }
      }
    `,
  ],
  template: `
    <div class="flex flex-col h-full bg-surface-0">
      <!-- Chat header -->
      <header
        class="flex items-center justify-between px-6 h-14 border-b border-surface-100 shrink-0"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <!-- Indigo circle, no icon -->
          <div
            class="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shrink-0"
            aria-hidden="true"
          ></div>
          <div class="flex flex-col leading-tight min-w-0">
            <span class="text-sm font-medium text-surface-900 truncate"
              >AI Chat</span
            >
            <span class="text-[11px] text-surface-400 truncate">
              {{ workspaceLabel() }}
            </span>
          </div>
        </div>
        @if (aiStore.hasMessages()) {
          <button
            type="button"
            class="h-8 px-2.5 rounded-lg text-surface-500 hover:bg-surface-50 text-xs flex items-center gap-1.5 transition-colors"
            (click)="aiStore.clearConversation()"
            pTooltip="New conversation"
            tooltipPosition="left"
          >
            <i class="pi pi-refresh text-[11px]"></i>
            <span>New</span>
          </button>
        }
      </header>

      <!-- Messages -->
      <div class="flex-1 min-h-0 overflow-y-auto scroll-area" #messagesContainer>
        <div
          class="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-7"
        >
          <!-- Empty state -->
          @if (!aiStore.hasMessages() && !aiStore.loading()) {
            <div
              class="flex flex-col items-center justify-center text-center py-16 gap-4"
            >
              <div
                class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600"
                aria-hidden="true"
              ></div>
              <div class="flex flex-col gap-1">
                <p class="text-base font-medium text-surface-900 m-0">
                  How can I help?
                </p>
                <p class="text-sm text-surface-500 m-0">
                  Ask anything about your workspace.
                </p>
              </div>
              <div class="flex flex-wrap gap-2 justify-center max-w-md pt-2">
                @for (prompt of suggestedPrompts; track prompt) {
                  <button
                    type="button"
                    class="text-xs text-surface-700 bg-surface-0 hover:bg-surface-50 border border-surface-200 rounded-full px-3 py-1.5 transition-colors"
                    (click)="usePrompt(prompt)"
                  >
                    {{ prompt }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Messages -->
          @for (msg of aiStore.messages(); track msg.id) {
            @if (msg.role === 'user') {
              <div class="flex justify-end">
                <div
                  class="msg bg-surface-100 text-surface-900 rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap max-w-[85%] sm:max-w-[78%] min-w-0"
                >
                  {{ msg.content }}
                </div>
              </div>
            } @else {
              <div class="flex gap-3 min-w-0 group">
                <!-- Plain gray circle, no icon -->
                <div
                  class="w-7 h-7 rounded-full bg-surface-200 shrink-0 mt-0.5"
                  aria-hidden="true"
                ></div>
                <div class="flex-1 min-w-0">
                  <div
                    class="msg text-surface-900 text-[14px] leading-[1.65] whitespace-pre-wrap"
                  >
                    {{ msg.content }}
                  </div>
                  <div
                    class="flex items-center gap-2 mt-2 text-[11px] text-surface-400 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                  >
                    <button
                      type="button"
                      class="hover:text-surface-700 flex items-center gap-1 transition-colors"
                      (click)="copy(msg.id, msg.content)"
                      [attr.aria-label]="
                        copiedId() === msg.id ? 'Copied' : 'Copy message'
                      "
                    >
                      <i
                        class="pi text-[10px]"
                        [class.pi-check]="copiedId() === msg.id"
                        [class.pi-copy]="copiedId() !== msg.id"
                      ></i>
                      <span>{{
                        copiedId() === msg.id ? 'Copied' : 'Copy'
                      }}</span>
                    </button>
                    <span class="text-surface-200">·</span>
                    <button
                      type="button"
                      class="hover:text-surface-700 transition-colors"
                      aria-label="Good response"
                      (click)="rate(msg.id, 'up')"
                    >
                      <i
                        class="pi text-[11px]"
                        [class.pi-thumbs-up-fill]="ratings()[msg.id] === 'up'"
                        [class.pi-thumbs-up]="ratings()[msg.id] !== 'up'"
                      ></i>
                    </button>
                    <button
                      type="button"
                      class="hover:text-surface-700 transition-colors"
                      aria-label="Bad response"
                      (click)="rate(msg.id, 'down')"
                    >
                      <i
                        class="pi text-[11px]"
                        [class.pi-thumbs-down-fill]="
                          ratings()[msg.id] === 'down'
                        "
                        [class.pi-thumbs-down]="ratings()[msg.id] !== 'down'"
                      ></i>
                    </button>
                  </div>
                </div>
              </div>
            }
          }

          <!-- Typing indicator -->
          @if (showTypingIndicator()) {
            <div class="flex gap-3 min-w-0" aria-live="polite" aria-label="Thinking">
              <div
                class="w-7 h-7 rounded-full bg-surface-200 shrink-0 mt-0.5"
                aria-hidden="true"
              ></div>
              <div class="flex items-center gap-1 pt-2.5">
                <span
                  class="typing-dot w-1.5 h-1.5 rounded-full bg-surface-400"
                ></span>
                <span
                  class="typing-dot w-1.5 h-1.5 rounded-full bg-surface-400"
                ></span>
                <span
                  class="typing-dot w-1.5 h-1.5 rounded-full bg-surface-400"
                ></span>
              </div>
            </div>
          }

          <!-- Error -->
          @if (aiStore.error() && !errorDismissed()) {
            <div
              role="alert"
              class="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-3 py-2.5 text-sm"
            >
              <i class="pi pi-exclamation-circle mt-0.5 shrink-0"></i>
              <span class="flex-1 min-w-0">
                Couldn't get a response. The AI service may not be available
                yet.
              </span>
              <button
                type="button"
                class="text-red-700/60 hover:text-red-700 shrink-0 p-1 -m-1 rounded hover:bg-red-100 transition-colors"
                aria-label="Dismiss error"
                (click)="dismissError()"
              >
                <i class="pi pi-times text-xs"></i>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Composer -->
      <div class="shrink-0">
        <div class="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-4 pt-2">
          <form
            class="bg-surface-0 rounded-2xl border border-surface-200 shadow-sm focus-within:border-surface-400 focus-within:shadow-md transition-all"
            (submit)="$event.preventDefault(); send()"
          >
            <textarea
              #inputEl
              rows="1"
              class="msg w-full bg-transparent border-none outline-none text-[14px] leading-relaxed resize-none px-4 pt-3.5 pb-2 placeholder:text-surface-400 max-h-48 overflow-y-auto"
              placeholder="Ask anything about your workspace…"
              [ngModel]="inputValue()"
              (ngModelChange)="onInput($event)"
              (keydown)="onKeydown($event)"
              name="message"
              aria-label="Message"
              [attr.aria-invalid]="isOverLimit() || null"
            ></textarea>

            <div class="flex items-center justify-between px-2 pb-2 gap-2">
              <!-- LEFT: attach + model picker -->
              <div class="flex items-center gap-1 min-w-0">
                <!-- Hidden file input -->
                <input
                  #fileInput
                  type="file"
                  multiple
                  class="hidden"
                  (change)="onFilesSelected($event)"
                />
                <!-- Attach -->
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-900 flex items-center justify-center shrink-0 transition-colors"
                  (click)="openFileDialog()"
                  pTooltip="Attach file"
                  tooltipPosition="top"
                  aria-label="Attach file"
                >
                  <i class="pi pi-plus text-[13px]"></i>
                </button>

                <!-- Model picker (trigger + menu) -->
                <div class="relative" data-model-picker>
                  <button
                    type="button"
                    class="h-8 px-2 rounded-lg text-surface-700 hover:bg-surface-100 text-xs flex items-center gap-1.5 min-w-0 transition-colors"
                    (click)="toggleModelPicker()"
                    aria-haspopup="listbox"
                    [attr.aria-expanded]="modelPickerOpen()"
                  >
                    <span class="truncate">{{ selectedModel() }}</span>
                    <i
                      class="pi pi-chevron-down text-[10px] shrink-0 text-surface-400"
                    ></i>
                  </button>

                  @if (modelPickerOpen()) {
                    <div
                      class="absolute bottom-full left-0 mb-2 bg-surface-0 border border-surface-200 rounded-xl shadow-lg py-1 min-w-[160px] z-10"
                      role="listbox"
                    >
                      @for (m of models; track m) {
                        <button
                          type="button"
                          role="option"
                          [attr.aria-selected]="selectedModel() === m"
                          class="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-50 flex items-center justify-between"
                          (click)="selectModel(m)"
                        >
                          <span class="text-surface-900">{{ m }}</span>
                          @if (selectedModel() === m) {
                            <i
                              class="pi pi-check text-[10px] text-primary-500"
                            ></i>
                          }
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- RIGHT: submit / stop -->
              @if (aiStore.loading()) {
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg bg-surface-900 hover:bg-surface-700 text-white flex items-center justify-center transition-colors shrink-0"
                  (click)="stop()"
                  pTooltip="Stop"
                  tooltipPosition="left"
                  aria-label="Stop generation"
                >
                  <i class="pi pi-stop-circle text-[14px]"></i>
                </button>
              } @else {
                <button
                  type="submit"
                  class="w-8 h-8 rounded-lg bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                  [disabled]="!canSend()"
                  pTooltip="Send"
                  tooltipPosition="left"
                  aria-label="Send message"
                >
                  <i class="pi pi-arrow-up text-[12px]"></i>
                </button>
              }
            </div>
          </form>

          <p class="text-[11px] text-surface-400 text-center mt-2">
            AI can make mistakes.
            <kbd
              class="px-1 py-0.5 border border-surface-200 rounded text-[10px] font-sans"
              >Enter</kbd
            >
            to send ·
            <kbd
              class="px-1 py-0.5 border border-surface-200 rounded text-[10px] font-sans"
              >Shift+Enter</kbd
            >
            for new line
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ChatComponent {
  readonly aiStore = inject(AiStore);
  readonly #orgsStore = inject(OrganizationsStore);

  // State
  readonly inputValue = signal('');
  readonly copiedId = signal<string | null>(null);
  readonly ratings = signal<Record<string, 'up' | 'down'>>({});
  readonly selectedModel = signal<ChatModel>('gpt-4o');
  readonly modelPickerOpen = signal(false);
  readonly errorDismissed = signal(false);

  readonly maxLength = 4000;
  readonly models: ChatModel[] = ['gpt-4o', 'gpt-5', 'gpt-5-mini'];
  readonly suggestedPrompts = [
    'Summarize my recent activity',
    'Draft a status update',
    'What do I have this week?',
  ];

  // Refs
  readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  readonly inputEl = viewChild<ElementRef<HTMLTextAreaElement>>('inputEl');
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // Derived
  readonly workspaceLabel = computed(
    () => this.#orgsStore.activeOrgName() ?? 'Personal Workspace',
  );
  readonly isOverLimit = computed(
    () => this.inputValue().length > this.maxLength,
  );
  readonly canSend = computed(
    () =>
      this.inputValue().trim().length > 0 &&
      !this.isOverLimit() &&
      !this.aiStore.loading(),
  );
  // BUG: This never returns true because AiStore appends an empty assistant
  // message before setting loading(true), so the last message is always
  // role === 'assistant'. Needs `|| last.content.trim().length === 0`.
  // Will be fixed in the SSE event-handling PR.
  readonly showTypingIndicator = computed(() => {
    if (!this.aiStore.loading()) return false;
    const msgs = this.aiStore.messages();
    const last = msgs[msgs.length - 1];
    return !last || last.role === 'user';
  });

  #copyResetTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Stick to bottom only if user is already near bottom — don't hijack their scroll position.
    effect(() => {
      this.aiStore.messages();
      this.aiStore.loading();
      const el = this.messagesContainer()?.nativeElement;
      if (!el) return;
      requestAnimationFrame(() => {
        const distanceFromBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom < 120) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });

    // Reset the "dismissed" flag whenever a new error arrives, so a fresh error
    // is visible even if the previous one was dismissed.
    effect(() => {
      const err = this.aiStore.error();
      if (err) this.errorDismissed.set(false);
    });
  }

  // --- Input ---------------------------------------------------------------

  onInput(value: string): void {
    this.inputValue.set(value);
    // Defer to next frame so scrollHeight reflects the new content (important
    // for large pastes, which otherwise sometimes leave the textarea one line tall).
    requestAnimationFrame(() => this.autoGrow());
  }

  onKeydown(event: KeyboardEvent): void {
    // Respect IME composition (CJK input) — don't send mid-composition.
    const composing =
      event.isComposing ||
      (event as KeyboardEvent & { keyCode: number }).keyCode === 229;
    if (event.key === 'Enter' && !event.shiftKey && !composing) {
      event.preventDefault();
      this.send();
    }
  }

  usePrompt(text: string): void {
    this.inputValue.set(text);
    requestAnimationFrame(() => {
      const el = this.inputEl()?.nativeElement;
      el?.focus();
      this.autoGrow();
    });
  }

  // --- Actions -------------------------------------------------------------

  send(): void {
    if (!this.canSend()) return;
    const content = this.inputValue().trim();
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;
    this.inputValue.set('');
    this.autoGrow();
    this.aiStore.sendMessage(orgId, content);
  }

  stop(): void {
    // TODO: Wire up once AiStore exposes an abort/cancel method (e.g. AbortController on the SSE stream).
  }

  async copy(id: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedId.set(id);
      clearTimeout(this.#copyResetTimer);
      this.#copyResetTimer = setTimeout(() => this.copiedId.set(null), 1500);
    } catch {
      // Clipboard API fails in insecure contexts — non-critical, swallow.
    }
  }

  rate(id: string, value: 'up' | 'down'): void {
    this.ratings.update((r) => {
      const next = { ...r };
      if (next[id] === value) delete next[id];
      else next[id] = value;
      return next;
    });
    // TODO: forward to aiStore.rateMessage(id, value) when the endpoint exists.
  }

  dismissError(): void {
    this.errorDismissed.set(true);
    // TODO: Call aiStore.clearError() once the store exposes that method.
  }

  // --- Attach --------------------------------------------------------------

  openFileDialog(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;
    // TODO: Hand off to aiStore.attachFiles(...) once the API supports file uploads.
    (event.target as HTMLInputElement).value = '';
  }

  // --- Model picker --------------------------------------------------------

  readonly #destroyRef = inject(DestroyRef);
  #pickerCleanup: (() => void) | null = null;

  toggleModelPicker(): void {
    const opening = !this.modelPickerOpen();
    this.modelPickerOpen.set(opening);

    if (opening) {
      this.#listenForPickerDismiss();
    } else {
      this.#cleanupPickerListeners();
    }
  }

  selectModel(m: ChatModel): void {
    this.selectedModel.set(m);
    this.modelPickerOpen.set(false);
    this.#cleanupPickerListeners();
    // TODO: pass to model constructor / persist to user settings.
  }

  #listenForPickerDismiss(): void {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-model-picker]')) {
        this.modelPickerOpen.set(false);
        this.#cleanupPickerListeners();
      }
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.modelPickerOpen.set(false);
        this.#cleanupPickerListeners();
      }
    };

    // Delay the click listener by a frame so the opening click doesn't
    // immediately close the picker.
    requestAnimationFrame(() => {
      document.addEventListener('click', onClick);
    });
    document.addEventListener('keydown', onKeydown);

    this.#pickerCleanup = () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeydown);
    };

    this.#destroyRef.onDestroy(() => this.#cleanupPickerListeners());
  }

  #cleanupPickerListeners(): void {
    this.#pickerCleanup?.();
    this.#pickerCleanup = null;
  }

  // --- Private -------------------------------------------------------------

  private autoGrow(): void {
    const el = this.inputEl()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    // 192px ≈ max-h-48; keep in sync with the textarea class.
    el.style.height = Math.min(el.scrollHeight, 192) + 'px';
  }
}