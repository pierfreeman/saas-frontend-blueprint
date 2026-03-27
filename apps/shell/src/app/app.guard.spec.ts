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
  orgGuard,
  permissionGuard,
} from '@saas-frontend/shared/util-auth';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { PermissionsService } from '@saas-frontend/shared/util-rbac';
import { PERMISSIONS } from '@saas-frontend/shared/util-rbac';

const executeGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => authGuard(...args));

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

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
        executeGuard(route, state) as Observable<boolean>,
      );
      expect(result).toBe(true);
    });

    it('does not redirect to /auth', async () => {
      await firstValueFrom(executeGuard(route, state) as Observable<boolean>);
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
        executeGuard(route, state) as Observable<boolean>,
      );
      expect(result).toBe(false);
    });

    it('redirects to /auth', async () => {
      await firstValueFrom(executeGuard(route, state) as Observable<boolean>);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });
});

// ── permissionGuard ────────────────────────────────────────────────────────
const executePermissionGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => permissionGuard(...args));

const stateSnapshot = {} as RouterStateSnapshot;

describe('permissionGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  describe('when no requiredPermission is set in route.data', () => {
    it('allows navigation (returns true)', () => {
      const routeWithNoPermission = { data: {} } as ActivatedRouteSnapshot;
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PermissionsService,
            useValue: { currentUserPermissions: vi.fn(() => new Set()) },
          },
          { provide: Router, useValue: { createUrlTree: vi.fn() } },
        ],
      });

      const result = executePermissionGuard(
        routeWithNoPermission,
        stateSnapshot,
      );
      expect(result).toBe(true);
    });
  });

  describe('when the user has the required permission', () => {
    it('allows navigation (returns true)', () => {
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

      const result = executePermissionGuard(routeWithPermission, stateSnapshot);
      expect(result).toBe(true);
    });
  });

  describe('when the user lacks the required permission', () => {
    it('blocks navigation (returns a UrlTree, not true)', () => {
      const routeWithPermission = {
        data: { requiredPermission: PERMISSIONS.ORG_BILLING_MANAGE },
      } as unknown as ActivatedRouteSnapshot;

      const permsSet = new Set([PERMISSIONS.ORG_READ]);
      const urlTree = { commands: ['/dashboard'] } as unknown as UrlTree;
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PermissionsService,
            useValue: { currentUserPermissions: vi.fn(() => permsSet) },
          },
          {
            provide: Router,
            useValue: { createUrlTree: vi.fn(() => urlTree) },
          },
        ],
      });

      const result = executePermissionGuard(routeWithPermission, stateSnapshot);
      expect(result).not.toBe(true);
      expect(result).toBe(urlTree);
    });

    it('redirects to /dashboard', () => {
      const routeWithPermission = {
        data: { requiredPermission: PERMISSIONS.ORG_BILLING_MANAGE },
      } as unknown as ActivatedRouteSnapshot;

      const permsSet = new Set<string>();
      const createUrlTree = vi.fn(
        (commands: string[]) => ({ commands }) as unknown as UrlTree,
      );
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PermissionsService,
            useValue: { currentUserPermissions: vi.fn(() => permsSet) },
          },
          { provide: Router, useValue: { createUrlTree } },
        ],
      });

      executePermissionGuard(routeWithPermission, stateSnapshot);
      expect(createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
