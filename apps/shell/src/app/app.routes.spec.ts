import { TestBed } from '@angular/core/testing';
import { appRoutes } from './app.routes';
import { authGuard, orgGuard } from '@saas-frontend/shared/util-auth';
import { Route, Routes } from '@angular/router';
import { RemoteConfigService } from './remote-config.service';

describe('appRoutes', () => {
  const authRoute = appRoutes.find((r) => r.path === 'auth');
  const layoutRoute = appRoutes.find((r) => r.path === '' && r.children);
  const children = (layoutRoute?.children ?? []) as Route[];

  // Provide a pass-through RemoteConfigService so loadChildren tests exercise
  // the real import('auth/Routes') / MF loaders without error-handling noise.
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RemoteConfigService,
          useValue: {
            loadRoutes: (_name: string, loader: () => Promise<Routes>) =>
              loader(),
          },
        },
      ],
    });
  });

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

  // ── Lazy loader functions ────────────────────────────────────────────────
  // Call the MF remote loadChildren inside an injection context so that
  // inject(RemoteConfigService) resolves. The mock service passes through
  // directly to import('remote/Routes') — no error-handling detour.

  it('auth loadChildren resolves AUTH_ROUTES', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      (authRoute!.loadChildren as () => Promise<unknown>)(),
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('admin loadChildren resolves ADMIN_ROUTES', async () => {
    const admin = children.find((r) => r.path === 'admin');
    const result = await TestBed.runInInjectionContext(() =>
      (admin!.loadChildren as () => Promise<unknown>)(),
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('platform loadChildren resolves PLATFORM_ROUTES', async () => {
    const platform = children.find((r) => r.path === '' && !r.children);
    const result = await TestBed.runInInjectionContext(() =>
      (platform!.loadChildren as () => Promise<unknown>)(),
    );
    expect(Array.isArray(result)).toBe(true);
  });
});
