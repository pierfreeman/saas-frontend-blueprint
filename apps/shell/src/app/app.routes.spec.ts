import { vi } from 'vitest';

vi.mock('auth/Routes', () => ({ AUTH_ROUTES: [] }));
vi.mock('admin/Routes', () => ({ ADMIN_ROUTES: [] }));
vi.mock('platform/Routes', () => ({ PLATFORM_ROUTES: [] }));

import { appRoutes } from './app.routes';
import { authGuard } from './app.guard';
import { orgGuard } from './org.guard';
import { Route } from '@angular/router';

describe('appRoutes', () => {
  const authRoute = appRoutes.find((r) => r.path === 'auth');
  const layoutRoute = appRoutes.find((r) => r.path === '' && r.children);
  const children = (layoutRoute?.children ?? []) as Route[];

  it('the auth path has no guard (publicly accessible)', () => {
    expect(authRoute).toBeDefined();
    expect(authRoute?.canActivate).toBeFalsy();
  });

  it('the layout route is protected by authGuard', () => {
    expect(layoutRoute).toBeDefined();
    expect(layoutRoute?.canActivate).toContain(authGuard);
  });

  it('the platform child route is protected by orgGuard', () => {
    const platform = children.find((r) => r.path === '' && !r.children);
    expect(platform?.canActivate).toContain(orgGuard);
  });

  it('the admin child route is protected by orgGuard', () => {
    const admin = children.find((r) => r.path === 'admin');
    expect(admin?.canActivate).toContain(orgGuard);
  });

  it('the wildcard route redirects to root', () => {
    const wildcard = appRoutes.find((r) => r.path === '**');
    expect(wildcard?.redirectTo).toBe('');
  });
});
