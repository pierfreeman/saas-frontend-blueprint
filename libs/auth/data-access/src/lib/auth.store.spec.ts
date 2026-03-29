import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthStore } from './auth.store';
import { AuthApi, UpdateProfileDto } from './auth.api';
import type { User } from './auth.api.types';

const mockUser: User = {
  id: 'u1',
  email: 'a@b.com',
  auth0Id: 'auth0|1'
};

function makeMockApi(overrides: Partial<InstanceType<typeof AuthApi>> = {}) {
  return {
    getMe: vi.fn(() => of(mockUser)),
    updateMe: vi.fn(() => of(mockUser)),
    ...overrides,
  } as unknown as AuthApi;
}

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthApi, useValue: makeMockApi() }],
    });
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => sessionStorage.clear());

  // ── Initial state ──────────────────────────────────────────────────────────
  describe('loadFromStorage (initialization)', () => {
    it('starts with null when sessionStorage is empty', () => {
      expect(store.currentUser()).toBeNull();
      expect(store.isLoggedIn()).toBe(false);
    });

    it('hydrates from sessionStorage on construction with valid JSON', () => {
      sessionStorage.setItem('saas.currentUser', JSON.stringify(mockUser));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: makeMockApi() }],
      });
      const freshStore = TestBed.inject(AuthStore);
      expect(freshStore.currentUser()).toEqual(mockUser);
      expect(freshStore.isLoggedIn()).toBe(true);
    });

    it('returns null when sessionStorage contains malformed JSON', () => {
      sessionStorage.setItem('saas.currentUser', '{invalid json}');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: makeMockApi() }],
      });
      const freshStore = TestBed.inject(AuthStore);
      expect(freshStore.currentUser()).toBeNull();
    });

    it('returns null when sessionStorage is empty', () => {
      sessionStorage.clear();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: makeMockApi() }],
      });
      const freshStore = TestBed.inject(AuthStore);
      expect(freshStore.currentUser()).toBeNull();
    });
  });

  // ── isLoggedIn ─────────────────────────────────────────────────────────────
  describe('isLoggedIn', () => {
    it('returns true when currentUser is non-null', () => {
      store.setUser(mockUser);
      expect(store.isLoggedIn()).toBe(true);
    });

    it('returns false when currentUser is null', () => {
      expect(store.isLoggedIn()).toBe(false);
    });
  });

  // ── setUser ────────────────────────────────────────────────────────────────
  describe('setUser', () => {
    it('updates currentUser signal', () => {
      store.setUser(mockUser);
      expect(store.currentUser()).toEqual(mockUser);
    });

    it('writes serialised user to sessionStorage', () => {
      store.setUser(mockUser);
      const raw = sessionStorage.getItem('saas.currentUser');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual(mockUser);
    });

    it('updates signal even when sessionStorage fails', () => {
      // Simulate storage error by filling quota
      const mockSetItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = mockSetItem;

      store.setUser(mockUser);
      expect(store.currentUser()).toEqual(mockUser);

      // Restore original
      sessionStorage.setItem = originalSetItem;
    });
  });

  // ── clearUser ──────────────────────────────────────────────────────────────
  describe('clearUser', () => {
    it('sets currentUser to null', () => {
      store.setUser(mockUser);
      store.clearUser();
      expect(store.currentUser()).toBeNull();
    });

    it('removes STORAGE_KEY from sessionStorage', () => {
      store.setUser(mockUser);
      store.clearUser();
      expect(sessionStorage.getItem('saas.currentUser')).toBeNull();
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────────────
  describe('updateProfile', () => {
    it('calls AuthApi.updateMe with the correct DTO', async () => {
      const updated: User = {
        ...mockUser,
        firstName: 'Alice',
        lastName: 'Smith',
      };
      const api = makeMockApi({ updateMe: vi.fn(() => of(updated)) });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);

      const dto: UpdateProfileDto = {
        firstName: 'Alice',
        lastName: 'Smith',
      };
      await store.updateProfile(dto);

      expect(api.updateMe).toHaveBeenCalledWith(dto);
    });

    it('updates currentUser signal with the response', async () => {
      const updated: User = {
        ...mockUser,
        firstName: 'Alice',
        lastName: 'Smith',
      };
      const api = makeMockApi({ updateMe: vi.fn(() => of(updated)) });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);
      store.setUser(mockUser);

      const result = await store.updateProfile({
        firstName: 'Alice',
        lastName: 'Smith',
      });

      expect(result).toEqual(updated);
      expect(store.currentUser()).toEqual(updated);
    });

    it('returns the updated user', async () => {
      const updated: User = {
        ...mockUser,
        pictureUrl: 'https://example.com/pic.jpg',
      };
      const api = makeMockApi({ updateMe: vi.fn(() => of(updated)) });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);

      const result = await store.updateProfile({
        pictureUrl: 'https://example.com/pic.jpg'
      });

      expect(result).toEqual(updated);
    });

    it('persists updated user to sessionStorage', async () => {
      const updated: User = {
        ...mockUser,
        pictureUrl: 'https://example.com/pic.jpg',
      };
      const api = makeMockApi({ updateMe: vi.fn(() => of(updated)) });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);

      await store.updateProfile({ pictureUrl: 'https://example.com/pic.jpg' });

      const raw = sessionStorage.getItem('saas.currentUser');
      expect(JSON.parse(raw!)).toEqual(updated);
    });

    it('propagates API errors', async () => {
      const error = new Error('Network error');
      const api = makeMockApi({
        updateMe: vi.fn(() => throwError(() => error)),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);

      await expect(store.updateProfile({ firstName: 'X' })).rejects.toThrow(
        'Network error',
      );
    });
  });
});
