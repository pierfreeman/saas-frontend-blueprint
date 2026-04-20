import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AiStore } from './ai.store';
import { AiApi } from './ai.api';
import type { SseChunk } from './ai.api.types';

const ORG_ID = 'org-1';

async function* makeStream(chunks: SseChunk[]): AsyncGenerator<SseChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

async function* makeThrowingStream(
  chunks: SseChunk[],
  err: unknown,
): AsyncGenerator<SseChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
  throw err;
}

function makeMockApi(overrides: Record<string, unknown> = {}) {
  return {
    streamChat: vi.fn(() => makeStream([{ content: 'Hi' }])),
    ...overrides,
  } as unknown as AiApi;
}

describe('AiStore', () => {
  let store: AiStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AiApi, useValue: makeMockApi() }],
    });
    store = TestBed.inject(AiStore);
  });

  // ── Initial state ──────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('starts with an empty messages array', () => {
      expect(store.messages()).toEqual([]);
    });

    it('starts with loading false', () => {
      expect(store.loading()).toBe(false);
    });

    it('starts with null error', () => {
      expect(store.error()).toBeNull();
    });

    it('hasMessages() returns false when no messages', () => {
      expect(store.hasMessages()).toBe(false);
    });
  });

  // ── hasMessages() ──────────────────────────────────────────────────────────
  describe('hasMessages()', () => {
    it('returns true after a message is added', async () => {
      await store.sendMessage(ORG_ID, 'Hello');
      expect(store.hasMessages()).toBe(true);
    });
  });

  // ── sendMessage() ──────────────────────────────────────────────────────────
  describe('sendMessage()', () => {
    it('appends a user message with the given content', async () => {
      await store.sendMessage(ORG_ID, 'Hello world');
      const userMsg = store.messages().find((m) => m.role === 'user');
      expect(userMsg?.content).toBe('Hello world');
    });

    it('appends an assistant message with accumulated stream content', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AiApi,
            useValue: makeMockApi({
              streamChat: vi.fn(() =>
                makeStream([{ content: 'Hel' }, { content: 'lo' }]),
              ),
            }),
          },
        ],
      });
      store = TestBed.inject(AiStore);

      await store.sendMessage(ORG_ID, 'Hi');
      const assistantMsg = store
        .messages()
        .find((m) => m.role === 'assistant');
      expect(assistantMsg?.content).toBe('Hello');
    });

    it('calls api.streamChat with orgId and the message payload', async () => {
      const mockApi = makeMockApi();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AiApi, useValue: mockApi }],
      });
      store = TestBed.inject(AiStore);

      await store.sendMessage(ORG_ID, 'Hello');
      expect(mockApi.streamChat).toHaveBeenCalledWith(ORG_ID, {
        message: 'Hello',
      });
    });

    it('sets loading to false after a successful stream', async () => {
      await store.sendMessage(ORG_ID, 'Hello');
      expect(store.loading()).toBe(false);
    });

    it('clears error before starting a new stream', async () => {
      store.error.set({ status: 500, message: 'Previous error' });
      await store.sendMessage(ORG_ID, 'Hello');
      expect(store.error()).toBeNull();
    });

    it('sets error and removes empty assistant bubble on stream error chunk', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AiApi,
            useValue: makeMockApi({
              streamChat: vi.fn(() => makeStream([{ error: 'Upstream down' }])),
            }),
          },
        ],
      });
      store = TestBed.inject(AiStore);

      await store.sendMessage(ORG_ID, 'Hello');

      expect(store.error()).toEqual({ status: 500, message: 'Upstream down' });
      const assistants = store
        .messages()
        .filter((m) => m.role === 'assistant');
      expect(assistants).toHaveLength(0);
    });

    it('sets error on thrown stream exception', async () => {
      const err = { status: 503, message: 'Network failed' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AiApi,
            useValue: makeMockApi({
              streamChat: vi.fn(() => makeThrowingStream([], err)),
            }),
          },
        ],
      });
      store = TestBed.inject(AiStore);

      await store.sendMessage(ORG_ID, 'Hello');
      expect(store.error()).toEqual(err);
    });

    it('keeps partial assistant content when the stream throws mid-way', async () => {
      const err = { status: 503, message: 'Interrupted' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AiApi,
            useValue: makeMockApi({
              streamChat: vi.fn(() =>
                makeThrowingStream([{ content: 'Partial' }], err),
              ),
            }),
          },
        ],
      });
      store = TestBed.inject(AiStore);

      await store.sendMessage(ORG_ID, 'Hello');
      const assistantMsg = store
        .messages()
        .find((m) => m.role === 'assistant');
      expect(assistantMsg?.content).toBe('Partial');
      expect(store.error()).toEqual(err);
    });

    it('sets loading to false after an error', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AiApi,
            useValue: makeMockApi({
              streamChat: vi.fn(() => makeStream([{ error: 'Oops' }])),
            }),
          },
        ],
      });
      store = TestBed.inject(AiStore);

      await store.sendMessage(ORG_ID, 'Hello');
      expect(store.loading()).toBe(false);
    });
  });

  // ── clearConversation() ────────────────────────────────────────────────────
  describe('clearConversation()', () => {
    it('empties the messages array', async () => {
      await store.sendMessage(ORG_ID, 'Hello');
      store.clearConversation();
      expect(store.messages()).toEqual([]);
    });

    it('resets error to null', () => {
      store.error.set({ status: 500, message: 'Error' });
      store.clearConversation();
      expect(store.error()).toBeNull();
    });

    it('resets loading to false', () => {
      store.loading.set(true);
      store.clearConversation();
      expect(store.loading()).toBe(false);
    });
  });

  // ── flush() ────────────────────────────────────────────────────────────────
  describe('flush()', () => {
    it('delegates to clearConversation and empties the messages array', async () => {
      await store.sendMessage(ORG_ID, 'Hello');
      store.flush();
      expect(store.messages()).toEqual([]);
    });

    it('resets loading to false', () => {
      store.loading.set(true);
      store.flush();
      expect(store.loading()).toBe(false);
    });

    it('resets error to null', () => {
      store.error.set({ status: 500, message: 'Error' });
      store.flush();
      expect(store.error()).toBeNull();
    });
  });
});
