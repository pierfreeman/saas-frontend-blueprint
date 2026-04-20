import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AiStore } from '@saas-frontend/ai/data-access';
import type { ChatMessage } from '@saas-frontend/ai/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import type { ApiError } from '@saas-frontend/shared/util-error';
import { describe, expect, it, vi } from 'vitest';
import { ChatComponent } from './chat.component';

// ── Unified setup ─────────────────────────────────────────────────────────────

function setup(opts: {
  orgId?: string | null;
  messages?: ChatMessage[];
  loading?: boolean;
  error?: ApiError | null;
} = {}) {
  const {
    orgId = 'org-1',
    messages = [],
    loading = false,
    error = null,
  } = opts;

  const messagesSignal = signal<ChatMessage[]>(messages);
  const loadingSignal = signal<boolean>(loading);
  const errorSignal = signal<ApiError | null>(error);

  const mockAiStore = {
    messages: messagesSignal,
    loading: loadingSignal,
    error: errorSignal,
    hasMessages: signal(messages.length > 0),
    sendMessage: vi.fn(),
    clearConversation: vi.fn(),
  } as unknown as AiStore;

  const mockOrgsStore = {
    activeOrgId: signal<string | null>(orgId),
  } as unknown as OrganizationsStore;

  TestBed.configureTestingModule({
    imports: [ChatComponent],
    providers: [
      { provide: AiStore, useValue: mockAiStore },
      { provide: OrganizationsStore, useValue: mockOrgsStore },
    ],
  });

  const fixture = TestBed.createComponent(ChatComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, mockAiStore, mockOrgsStore };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ChatComponent', () => {
  describe('initialisation', () => {
    it('creates', () => {
      const { component } = setup();
      expect(component).toBeTruthy();
    });

    it('starts with an empty inputValue', () => {
      const { component } = setup();
      expect(component.inputValue()).toBe('');
    });
  });

  // ── rendering ───────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('shows empty state when there are no messages and not loading', () => {
      const { fixture } = setup();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Start a conversation');
    });

    it('renders user and assistant messages', () => {
      const { fixture } = setup({
        messages: [
          { id: '1', role: 'user', content: 'Hello', createdAt: '2026-01-01T00:00:00Z' },
          { id: '2', role: 'assistant', content: 'Hi there', createdAt: '2026-01-01T00:00:01Z' },
        ],
      });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Hello');
      expect(el.textContent).toContain('Hi there');
    });

    it('shows loading indicator when loading', () => {
      const { fixture } = setup({ loading: true });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Thinking');
    });

    it('shows new-conversation button when messages exist and calls clearConversation on click', () => {
      const { fixture, mockAiStore } = setup({
        messages: [
          { id: '1', role: 'user', content: 'Hello', createdAt: '2026-01-01T00:00:00Z' },
        ],
      });
      // hasMessages should reflect that there are messages
      (mockAiStore.hasMessages as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();
      const btn = (fixture.nativeElement as HTMLElement).querySelector('p-button[icon="pi pi-plus"]');
      expect(btn).toBeTruthy();
      btn?.dispatchEvent(new Event('click', { bubbles: true }));
      fixture.detectChanges();
      expect(mockAiStore.clearConversation).toHaveBeenCalled();
    });

    it('shows error message when error is set', () => {
      const { fixture } = setup({
        error: { message: 'Something went wrong', status: 500 },
      });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Failed to get a response');
    });
  });

  // ── onKeydown() ─────────────────────────────────────────────────────────────

  describe('onKeydown()', () => {
    it('calls send() when Enter is pressed without Shift', () => {
      const { component } = setup();
      const sendSpy = vi.spyOn(component, 'send');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeydown(event);
      expect(sendSpy).toHaveBeenCalled();
    });

    it('calls preventDefault when Enter is pressed without Shift', () => {
      const { component } = setup();
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventSpy = vi.spyOn(event, 'preventDefault');
      component.onKeydown(event);
      expect(preventSpy).toHaveBeenCalled();
    });

    it('does not call send() when Shift+Enter is pressed', () => {
      const { component } = setup();
      const sendSpy = vi.spyOn(component, 'send');
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
      });
      component.onKeydown(event);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('does not call send() for other keys', () => {
      const { component } = setup();
      const sendSpy = vi.spyOn(component, 'send');
      component.onKeydown(new KeyboardEvent('keydown', { key: 'a' }));
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  // ── send() ─────────────────────────────────────────────────────────────────

  describe('send()', () => {
    it('calls aiStore.sendMessage with active orgId and trimmed content', () => {
      const { component, mockAiStore } = setup({ orgId: 'org-42' });
      component.inputValue.set('Hello world');
      component.send();
      expect(mockAiStore.sendMessage).toHaveBeenCalledWith(
        'org-42',
        'Hello world',
      );
    });

    it('trims leading and trailing whitespace before sending', () => {
      const { component, mockAiStore } = setup();
      component.inputValue.set('   padded message   ');
      component.send();
      expect(mockAiStore.sendMessage).toHaveBeenCalledWith(
        'org-1',
        'padded message',
      );
    });

    it('clears inputValue after sending', () => {
      const { component } = setup();
      component.inputValue.set('Hello');
      component.send();
      expect(component.inputValue()).toBe('');
    });

    it('does nothing when input is empty', () => {
      const { component, mockAiStore } = setup();
      component.inputValue.set('');
      component.send();
      expect(mockAiStore.sendMessage).not.toHaveBeenCalled();
    });

    it('does nothing when input is only whitespace', () => {
      const { component, mockAiStore } = setup();
      component.inputValue.set('   \n  \t ');
      component.send();
      expect(mockAiStore.sendMessage).not.toHaveBeenCalled();
    });

    it('does nothing when aiStore is loading', () => {
      const { component, mockAiStore } = setup({ loading: true });
      component.inputValue.set('Hello');
      component.send();
      expect(mockAiStore.sendMessage).not.toHaveBeenCalled();
    });

    it('does not clear inputValue when loading', () => {
      const { component } = setup({ loading: true });
      component.inputValue.set('Hello');
      component.send();
      expect(component.inputValue()).toBe('Hello');
    });

    it('does nothing when there is no active org', () => {
      const { component, mockAiStore } = setup({ orgId: null });
      component.inputValue.set('Hello');
      component.send();
      expect(mockAiStore.sendMessage).not.toHaveBeenCalled();
    });

    it('does not clear inputValue when there is no active org', () => {
      const { component } = setup({ orgId: null });
      component.inputValue.set('Hello');
      component.send();
      expect(component.inputValue()).toBe('Hello');
    });
  });
});
