import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { vi } from 'vitest';
import { PLATFORM_ROUTES } from './entry.routes';
import { AuthStore } from '@saas-frontend/auth/data-access';
import type { User } from '@saas-frontend/auth/data-access';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { OrgContextService } from '@saas-frontend/shared/util-org-context';

const baseUser: User = {
  id: 'u1',
  auth0Id: 'auth0|1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  pictureUrl: null,
};

describe('PLATFORM_ROUTES', () => {
  it('redirects "" to dashboard', () => {
    const redirect = PLATFORM_ROUTES.find((r) => r.path === '' && r.redirectTo);
    expect(redirect?.redirectTo).toBe('dashboard');
  });

  it('has a route group that provides API_BASE_URL and API services', () => {
    const group = PLATFORM_ROUTES.find(
      (r) => r.path === '' && !r.redirectTo && r.providers,
    );
    expect(group).toBeDefined();
    expect(group?.providers?.length).toBeGreaterThan(0);
  });

  it('has a canActivate guard on the route group to sync the current user', () => {
    const group = PLATFORM_ROUTES.find(
      (r) => r.path === '' && !r.redirectTo && r.canActivate,
    );
    expect(group?.canActivate).toBeDefined();
    expect(group?.canActivate?.length).toBeGreaterThan(0);
  });

  it('has a lazy dashboard route inside the group', () => {
    const group = PLATFORM_ROUTES.find(
      (r) => r.path === '' && !r.redirectTo && r.children,
    );
    const dashboard = group?.children?.find((r) => r.path === 'dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard?.loadComponent).toBeDefined();
  });

  it('has a lazy members route nested under org-settings', () => {
    const group = PLATFORM_ROUTES.find(
      (r) => r.path === '' && !r.redirectTo && r.children,
    );
    const orgSettings = group?.children?.find((r) => r.path === 'org-settings');
    expect(orgSettings).toBeDefined();
    const members = orgSettings?.children?.find((r) => r.path === 'members');
    expect(members).toBeDefined();
    expect(members?.loadChildren).toBeDefined();
  });

  it('has a lazy settings route nested under org-settings', () => {
    const group = PLATFORM_ROUTES.find(
      (r) => r.path === '' && !r.redirectTo && r.children,
    );
    const orgSettings = group?.children?.find((r) => r.path === 'org-settings');
    expect(orgSettings).toBeDefined();
    const organization = orgSettings?.children?.find(
      (r) => r.path === 'organization',
    );
    expect(organization).toBeDefined();
    expect(organization?.loadChildren).toBeDefined();
  });
});

// ─── syncCurrentUser guard ────────────────────────────────────────────────────

describe('syncCurrentUser guard', () => {
  const routeGroup = PLATFORM_ROUTES.find(
    (r) => r.path === '' && !r.redirectTo && r.canActivate,
  )!;
  const syncCurrentUser = routeGroup.canActivate![0] as CanActivateFn;

  function makeMocks(opts: {
    user?: User | null;
    activeOrgId?: string | null;
    membershipsLength?: number;
  }) {
    const { user = baseUser, activeOrgId = null, membershipsLength = 0 } = opts;
    const mockAuthStore = { currentUser: signal<User | null>(user) };
    const mockEntitlementsStore = {
      entitlements: signal(null),
      loadEntitlements: vi.fn().mockResolvedValue(undefined),
    };
    const mockMembershipsStore = {
      setCurrentUserId: vi.fn(),
      memberships: signal(new Array(membershipsLength).fill({})),
      loadMemberships: vi.fn().mockResolvedValue(undefined),
      currentUserRole: vi.fn().mockReturnValue('OWNER'),
    };
    const mockOrgsStore = { activeOrgId: signal<string | null>(activeOrgId) };
    const mockOrgContext = { setNavRole: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: MembershipsStore, useValue: mockMembershipsStore },
        { provide: OrganizationsStore, useValue: mockOrgsStore },
        { provide: EntitlementsStore, useValue: mockEntitlementsStore },
        { provide: OrgContextService, useValue: mockOrgContext },
      ],
    });

    return {
      mockAuthStore,
      mockMembershipsStore,
      mockOrgsStore,
      mockEntitlementsStore,
      mockOrgContext,
    };
  }

  it('sets the current user id from AuthStore', async () => {
    const { mockMembershipsStore } = makeMocks({ user: baseUser });

    const result = await TestBed.runInInjectionContext(() =>
      syncCurrentUser({} as any, {} as any),
    );

    expect(mockMembershipsStore.setCurrentUserId).toHaveBeenCalledWith('u1');
    expect(result).toBe(true);
  });

  it('sets null userId when no user is authenticated', async () => {
    const { mockMembershipsStore } = makeMocks({ user: null });

    await TestBed.runInInjectionContext(() =>
      syncCurrentUser({} as any, {} as any),
    );

    expect(mockMembershipsStore.setCurrentUserId).toHaveBeenCalledWith(null);
  });

  it('loads memberships when activeOrgId is set and memberships are empty', async () => {
    const { mockMembershipsStore } = makeMocks({
      activeOrgId: 'org-1',
      membershipsLength: 0,
    });

    await TestBed.runInInjectionContext(() =>
      syncCurrentUser({} as any, {} as any),
    );

    expect(mockMembershipsStore.loadMemberships).toHaveBeenCalledWith('org-1');
  });

  it('skips loadMemberships when memberships are already loaded', async () => {
    const { mockMembershipsStore } = makeMocks({
      activeOrgId: 'org-1',
      membershipsLength: 2,
    });

    await TestBed.runInInjectionContext(() =>
      syncCurrentUser({} as any, {} as any),
    );

    expect(mockMembershipsStore.loadMemberships).not.toHaveBeenCalled();
  });

  it('skips loadMemberships when there is no active org', async () => {
    const { mockMembershipsStore } = makeMocks({ activeOrgId: null });

    await TestBed.runInInjectionContext(() =>
      syncCurrentUser({} as any, {} as any),
    );

    expect(mockMembershipsStore.loadMemberships).not.toHaveBeenCalled();
  });

  it('propagates the current user role to OrgContextService', async () => {
    const { mockOrgContext, mockMembershipsStore } = makeMocks({});
    mockMembershipsStore.currentUserRole.mockReturnValue('ADMIN');

    await TestBed.runInInjectionContext(() =>
      syncCurrentUser({} as any, {} as any),
    );

    expect(mockOrgContext.setNavRole).toHaveBeenCalledWith('ADMIN');
  });
});

// ─── requireOrgManage guard ───────────────────────────────────────────────────

describe('requireOrgManage guard', () => {
  const routeGroup = PLATFORM_ROUTES.find(
    (r) => r.path === '' && !r.redirectTo && r.children,
  )!;
  const orgSettingsRoute = routeGroup.children!.find(
    (r) => r.path === 'org-settings',
  )!;
  const requireOrgManage = orgSettingsRoute.canActivate![0] as CanActivateFn;

  it('returns true when canManageOrg() is true', () => {
    const mockOrgContext = { canManageOrg: vi.fn().mockReturnValue(true) };
    TestBed.configureTestingModule({
      providers: [{ provide: OrgContextService, useValue: mockOrgContext }],
    });

    const result = TestBed.runInInjectionContext(() =>
      requireOrgManage({} as any, {} as any),
    );

    expect(result).toBe(true);
  });

  it('returns false when canManageOrg() is false', () => {
    const mockOrgContext = { canManageOrg: vi.fn().mockReturnValue(false) };
    TestBed.configureTestingModule({
      providers: [{ provide: OrgContextService, useValue: mockOrgContext }],
    });

    const result = TestBed.runInInjectionContext(() =>
      requireOrgManage({} as any, {} as any),
    );

    expect(result).toBe(false);
  });
});
