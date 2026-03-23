import { vi } from 'vitest';

vi.mock('auth/Routes', () => ({ AUTH_ROUTES: [] }));
vi.mock('admin/Routes', () => ({ ADMIN_ROUTES: [] }));
vi.mock('platform/Routes', () => ({ PLATFORM_ROUTES: [] }));

import { appRoutes } from './app.routes';
import { authGuard } from './app.guard';

describe('appRoutes', () => {
  it('the auth path has no guard (publicly accessible)', () => {
    const authRoute = appRoutes.find((r) => r.path === 'auth');
    expect(authRoute).toBeDefined();
    expect(authRoute?.canActivate).toBeFalsy();
  });

  it('the root path is protected by authGuard', () => {
    const platformRoute = appRoutes.find((r) => r.path === '');
    expect(platformRoute).toBeDefined();
    expect(platformRoute?.canActivate).toContain(authGuard);
  });

  it('the admin path is protected by authGuard', () => {
    const adminRoute = appRoutes.find((r) => r.path === 'admin');
    expect(adminRoute).toBeDefined();
    expect(adminRoute?.canActivate).toContain(authGuard);
  });

  it('there is no route that automatically redirects to admin', () => {
    const redirectsToAdmin = appRoutes.some(
      (r) => r.redirectTo === 'admin' || r.redirectTo === '/admin',
    );
    expect(redirectsToAdmin).toBe(false);
  });

  it('the wildcard route redirects to root (platform)', () => {
    const wildcardRoute = appRoutes.find((r) => r.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('');
  });
});
