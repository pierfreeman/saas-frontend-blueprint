import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { Observable, firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { authGuard } from '@saas-frontend/shared/util-auth';

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
