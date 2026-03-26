import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@saas-frontend/auth/data-access';
import type { User } from '@saas-frontend/auth/data-access';

const mockUser: User = { id: 'u1', email: 'a@b.com', auth0Id: 'auth0|1' };

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
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
    TestBed.configureTestingModule({});
    const freshStore = TestBed.inject(AuthStore) as AuthStore;
    expect(freshStore.currentUser()).toEqual(mockUser);
    expect(freshStore.isLoggedIn()).toBe(true);
  });
});
