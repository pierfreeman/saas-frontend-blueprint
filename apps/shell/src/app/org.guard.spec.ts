import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { orgGuard } from '@saas-frontend/shared/util-auth';

const executeGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => orgGuard(...args));

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('orgGuard', () => {
  describe('when an active org is set', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: OrganizationsStore,
            useValue: { hasActiveOrg: () => true },
          },
          { provide: Router, useValue: {} },
        ],
      });
    });

    it('allows navigation (returns true)', () => {
      const result = executeGuard(route, state);
      expect(result).toBe(true);
    });
  });

  describe('when no active org is set', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: OrganizationsStore,
            useValue: { hasActiveOrg: () => false },
          },
          {
            provide: Router,
            useValue: {
              createUrlTree: (commands: unknown[]) =>
                ({ commands }) as unknown as UrlTree,
            },
          },
        ],
      });
    });

    it('blocks navigation (returns a UrlTree, not boolean true)', () => {
      const result = executeGuard(route, state);
      expect(result).not.toBe(true);
      expect(result).not.toBe(false);
    });

    it('redirects to /org/select', () => {
      const result = executeGuard(route, state) as unknown as {
        commands: string[];
      };
      expect(result.commands).toEqual(['/org/select']);
    });
  });
});
