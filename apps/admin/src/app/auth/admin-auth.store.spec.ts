import { Injectable, inject, signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AdminAuthStore, AdminUserProfile } from './admin-auth.store';
import { AuthService } from '@auth0/auth0-angular';
import { of } from 'rxjs';

const mockUser: AdminUserProfile = {
  adminUserId: 'uuid-1',
  auth0Id: 'auth0|abc',
  email: 'admin@example.com',
  displayName: 'Admin',
};

describe('AdminAuthStore', () => {
  let store: AdminAuthStore;

  const mockAuth0 = {
    logout: vi.fn(() => of(undefined)),
  };

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth0 },
        AdminAuthStore,
      ],
    });

    store = TestBed.inject(AdminAuthStore);
  });

  it('starts with null when storage is empty', () => {
    expect(store.currentUser()).toBeNull();
    expect(store.isLoggedIn()).toBe(false);
  });

  it('hydrates from sessionStorage on init', () => {
    sessionStorage.setItem('saas.adminUser', JSON.stringify(mockUser));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth0 },
        AdminAuthStore,
      ],
    });
    const freshStore = TestBed.inject(AdminAuthStore);
    expect(freshStore.currentUser()).toEqual(mockUser);
    expect(freshStore.isLoggedIn()).toBe(true);
  });

  it('returns null when sessionStorage contains invalid JSON', () => {
    sessionStorage.setItem('saas.adminUser', 'not-json{{{');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth0 },
        AdminAuthStore,
      ],
    });
    const freshStore = TestBed.inject(AdminAuthStore);
    expect(freshStore.currentUser()).toBeNull();
  });

  it('setUser stores the user and updates signal', () => {
    store.setUser(mockUser);
    expect(store.currentUser()).toEqual(mockUser);
    expect(store.isLoggedIn()).toBe(true);
    expect(JSON.parse(sessionStorage.getItem('saas.adminUser')!)).toEqual(
      mockUser,
    );
  });

  it('clearUser removes the user and storage', () => {
    store.setUser(mockUser);
    store.clearUser();
    expect(store.currentUser()).toBeNull();
    expect(sessionStorage.getItem('saas.adminUser')).toBeNull();
  });

  it('logout clears the user and calls auth0.logout', async () => {
    store.setUser(mockUser);
    await store.logout();
    expect(store.currentUser()).toBeNull();
    expect(mockAuth0.logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: globalThis.location.origin },
    });
  });
});
