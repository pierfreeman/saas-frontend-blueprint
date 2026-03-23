import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { vi } from 'vitest';
import { OrganizationsStore } from '@org/organizations/data-access';
import { orgGuard } from './org.guard';

const executeGuard: CanActivateFn = (...args) =>
  TestBed.runInInjectionContext(() => orgGuard(...args));

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('orgGuard', () => {
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    routerSpy = { navigate: vi.fn() };
  });

  describe('when an active org is set', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: OrganizationsStore,
            useValue: { hasActiveOrg: () => true },
          },
          { provide: Router, useValue: routerSpy },
        ],
      });
    });

    it('allows navigation (returns true)', () => {
      const result = executeGuard(route, state);
      expect(result).toBe(true);
    });

    it('does not redirect to /org/new', () => {
      executeGuard(route, state);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
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
          { provide: Router, useValue: routerSpy },
        ],
      });
    });

    it('blocks navigation (returns false)', () => {
      const result = executeGuard(route, state);
      expect(result).toBe(false);
    });

    it('redirects to /org/new', () => {
      executeGuard(route, state);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/org/select']);
    });
  });
});
