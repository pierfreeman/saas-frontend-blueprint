import { PLATFORM_ROUTES } from './entry.routes';

describe('PLATFORM_ROUTES', () => {
  it('redirects "" to dashboard', () => {
    const redirect = PLATFORM_ROUTES.find((r) => r.path === '');
    expect(redirect?.redirectTo).toBe('dashboard');
  });

  it('has a lazy dashboard route', () => {
    const dashboard = PLATFORM_ROUTES.find((r) => r.path === 'dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard?.loadComponent).toBeDefined();
  });

  it('has a lazy settings route', () => {
    const settings = PLATFORM_ROUTES.find((r) => r.path === 'settings');
    expect(settings).toBeDefined();
    expect(settings?.loadComponent).toBeDefined();
  });

  it('has no route-level providers', () => {
    PLATFORM_ROUTES.forEach((r) => expect(r.providers).toBeUndefined());
  });
});
