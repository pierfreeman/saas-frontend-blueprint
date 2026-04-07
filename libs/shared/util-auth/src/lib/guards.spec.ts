import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { Observable, firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import {
  authGuard,
  isSystemAdminGuard,
  orgGuard,
  permissionGuard,
} from './guards';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { PermissionsService } from '@saas-frontend/shared/util-rbac';
import { PERMISSIONS } from '@saas-frontend/shared/util-rbac';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

// ── authGuard ─────────────────────────────────────────────────────────────

const executeAuthGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => authGuard(...args));

describe('authGuard', () => {
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    routerSpy = { navigate: vi.fn() };
  });

  describe('when the user is authenticated', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AuthService,
            useValue: { isLoading$: of(false), isAuthenticated$: of(true) },
          },
          { provide: Router, useValue: routerSpy },
        ],
      });
    });

    it('allows navigation (returns true)', async () => {
      const result = await firstValueFrom(
        executeAuthGuard(route, state) as Observable<boolean>,
      );
      expect(result).toBe(true);
    });

    it('does not redirect to /auth', async () => {
      await firstValueFrom(
        executeAuthGuard(route, state) as Observable<boolean>,
      );
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('when the user is NOT authenticated', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AuthService,
            useValue: { isLoading$: of(false), isAuthenticated$: of(false) },
          },
          { provide: Router, useValue: routerSpy },
        ],
      });
    });

    it('blocks navigation (returns false)', async () => {
      const result = await firstValueFrom(
        executeAuthGuard(route, state) as Observable<boolean>,
      );
      expect(result).toBe(false);
    });

    it('redirects to /auth', async () => {
      await firstValueFrom(
        executeAuthGuard(route, state) as Observable<boolean>,
      );
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });
});

// ── isSystemAdminGuard ─────────────────────────────────────────────────────

const executeIsSystemAdminGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => isSystemAdminGuard(...args));

describe('isSystemAdminGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('allows navigation when user is a system admin', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthStore,
          useValue: { currentUser: () => ({ isSystemAdmin: true }) },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    const result = executeIsSystemAdminGuard(route, state);
    expect(result).toBe(true);
  });

  it('redirects to / when user is not a system admin', () => {
    const urlTree = {} as UrlTree;
    const routerSpy = { createUrlTree: vi.fn(() => urlTree) };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthStore,
          useValue: { currentUser: () => ({ isSystemAdmin: false }) },
        },
        { provide: Router, useValue: routerSpy },
      ],
    });
    const result = executeIsSystemAdminGuard(route, state);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).toBe(urlTree);
  });

  it('redirects to / when currentUser is null', () => {
    const urlTree = {} as UrlTree;
    const routerSpy = { createUrlTree: vi.fn(() => urlTree) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { currentUser: () => null } },
        { provide: Router, useValue: routerSpy },
      ],
    });
    const result = executeIsSystemAdminGuard(route, state);
    expect(result).toBe(urlTree);
  });
});

// ── orgGuard ──────────────────────────────────────────────────────────────

const executeOrgGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => orgGuard(...args));

describe('orgGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('allows navigation when an active org is set', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrganizationsStore,
          useValue: { hasActiveOrg: () => true },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    const result = executeOrgGuard(route, state);
    expect(result).toBe(true);
  });

  it('redirects to /org/select when no active org is set', () => {
    const urlTree = { commands: ['/org/select'] } as unknown as UrlTree;
    const routerSpy = { createUrlTree: vi.fn(() => urlTree) };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrganizationsStore,
          useValue: { hasActiveOrg: () => false },
        },
        { provide: Router, useValue: routerSpy },
      ],
    });
    const result = executeOrgGuard(route, state);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/org/select']);
    expect(result).toBe(urlTree);
  });
});

// ── permissionGuard ────────────────────────────────────────────────────────

const executePermissionGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => permissionGuard(...args));

describe('permissionGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('allows navigation when no requiredPermission in route data', () => {
    const routeNoPermission = { data: {} } as ActivatedRouteSnapshot;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PermissionsService,
          useValue: { currentUserPermissions: vi.fn(() => new Set()) },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    expect(executePermissionGuard(routeNoPermission, state)).toBe(true);
  });

  it('allows navigation when the user has the required permission', () => {
    const routeWithPermission = {
      data: { requiredPermission: PERMISSIONS.ORG_READ },
    } as unknown as ActivatedRouteSnapshot;
    const permsSet = new Set([PERMISSIONS.ORG_READ]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PermissionsService,
          useValue: { currentUserPermissions: vi.fn(() => permsSet) },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    expect(executePermissionGuard(routeWithPermission, state)).toBe(true);
  });

  it('blocks navigation (returns UrlTree) when user lacks the required permission', () => {
    const routeWithPermission = {
      data: { requiredPermission: PERMISSIONS.ORG_BILLING_MANAGE },
    } as unknown as ActivatedRouteSnapshot;
    const urlTree = { commands: ['/dashboard'] } as unknown as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PermissionsService,
          useValue: {
            currentUserPermissions: vi.fn(
              () => new Set([PERMISSIONS.ORG_READ]),
            ),
          },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn(() => urlTree) } },
      ],
    });
    const result = executePermissionGuard(routeWithPermission, state);
    expect(result).toBe(urlTree);
  });
});
