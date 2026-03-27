import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PermissionsService } from '@saas-frontend/shared/util-rbac';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { PERMISSIONS } from '@saas-frontend/shared/util-rbac';
import { resolvePermissions } from '@saas-frontend/shared/util-rbac';
import { hasPermission } from '@saas-frontend/shared/util-rbac';

// ── resolvePermissions() ───────────────────────────────────────────────────
describe('resolvePermissions()', () => {
  it('returns all permissions for OWNER role', () => {
    const perms = resolvePermissions('OWNER');
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_BILLING_MANAGE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_INVITE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_REMOVE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_ROLE_UPDATE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_EXPORT)).toBe(true);
  });

  it('returns correct permissions for ADMIN role (no billing or export)', () => {
    const perms = resolvePermissions('ADMIN');
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MEMBERS_INVITE)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
    // ADMIN does NOT have billing manage or analytics export
    expect(perms.has(PERMISSIONS.ORG_BILLING_MANAGE)).toBe(false);
    expect(perms.has(PERMISSIONS.ANALYTICS_EXPORT)).toBe(false);
  });

  it('returns limited permissions for MEMBER role', () => {
    const perms = resolvePermissions('MEMBER');
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(false);
  });

  it('returns only ORG_READ for READ_ONLY role', () => {
    const perms = resolvePermissions('READ_ONLY');
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.size).toBe(1);
  });

  it('returns a Set instance', () => {
    expect(resolvePermissions('MEMBER')).toBeInstanceOf(Set);
  });
});

// ── PermissionsService ─────────────────────────────────────────────────────
describe('PermissionsService', () => {
  function setup(role: string | null) {
    const mockStore = {
      currentUserRole: vi.fn(() => role),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: MembershipsStore, useValue: mockStore }],
    });
    return TestBed.inject(PermissionsService);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('returns an empty Set when role is null', () => {
    const svc = setup(null);
    expect(svc.currentUserPermissions().size).toBe(0);
  });

  it('returns OWNER permissions when role is OWNER', () => {
    const svc = setup('OWNER');
    expect(
      svc.currentUserPermissions().has(PERMISSIONS.ORG_BILLING_MANAGE),
    ).toBe(true);
  });

  it('returns MEMBER permissions when role is MEMBER', () => {
    const svc = setup('MEMBER');
    const perms = svc.currentUserPermissions();
    expect(perms.has(PERMISSIONS.ORG_READ)).toBe(true);
    expect(perms.has(PERMISSIONS.ORG_MANAGE)).toBe(false);
  });
});

// ── hasPermission() ────────────────────────────────────────────────────────
describe('hasPermission()', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('returns true when the current user has the permission', () => {
    const mockStore = { currentUserRole: vi.fn(() => 'OWNER') };
    TestBed.configureTestingModule({
      providers: [{ provide: MembershipsStore, useValue: mockStore }],
    });

    const result = TestBed.runInInjectionContext(() =>
      hasPermission(PERMISSIONS.ORG_BILLING_MANAGE),
    );
    expect(result).toBe(true);
  });

  it('returns false when the current user lacks the permission', () => {
    const mockStore = { currentUserRole: vi.fn(() => 'MEMBER') };
    TestBed.configureTestingModule({
      providers: [{ provide: MembershipsStore, useValue: mockStore }],
    });

    const result = TestBed.runInInjectionContext(() =>
      hasPermission(PERMISSIONS.ORG_BILLING_MANAGE),
    );
    expect(result).toBe(false);
  });

  it('returns false when no role (null)', () => {
    const mockStore = { currentUserRole: vi.fn(() => null) };
    TestBed.configureTestingModule({
      providers: [{ provide: MembershipsStore, useValue: mockStore }],
    });

    const result = TestBed.runInInjectionContext(() =>
      hasPermission(PERMISSIONS.ORG_READ),
    );
    expect(result).toBe(false);
  });
});
