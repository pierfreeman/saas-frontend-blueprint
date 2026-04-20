import { TestBed } from '@angular/core/testing';
import { AuthService } from '@auth0/auth0-angular';
import { of } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiApi } from './ai.api';
import type { SseChunk } from './ai.api.types';

const BASE = 'https://api.test';
const ORG_ID = 'org-1';
const TOKEN = 'test-token';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a minimal fake body object whose `getReader()` returns a reader that
 * walks through `textChunks` one entry per `read()`. jsdom does not ship
 * `ReadableStream`, so we mock just the surface that `AiApi` actually uses.
 */
function makeSseBody(textChunks: string[]) {
  const encoder = new TextEncoder();
  const queue = textChunks.map((chunk) => encoder.encode(chunk));
  let i = 0;
  const reader = {
    read: () =>
      i >= queue.length
        ? Promise.resolve({ done: true, value: undefined })
        : Promise.resolve({ done: false, value: queue[i++] }),
    releaseLock: vi.fn(),
  };
  return { getReader: () => reader };
}

function makeResponse(
  body: ReturnType<typeof makeSseBody> | null,
  init: { ok?: boolean; status?: number; statusText?: string } = {},
): Response {
  const { ok = true, status = 200, statusText = 'OK' } = init;
  return {
    ok,
    status,
    statusText,
    body,
  } as unknown as Response;
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of gen) {
    out.push(chunk);
  }
  return out;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AiApi', () => {
  let api: AiApi;
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: BASE },
        {
          provide: AuthService,
          useValue: {
            getAccessTokenSilently: vi.fn().mockReturnValue(of(TOKEN)),
          },
        },
      ],
    });

    api = TestBed.inject(AiApi);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    TestBed.resetTestingModule();
  });

  // ── Request shape ───────────────────────────────────────────────────────────

  describe('request shape', () => {
    it('hits the correct tenant-scoped chat URL with POST', async () => {
      fetchSpy.mockResolvedValue(makeResponse(makeSseBody([])));

      await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE}/organizations/${ORG_ID}/ai/chat`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('attaches Authorization header with bearer token from Auth0', async () => {
      fetchSpy.mockResolvedValue(makeResponse(makeSseBody([])));

      await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect((init.headers as Record<string, string>).Authorization).toBe(
        `Bearer ${TOKEN}`,
      );
    });

    it('attaches x-org-id header', async () => {
      fetchSpy.mockResolvedValue(makeResponse(makeSseBody([])));

      await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect((init.headers as Record<string, string>)['x-org-id']).toBe(ORG_ID);
    });

    it('sends Content-Type application/json', async () => {
      fetchSpy.mockResolvedValue(makeResponse(makeSseBody([])));

      await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect((init.headers as Record<string, string>)['Content-Type']).toBe(
        'application/json',
      );
    });

    it('serialises the dto as the JSON body', async () => {
      fetchSpy.mockResolvedValue(makeResponse(makeSseBody([])));

      await collect(api.streamChat(ORG_ID, { message: 'Hello world' }));

      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(init.body).toBe(JSON.stringify({ message: 'Hello world' }));
    });
  });

  // ── SSE parsing ─────────────────────────────────────────────────────────────

  describe('SSE parsing', () => {
    it('yields parsed chunks from `data:` lines', async () => {
      fetchSpy.mockResolvedValue(
        makeResponse(
          makeSseBody([
            'data: {"content":"Hel"}\n',
            'data: {"content":"lo"}\n',
          ]),
        ),
      );

      const chunks = await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(chunks).toEqual<SseChunk[]>([
        { content: 'Hel' },
        { content: 'lo' },
      ]);
    });

    it('stops yielding on `[DONE]` marker', async () => {
      fetchSpy.mockResolvedValue(
        makeResponse(
          makeSseBody([
            'data: {"content":"first"}\n',
            'data: [DONE]\n',
            'data: {"content":"after-done"}\n',
          ]),
        ),
      );

      const chunks = await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(chunks).toEqual<SseChunk[]>([{ content: 'first' }]);
    });

    it('skips non-`data:` lines (e.g. comments, blank lines)', async () => {
      fetchSpy.mockResolvedValue(
        makeResponse(
          makeSseBody([
            ': keepalive\n',
            '\n',
            'event: message\n',
            'data: {"content":"hello"}\n',
          ]),
        ),
      );

      const chunks = await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(chunks).toEqual<SseChunk[]>([{ content: 'hello' }]);
    });

    it('silently skips malformed JSON payloads', async () => {
      fetchSpy.mockResolvedValue(
        makeResponse(
          makeSseBody([
            'data: {not valid json}\n',
            'data: {"content":"valid"}\n',
          ]),
        ),
      );

      const chunks = await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(chunks).toEqual<SseChunk[]>([{ content: 'valid' }]);
    });

    it('buffers content split across multiple stream reads', async () => {
      fetchSpy.mockResolvedValue(
        makeResponse(
          makeSseBody([
            'data: {"cont',
            'ent":"split"}\n',
            'data: {"content":"second"}\n',
          ]),
        ),
      );

      const chunks = await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(chunks).toEqual<SseChunk[]>([
        { content: 'split' },
        { content: 'second' },
      ]);
    });

    it('yields error chunks from the stream', async () => {
      fetchSpy.mockResolvedValue(
        makeResponse(makeSseBody(['data: {"error":"Upstream down"}\n'])),
      );

      const chunks = await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(chunks).toEqual<SseChunk[]>([{ error: 'Upstream down' }]);
    });

    it('returns nothing when the response has no body', async () => {
      fetchSpy.mockResolvedValue(makeResponse(null));

      const chunks = await collect(api.streamChat(ORG_ID, { message: 'Hi' }));

      expect(chunks).toEqual([]);
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws {status, message} on non-OK response', async () => {
      fetchSpy.mockResolvedValue(
        makeResponse(null, { ok: false, status: 500, statusText: 'Boom' }),
      );

      await expect(
        collect(api.streamChat(ORG_ID, { message: 'Hi' })),
      ).rejects.toEqual({ status: 500, message: 'Boom' });
    });

    it('propagates fetch() rejections', async () => {
      const err = new Error('Network failed');
      fetchSpy.mockRejectedValue(err);

      await expect(
        collect(api.streamChat(ORG_ID, { message: 'Hi' })),
      ).rejects.toBe(err);
    });
  });
});
