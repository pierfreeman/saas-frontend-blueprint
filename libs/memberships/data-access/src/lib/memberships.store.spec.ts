import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MembershipsStore } from './memberships.store';
import { MembershipsApi } from './memberships.api';

const mockSummary = (
  id = 'm1',
  userId = 'u1',
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'READ_ONLY' = 'MEMBER',
) => ({ id, userId, role, email: `${userId}@test.com` }) as never;

function makeMockApi(overrides: Record<string, unknown> = {}) {
  return {
    getMemberships: vi.fn(() => of([mockSummary()])),
    createMembership: vi.fn(() =>
      of({ id: 'm2', userId: 'u2', role: 'MEMBER' }),
    ),
    updateMembership: vi.fn(() => of(mockSummary('m1', 'u1', 'ADMIN'))),
    deleteMembership: vi.fn(() =>
      of({ message: 'Membership deleted successfully' }),
    ),
    inviteMember: vi.fn(() => of({ message: 'Invitation sent successfully.' })),
    ...overrides,
  } as unknown as MembershipsApi;
}

describe('MembershipsStore', () => {
  let store: MembershipsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MembershipsApi, useValue: makeMockApi() }],
    });
    store = TestBed.inject(MembershipsStore);
  });

  // ── Initial state ──────────────────────────────────────────────────────────
  it('starts with empty memberships array', () => {
    expect(store.memberships()).toEqual([]);
  });

  it('starts with loadingList false', () => {
    expect(store.loadingList()).toBe(false);
  });

  it('starts with loadingMutation false', () => {
    expect(store.loadingMutation()).toBe(false);
  });

  it('starts with null error', () => {
    expect(store.error()).toBeNull();
  });

  it('currentUserId() starts as null', () => {
    expect(store.currentUserId()).toBeNull();
  });

  it('currentMembership() is null when no userId set', () => {
    expect(store.currentMembership()).toBeNull();
  });

  it('currentUserRole() is null when no userId set', () => {
    expect(store.currentUserRole()).toBeNull();
  });

  // ── setCurrentUserId() ─────────────────────────────────────────────────────
  describe('setCurrentUserId()', () => {
    it('updates currentUserId signal', () => {
      store.setCurrentUserId('u1');
      expect(store.currentUserId()).toBe('u1');
    });

    it('can be reset to null', () => {
      store.setCurrentUserId('u1');
      store.setCurrentUserId(null);
      expect(store.currentUserId()).toBeNull();
    });
  });

  // ── currentMembership / currentUserRole computed ───────────────────────────
  describe('currentMembership()', () => {
    it('returns the membership matching currentUserId after load', async () => {
      store.setCurrentUserId('u1');
      await store.loadMemberships('org-1');
      expect(store.currentMembership()).toEqual(mockSummary());
    });

    it('returns null when userId does not match any membership', async () => {
      store.setCurrentUserId('unknown');
      await store.loadMemberships('org-1');
      expect(store.currentMembership()).toBeNull();
    });

    it('currentUserRole() returns role of matching membership', async () => {
      store.setCurrentUserId('u1');
      await store.loadMemberships('org-1');
      expect(store.currentUserRole()).toBe('MEMBER');
    });
  });

  // ── loadMemberships() ──────────────────────────────────────────────────────
  describe('loadMemberships()', () => {
    it('populates memberships signal on success', async () => {
      await store.loadMemberships('org-1');
      expect(store.memberships()).toHaveLength(1);
    });

    it('sets loadingList to false after success', async () => {
      await store.loadMemberships('org-1');
      expect(store.loadingList()).toBe(false);
    });

    it('stores error and resets loadingList on failure', async () => {
      const error = { status: 500, message: 'fail' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: MembershipsApi,
            useValue: makeMockApi({
              getMemberships: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(MembershipsStore);
      await store.loadMemberships('org-1');
      expect(store.error()).toEqual(error);
      expect(store.loadingList()).toBe(false);
    });
  });

  // ── createMembership() ─────────────────────────────────────────────────────
  describe('createMembership()', () => {
    it('returns the created membership and reloads the list', async () => {
      const result = await store.createMembership('org-1', {
        userId: 'u2',
        role: 'MEMBER',
      } as never);
      expect(result).toEqual({ id: 'm2', userId: 'u2', role: 'MEMBER' });
    });

    it('sets loadingMutation to false after success', async () => {
      await store.createMembership('org-1', {
        userId: 'u2',
        role: 'MEMBER',
      } as never);
      expect(store.loadingMutation()).toBe(false);
    });

    it('returns null and stores error on failure', async () => {
      const error = { status: 422, message: 'Validation error' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: MembershipsApi,
            useValue: makeMockApi({
              createMembership: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(MembershipsStore);
      const result = await store.createMembership('org-1', {} as never);
      expect(result).toBeNull();
      expect(store.error()).toEqual(error);
      expect(store.loadingMutation()).toBe(false);
    });
  });

  // ── inviteMember() ─────────────────────────────────────────────────────────
  describe('inviteMember()', () => {
    it('returns the invitation response and reloads the list', async () => {
      const result = await store.inviteMember('org-1', {
        email: 'x@x.com',
        role: 'MEMBER',
      } as never);
      expect(result).toEqual({ message: 'Invitation sent successfully.' });
    });

    it('returns null and stores error on failure', async () => {
      const error = { status: 400, message: 'Bad request' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: MembershipsApi,
            useValue: makeMockApi({
              inviteMember: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(MembershipsStore);
      const result = await store.inviteMember('org-1', {} as never);
      expect(result).toBeNull();
      expect(store.error()).toEqual(error);
    });
  });

  // ── updateMemberRole() ─────────────────────────────────────────────────────
  describe('updateMemberRole()', () => {
    it('updates the role in the memberships list locally', async () => {
      const api = makeMockApi({
        getMemberships: vi.fn(() =>
          of([
            mockSummary('m1', 'u1', 'MEMBER'),
            mockSummary('m2', 'u2', 'MEMBER'),
          ]),
        ),
        updateMembership: vi.fn(() => of(mockSummary('m1', 'u1', 'ADMIN'))),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: MembershipsApi, useValue: api }],
      });
      store = TestBed.inject(MembershipsStore);
      await store.loadMemberships('org-1');
      await store.updateMemberRole('org-1', 'm1', 'ADMIN');
      expect(store.memberships().find((m) => m.id === 'm1')?.role).toBe(
        'ADMIN',
      );
      expect(store.memberships().find((m) => m.id === 'm2')?.role).toBe(
        'MEMBER',
      );
    });

    it('stores error on failure', async () => {
      const error = { status: 403, message: 'Forbidden' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: MembershipsApi,
            useValue: makeMockApi({
              updateMembership: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(MembershipsStore);
      await store.updateMemberRole('org-1', 'm1', 'ADMIN');
      expect(store.error()).toEqual(error);
    });
  });

  // ── removeMember() ─────────────────────────────────────────────────────────
  describe('removeMember()', () => {
    it('removes the membership from the list', async () => {
      const api = makeMockApi({
        getMemberships: vi.fn(() =>
          of([mockSummary('m1', 'u1'), mockSummary('m2', 'u2')]),
        ),
        deleteMembership: vi.fn(() => of({ message: 'deleted' })),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: MembershipsApi, useValue: api }],
      });
      store = TestBed.inject(MembershipsStore);
      await store.loadMemberships('org-1');
      await store.removeMember('org-1', 'm1');
      const ids = store.memberships().map((m) => m.id);
      expect(ids).not.toContain('m1');
      expect(ids).toContain('m2');
    });

    it('stores error on failure', async () => {
      const error = { status: 403, message: 'Forbidden' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: MembershipsApi,
            useValue: makeMockApi({
              deleteMembership: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(MembershipsStore);
      await store.removeMember('org-1', 'm1');
      expect(store.error()).toEqual(error);
    });
  });

  // ── flush() ────────────────────────────────────────────────────────────────
  describe('flush()', () => {
    it('resets all state to initial values', async () => {
      store.setCurrentUserId('u1');
      await store.loadMemberships('org-1');
      store.flush();
      expect(store.memberships()).toEqual([]);
      expect(store.loadingList()).toBe(false);
      expect(store.loadingMutation()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.currentUserId()).toBeNull();
    });
  });
});
