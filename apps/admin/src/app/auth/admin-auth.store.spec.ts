import { Injectable, inject, signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AdminAuthStore, AdminUserProfile } from './admin-auth.store';
import { AuthService } from '@auth0/auth0-angular';

const mockUser: AdminUserProfile = {
  adminUserId: 'uuid-1',
  auth0Id: 'auth0|abc',
  email: 'admin@example.com',
  displayName: 'Admin',
};

describe('AdminAuthStore', () => {
  let store: AdminAuthStore;

  const mockAuth0 = {
    logout: vi.fn(() => ({
      subscribe: vi.fn(),
      pipe: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
  };

  beforeEach(() => {
    sessionStorage.clear();

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
});
