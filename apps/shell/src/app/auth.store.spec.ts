import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthStore, AuthApi } from '@saas-frontend/auth/data-access';
import type { User } from '@saas-frontend/auth/data-access';

const mockUser: User = {
  id: 'u1',
  email: 'a@b.com',
  auth0Id: 'auth0|1',
  isSystemAdmin: false,
};

function mockApi(overrides: Partial<InstanceType<typeof AuthApi>> = {}) {
  return {
    getMe: vi.fn(() => of(mockUser)),
    updateMe: vi.fn(() => of(mockUser)),
    requestPasswordChange: vi.fn(() => of(undefined)),
    ...overrides,
  } as unknown as AuthApi;
}

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthApi, useValue: mockApi() }],
    });
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => sessionStorage.clear());

  it('starts with null when sessionStorage is empty', () => {
    expect(store.currentUser()).toBeNull();
    expect(store.isLoggedIn()).toBe(false);
  });

  it('setUser updates the signal and persists to sessionStorage', () => {
    store.setUser(mockUser);
    expect(store.currentUser()).toEqual(mockUser);
    expect(store.isLoggedIn()).toBe(true);
    const raw = sessionStorage.getItem('saas.currentUser');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(mockUser);
  });

  it('clearUser resets the signal and removes from sessionStorage', () => {
    store.setUser(mockUser);
    store.clearUser();
    expect(store.currentUser()).toBeNull();
    expect(sessionStorage.getItem('saas.currentUser')).toBeNull();
  });

  it('hydrates from sessionStorage on construction', () => {
    sessionStorage.setItem('saas.currentUser', JSON.stringify(mockUser));
    // New TestBed instance simulates a new bundle/injector reading from storage
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthApi, useValue: mockApi() }],
    });
    const freshStore = TestBed.inject(AuthStore) as AuthStore;
    expect(freshStore.currentUser()).toEqual(mockUser);
    expect(freshStore.isLoggedIn()).toBe(true);
  });

  describe('updateProfile', () => {
    it('calls api.updateMe with the dto, updates the signal, and returns the updated user', async () => {
      const updated: User = {
        ...mockUser,
        firstName: 'Alice',
        lastName: 'Smith',
      };
      const api = mockApi({ updateMe: vi.fn(() => of(updated)) });
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

      expect(api.updateMe).toHaveBeenCalledWith({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      expect(result).toEqual(updated);
      expect(store.currentUser()).toEqual(updated);
    });

    it('persists the updated user to sessionStorage', async () => {
      const updated: User = {
        ...mockUser,
        pictureUrl: 'https://example.com/pic.jpg',
      };
      const api = mockApi({ updateMe: vi.fn(() => of(updated)) });
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
      const api = mockApi({
        updateMe: vi.fn(() => throwError(() => new Error('Network error'))),
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

  describe('requestPasswordChange', () => {
    it('calls api.requestPasswordChange and resolves', async () => {
      const api = mockApi({
        requestPasswordChange: vi.fn(() => of(undefined)),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);

      await store.requestPasswordChange();

      expect(api.requestPasswordChange).toHaveBeenCalledTimes(1);
    });

    it('does not modify currentUser', async () => {
      const api = mockApi({
        requestPasswordChange: vi.fn(() => of(undefined)),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);
      store.setUser(mockUser);

      await store.requestPasswordChange();

      expect(store.currentUser()).toEqual(mockUser);
    });

    it('propagates API errors', async () => {
      const api = mockApi({
        requestPasswordChange: vi.fn(() =>
          throwError(() => new Error('Auth0 error')),
        ),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthApi, useValue: api }],
      });
      store = TestBed.inject(AuthStore);

      await expect(store.requestPasswordChange()).rejects.toThrow(
        'Auth0 error',
      );
    });
  });
});
