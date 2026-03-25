import { PLATFORM_ROUTES } from './entry.routes';

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

  it('has a lazy members route inside the group', () => {
    const group = PLATFORM_ROUTES.find(
      (r) => r.path === '' && !r.redirectTo && r.children,
    );
    const members = group?.children?.find((r) => r.path === 'members');
    expect(members).toBeDefined();
    expect(members?.loadComponent).toBeDefined();
  });

  it('has a lazy settings route inside the group', () => {
    const group = PLATFORM_ROUTES.find(
      (r) => r.path === '' && !r.redirectTo && r.children,
    );
    const settings = group?.children?.find((r) => r.path === 'settings');
    expect(settings).toBeDefined();
    expect(settings?.loadComponent).toBeDefined();
  });
});
